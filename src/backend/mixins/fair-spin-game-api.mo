import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import List "mo:core/List";
import Types "../types/fair-spin-game";
import LpPoolTypes "../types/lp-pool";
import GameLib "../lib/fair-spin-game";
import LpPoolLib "../lib/lp-pool";

// Public API for the Fair Spin (Turn the Clock) game. Receives the game state,
// the shared LP pool state (so game outcomes apply to the whole pool
// proportionally), the shared rose-balance map, an admin-check function, and a
// username resolver so it can debit/credit player participation, gate admin-only
// pool operations, and embed each player's username into the global spin history.
mixin (state : Types.GameState, lpPoolState : LpPoolTypes.LpPoolState, roseBalances : Map.Map<Principal, Float>, isAdmin : (Principal) -> Bool, getUsername : (Principal) -> ?Text) {
  // Current game pool snapshot, including the caller's actual participation.
  public query ({ caller }) func getGamePool() : async Types.GamePoolInfo {
    let participation = switch (state.playerParticipation.get(caller)) {
      case (?p) p;
      case null 0.0;
    };
    {
      pool = state.playerPool;
      playerParticipation = participation;
      maxParticipation = GameLib.maxParticipation(state.playerPool);
    };
  };

  // Player deposits roses (min 0.1) into the game pool. No platform fee is
  // charged, so the full amount is credited to participation. Participation is
  // capped at 60% of the pool.
  public shared ({ caller }) func depositToGame(amount : Float) : async { #ok; #err : Text } {
    if (amount < 0.1) {
      return #err("Minimum deposit is 0.1 roses");
    };
    if (not GameLib.canParticipate(state, caller, amount)) {
      return #err("Deposit would exceed the 60% participation cap");
    };
    let balance = switch (roseBalances.get(caller)) {
      case (?b) b;
      case null 0.0;
    };
    if (balance < amount) {
      return #err("Insufficient rose balance");
    };
    let netToPool = amount - GameLib.depositFee(amount);
    roseBalances.add(caller, balance - amount);
    let current = switch (state.playerParticipation.get(caller)) {
      case (?p) p;
      case null 0.0;
    };
    state.playerParticipation.add(caller, current + netToPool);
    #ok;
  };

  // Spin the clock for a random outcome. Enforces the 3-second per-player
  // cooldown. The stake is debited from the player's pool participation (NOT
  // the wallet rose balance); the payout is credited back to participation.
  // The wallet balance is untouched by a spin.
  public shared ({ caller }) func spin(stake : Float) : async { #ok : Types.SpinResult; #err : Text } {
    if (stake < 0.1) {
      return #err("Minimum stake is 0.1 roses");
    };
    let now = Time.now();
    if (not GameLib.cooldownElapsed(state, caller, now)) {
      return #err("Please wait 3 seconds between spins");
    };
    let participation = switch (state.playerParticipation.get(caller)) {
      case (?p) p;
      case null 0.0;
    };
    // The stake must be covered by the player's pool participation, not the
    // wallet balance.
    if (participation < stake) {
      return #err("Insufficient pool participation for this stake");
    };
    // The pool must be able to cover a maximum 55% win on this stake.
    if (state.playerPool < stake * 1.55) {
      return #err("Pool cannot cover the maximum possible win for this stake");
    };
    // NOTE: The 60% participation cap applies only to DEPOSITS
    // (depositToGame). A spin is a re-wager of already-capped participation,
    // not a new deposit, so the cap is NOT checked here. The pool-coverage
    // check above already prevents over-betting.
    let outcome = await GameLib.rollOutcome();
    let payout = GameLib.computePayout(stake, outcome);
    // The stake enters the pool; the payout is paid from the pool. This is the
    // house-bank update only — it does NOT touch the wallet balance.
    //   win  -> pool shrinks by (payout - stake)  [player net-gained from pool]
    //   loss -> pool grows by (stake - payout)    [player net-lost to pool]
    state.playerPool += stake - payout;
    // Apply the same pool-value change to the shared LP pool so every
    // provider's proportional share is affected by the game outcome.
    LpPoolLib.applyPoolDelta(lpPoolState, stake - payout);
    // Adjust the player's pool participation to mirror the pool delta:
    //   win  -> participation grows by (payout - stake) [player's share grows]
    //   loss -> participation shrinks by (stake - payout) [player's share shrinks]
    let newParticipation = if (payout >= stake) {
      participation + (payout - stake);
    } else {
      participation - (stake - payout);
    };
    state.playerParticipation.add(caller, newParticipation);
    state.lastSpinTime.add(caller, now);
    // Record the spin, capturing the player's username for global history.
    let username = switch (getUsername(caller)) {
      case (?u) u;
      case null "unknown";
    };
    let record : Types.SpinRecord = {
      id = state.nextSpinId;
      player = caller;
      username;
      stake;
      outcome;
      payout;
      timestamp = now;
    };
    state.nextSpinId += 1;
    let history = switch (state.gameHistory.get(caller)) {
      case (?h) h;
      case null [];
    };
    let updated = history.concat([record]);
    let trimmed = if (updated.size() > 19) {
      updated.sliceToArray(Int.fromNat(updated.size() - 19), Int.fromNat(updated.size()));
    } else {
      updated;
    };
    state.gameHistory.add(caller, trimmed);
    #ok({
      stake;
      outcome;
      payout;
      poolAfter = state.playerPool;
    });
  };

  // Player withdraws their winnings from the game pool. No platform fee is
  // charged, so the full participation amount is paid out.
  public shared ({ caller }) func withdrawFromGame() : async { #ok : Float; #err : Text } {
    let participation = switch (state.playerParticipation.get(caller)) {
      case (?p) p;
      case null 0.0;
    };
    if (participation <= 0.0) {
      return #err("Nothing to withdraw");
    };
    let fee = GameLib.withdrawalFee(participation);
    let net = participation - fee;
    let balance = switch (roseBalances.get(caller)) {
      case (?b) b;
      case null 0.0;
    };
    roseBalances.add(caller, balance + net);
    // The player's participation is an accounting entry against the shared
    // admin-funded pool; crediting the wallet does NOT separately decrement
    // state.playerPool. The pool's balance already reflects the player's
    // participation through deposit/spin accounting.
    state.playerParticipation.add(caller, 0.0);
    #ok(net);
  };

  // Global game history across ALL players, sorted newest-first by id
  // descending, capped at 100 entries. Each SpinRecord carries the player's
  // username (captured at spin time).
  public query ({ caller }) func getGameHistory() : async [Types.SpinRecord] {
    let buffer = List.empty<Types.SpinRecord>();
    for ((_player, records) in state.gameHistory.entries()) {
      for (r in records.vals()) {
        buffer.add(r);
      };
    };
    let all = buffer.toArray();
    // Sort newest-first by id descending.
    let sorted = all.sort(func(a : Types.SpinRecord, b : Types.SpinRecord) : Order.Order {
      Nat.compare(b.id, a.id);
    });
    // Cap at 100 entries.
    if (sorted.size() > 100) {
      sorted.sliceToArray(0, 100);
    } else {
      sorted;
    };
  };

  // Admin (rosalia) only: deposit roses into the game pool.
  public shared ({ caller }) func adminDepositToPool(amount : Float) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Admin only");
    };
    let balance = switch (roseBalances.get(caller)) {
      case (?b) b;
      case null 0.0;
    };
    if (balance < amount) {
      return #err("Insufficient rose balance");
    };
    roseBalances.add(caller, balance - amount);
    state.playerPool += amount;
    #ok;
  };

  // Admin (rosalia) only: withdraw roses from the game pool.
  public shared ({ caller }) func adminWithdrawFromPool(amount : Float) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Admin only");
    };
    if (state.playerPool < amount) {
      return #err("Insufficient pool balance");
    };
    let balance = switch (roseBalances.get(caller)) {
      case (?b) b;
      case null 0.0;
    };
    roseBalances.add(caller, balance + amount);
    state.playerPool -= amount;
    #ok;
  };
};
