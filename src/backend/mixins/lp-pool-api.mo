import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/lp-pool";
import GameTypes "../types/fair-spin-game";
import LpPoolLib "../lib/lp-pool";

// Public API for the shared LP (liquidity provider) pool. Replaces the
// admin-only adminDepositToPool/adminWithdrawFromPool with shared methods
// available to all signed-in users. Receives the LP pool state, the shared
// game state (so deposits/withdrawals keep the game pool funded), the shared
// rose-balance map, and a signed-in-user check so it can debit/credit provider
// balances and gate access.
mixin (state : Types.LpPoolState, gameState : GameTypes.GameState, roseBalances : Map.Map<Principal, Float>, isUser : (Principal) -> Bool) {
  // Pool overview: total value, provider count, and the caller's own position.
  public query ({ caller }) func getPoolOverview() : async Types.PoolOverview {
    if (not isUser(caller)) {
      Runtime.trap("Unauthorized: Only signed-in users can view the pool");
    };
    {
      totalPoolValue = state.totalPoolValue;
      totalProviders = state.providers.size();
      ownPosition = positionOf(caller);
    };
  };

  // The caller's current position in the pool (portion, share %, profit/loss).
  public query ({ caller }) func getProviderPosition() : async ?Types.ProviderPosition {
    if (not isUser(caller)) {
      Runtime.trap("Unauthorized: Only signed-in users can view their position");
    };
    positionOf(caller);
  };

  // Any signed-in user deposits roses into the shared pool. No platform fee is
  // charged, so the full amount is credited.
  public shared ({ caller }) func depositToPool(amount : Float) : async { #ok; #err : Text } {
    if (not isUser(caller)) {
      return #err("Unauthorized: Only signed-in users can deposit");
    };
    if (amount < 0.1) {
      return #err("Minimum deposit is 0.1 roses");
    };
    let balance = switch (roseBalances.get(caller)) {
      case (?b) b;
      case null 0.0;
    };
    if (balance < amount) {
      return #err("Insufficient rose balance");
    };
    let net = LpPoolLib.netDeposit(amount);
    roseBalances.add(caller, balance - amount);
    LpPoolLib.applyDeposit(state, caller, net);
    // Fund the game pool so spins can be covered by the shared pool.
    gameState.playerPool += net;
    #ok;
  };

  // Any provider withdraws their proportional share of the pool. No platform
  // fee is charged, so the full share is paid out.
  public shared ({ caller }) func withdrawFromPool() : async { #ok : Float; #err : Text } {
    if (not isUser(caller)) {
      return #err("Unauthorized: Only signed-in users can withdraw");
    };
    let portion = LpPoolLib.providerPortion(state, caller);
    if (portion <= 0.0) {
      return #err("Nothing to withdraw");
    };
    let net = LpPoolLib.applyWithdrawal(state, caller);
    let balance = switch (roseBalances.get(caller)) {
      case (?b) b;
      case null 0.0;
    };
    roseBalances.add(caller, balance + net);
    // Remove the withdrawn value from the game pool.
    gameState.playerPool -= portion;
    #ok(net);
  };

  // Build a provider's public position snapshot, or null if they are not a
  // provider.
  func positionOf(provider : Principal) : ?Types.ProviderPosition {
    switch (state.providers.get(provider)) {
      case null null;
      case (?p) {
        ?{
          provider;
          contribution = p.contribution;
          portion = LpPoolLib.providerPortion(state, provider);
          sharePct = LpPoolLib.providerSharePct(state, provider);
          profitLoss = LpPoolLib.providerProfitLoss(state, provider);
        };
      };
    };
  };
};
