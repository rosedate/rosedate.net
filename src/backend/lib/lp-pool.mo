import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/lp-pool";

module {
  // Platform fee charged on deposits into the pool. No platform fee is
  // charged, so this is always 0.
  public func depositFee(amount : Float) : Float {
    ignore amount;
    0.0
  };

  // Platform fee charged on withdrawals from the pool. No platform fee is
  // charged, so this is always 0.
  public func withdrawalFee(amount : Float) : Float {
    ignore amount;
    0.0
  };

  // Net amount that actually enters the pool after the deposit fee. With no
  // fee, the full amount is credited.
  public func netDeposit(amount : Float) : Float {
    amount - depositFee(amount)
  };

  // Net amount paid out to a provider after the withdrawal fee. With no fee,
  // the full amount is paid out.
  public func netWithdrawal(amount : Float) : Float {
    amount - withdrawalFee(amount)
  };

  // A provider's recorded net contribution (after deposit fees).
  func contribution(state : Types.LpPoolState, provider : Principal) : Float {
    switch (state.providers.get(provider)) {
      case (?p) p.contribution;
      case null 0.0;
    };
  };

  // A provider's current proportional share of the pool value.
  public func providerPortion(state : Types.LpPoolState, provider : Principal) : Float {
    switch (state.providers.get(provider)) {
      case (?p) {
        if (state.totalShares <= 0.0) { 0.0 }
        else { p.shares * (state.totalPoolValue / state.totalShares) };
      };
      case null 0.0;
    };
  };

  // A provider's percentage share of the pool (0..1).
  public func providerSharePct(state : Types.LpPoolState, provider : Principal) : Float {
    switch (state.providers.get(provider)) {
      case (?p) {
        if (state.totalShares <= 0.0) { 0.0 }
        else { p.shares / state.totalShares };
      };
      case null 0.0;
    };
  };

  // A provider's profit/loss: current portion minus their contribution.
  public func providerProfitLoss(state : Types.LpPoolState, provider : Principal) : Float {
    providerPortion(state, provider) - contribution(state, provider)
  };

  // New share units issued for a net deposit into the current pool. The first
  // deposit (empty pool) is 1:1; otherwise shares are priced at the current
  // pool value so the new provider's shares represent the same value.
  public func sharesForDeposit(state : Types.LpPoolState, net : Float) : Float {
    if (state.totalShares <= 0.0 or state.totalPoolValue <= 0.0) {
      net;
    } else {
      net * (state.totalShares / state.totalPoolValue);
    };
  };

  // Apply a deposit: issue shares, grow the pool value, update the provider.
  public func applyDeposit(state : Types.LpPoolState, provider : Principal, net : Float) : () {
    let newShares = sharesForDeposit(state, net);
    let current = switch (state.providers.get(provider)) {
      case (?p) p;
      case null { { var contribution = 0.0; var shares = 0.0 } };
    };
    state.providers.add(provider, {
      var contribution = current.contribution + net;
      var shares = current.shares + newShares;
    });
    state.totalPoolValue += net;
    state.totalShares += newShares;
  };

  // Apply a withdrawal: pay the provider's proportional share minus the fee,
  // capped at their share, and remove their shares. Returns the net amount
  // (after the 5% fee) to credit to the provider's wallet.
  public func applyWithdrawal(state : Types.LpPoolState, provider : Principal) : Float {
    let portion = providerPortion(state, provider);
    if (portion <= 0.0) {
      return 0.0;
    };
    let net = netWithdrawal(portion);
    switch (state.providers.get(provider)) {
      case (?p) {
        state.providers.add(provider, {
          var contribution = 0.0;
          var shares = 0.0;
        });
        state.totalShares -= p.shares;
        state.totalPoolValue -= portion;
      };
      case null {};
    };
    net;
  };

  // Apply a pool value change from a game outcome; affects all providers
  // proportionally (their shares are unchanged, so their portions move with
  // the pool value).
  public func applyPoolDelta(state : Types.LpPoolState, delta : Float) : () {
    state.totalPoolValue += delta;
  };
};
