import Random "mo:core/Random";
import Types "../types/fair-spin-game";

module {
  // Fee charged on player deposits into the game pool. No platform fee is
  // charged, so this is always 0.
  public func depositFee(amount : Float) : Float {
    ignore amount;
    0.0
  };

  // Fee charged on player withdrawals from the game pool. No platform fee is
  // charged, so this is always 0.
  public func withdrawalFee(amount : Float) : Float {
    ignore amount;
    0.0
  };

  // Maximum a single player may deposit/participate: 60% of the current pool.
  public func maxParticipation(pool : Float) : Float {
    pool * 0.6
  };

  // Whether a player may deposit `amount` without exceeding the 60% cap.
  public func canParticipate(state : Types.GameState, player : Principal, amount : Float) : Bool {
    let current = switch (state.playerParticipation.get(player)) {
      case (?p) p;
      case null 0.0;
    };
    current + amount <= maxParticipation(state.playerPool)
  };

  // Whether the 3-second per-player cooldown between spins has elapsed.
  public func cooldownElapsed(state : Types.GameState, player : Principal, now : Int) : Bool {
    switch (state.lastSpinTime.get(player)) {
      case (?last) { now - last >= 3_000_000_000 };
      case null { true };
    };
  };

  // Roll a random spin outcome: win 5/15/25/35/45/55% or lose 10/20/30/40/50/60%.
  public func rollOutcome() : async Types.SpinOutcome {
    let roll = await Random.natRange(0, 12);
    if (roll < 6) {
      let pcts = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55];
      #win(pcts[roll]);
    } else {
      let pcts = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60];
      #loss(pcts[roll % 6]);
    };
  };

  // Compute the net payout for a stake given an outcome.
  public func computePayout(stake : Float, outcome : Types.SpinOutcome) : Float {
    switch (outcome) {
      case (#win(pct)) { stake + stake * pct };
      case (#loss(pct)) { stake - stake * pct };
    };
  };
};
