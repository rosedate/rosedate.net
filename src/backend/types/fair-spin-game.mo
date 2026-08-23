import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Outcome of a single spin. A win returns a percentage of the stake
  // (5, 15, 25, 35, 45, or 55). A loss deducts a percentage on top of the
  // stake (10, 20, 30, 40, 50, or 60).
  public type SpinOutcome = {
    #win : Float;
    #loss : Float;
  };

  // A single spin record kept in the per-player game history (max 19).
  // `username` is captured at spin time so the global history can show every
  // player's name without joining the profiles map at read time.
  public type SpinRecord = {
    id : Nat;
    player : Principal;
    username : Text;
    stake : Float;
    outcome : SpinOutcome;
    // Net roses returned to the player:
    //   win  -> stake + (stake * win%)
    //   loss -> stake - (stake * loss%)
    payout : Float;
    timestamp : Int;
  };

  // Result returned to the caller after a spin.
  public type SpinResult = {
    stake : Float;
    outcome : SpinOutcome;
    payout : Float;
    poolAfter : Float;
  };

  // Public snapshot of the game pool for a caller.
  public type GamePoolInfo = {
    pool : Float;
    playerParticipation : Float;
    maxParticipation : Float;
  };

  // Internal mutable game state, shared with the rest of the actor and passed
  // into the game mixin. Not shared across the public API boundary.
  public type GameState = {
    var playerPool : Float;
    var playerParticipation : Map.Map<Principal, Float>;
    var lastSpinTime : Map.Map<Principal, Int>;
    var gameHistory : Map.Map<Principal, [SpinRecord]>;
    var nextSpinId : Nat;
  };
};
