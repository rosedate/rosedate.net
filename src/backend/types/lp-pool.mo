import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // A single liquidity provider's accounting state.
  public type ProviderState = {
    var contribution : Float; // net roses the provider deposited (after the 5% fee)
    var shares : Float;       // proportional share units in the pool
  };

  // Internal mutable LP pool state, shared with the rest of the actor and
  // passed into the LP pool mixin. Not shared across the public API boundary.
  public type LpPoolState = {
    var totalPoolValue : Float; // current total value of the pool
    var totalShares : Float;    // sum of all providers' shares
    var providers : Map.Map<Principal, ProviderState>;
  };

  // Public snapshot of a single provider's position.
  public type ProviderPosition = {
    provider : Principal;
    contribution : Float; // net roses deposited (after fee)
    portion : Float;      // current proportional share of pool value
    sharePct : Float;     // percentage of the pool (0..1)
    profitLoss : Float;   // portion - contribution (green if > 0, red if < 0)
  };

  // Public pool overview for a caller.
  public type PoolOverview = {
    totalPoolValue : Float;
    totalProviders : Nat;
    ownPosition : ?ProviderPosition;
  };
};
