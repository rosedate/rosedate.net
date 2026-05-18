import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetIcpUsdExchangeRate,
  useGetRoseSummary,
  useGetUserByUsername,
  useGetUserProfile,
  useGiftRoses,
} from "../hooks/useQueries";

const PLATFORM_FEE = 0.05;

function AvatarDisplay({
  avatar,
  username,
  size = 64,
}: {
  avatar: string | undefined | null;
  username: string;
  size?: number;
}) {
  const initials = username.slice(0, 2).toUpperCase();
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className="rounded-full object-cover border-2 border-white/60 shadow-md"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white font-bold border-2 border-white/60 shadow-md"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function PaymentPage() {
  const { username } = useParams({ strict: false }) as { username?: string };
  const search = useSearch({ strict: false }) as {
    amount?: string;
    currency?: string;
  };
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();

  const [currency, setCurrency] = useState<"rose" | "usd">(
    search?.currency === "usd" ? "usd" : "rose",
  );
  const [inputValue, setInputValue] = useState(search?.amount ?? "");
  const [sent, setSent] = useState(false);
  const [sentAmount, setSentAmount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const { data: recipientPrincipal, isLoading: loadingUser } =
    useGetUserByUsername(username ?? "");

  const { data: recipientProfile, isLoading: loadingProfile } =
    useGetUserProfile(recipientPrincipal ?? null);

  const { data: exchangeRate } = useGetIcpUsdExchangeRate();
  const { data: roseSummary } = useGetRoseSummary({
    staleTime: 0,
    refetchOnMount: true,
  });

  const giftRoses = useGiftRoses();

  // Compute rose amount from input
  const numericInput = Number.parseFloat(inputValue) || 0;
  const roseAmount =
    currency === "usd" && exchangeRate && exchangeRate > 0
      ? numericInput / exchangeRate
      : numericInput;
  const recipientReceives = roseAmount * (1 - PLATFORM_FEE);
  const isValidAmount = roseAmount >= 0.01;

  // Derive the sender's balance from roseSummary (the same source used by the Pay tab)
  // userBalance is already a plain float — no division or BigInt conversion needed
  const senderBalanceRose =
    roseSummary?.userBalance !== undefined ? roseSummary.userBalance : null;
  const hasSufficientBalance =
    senderBalanceRose === null || roseAmount <= senderBalanceRose;

  // Sync currency/amount from search params on mount only
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (search?.amount) setInputValue(search.amount);
    if (search?.currency === "usd") setCurrency("usd");
  }, []);

  function handleBack() {
    navigate({ to: "/" });
  }

  async function handleSend() {
    if (!recipientPrincipal || !isValidAmount) return;
    setError(null);
    try {
      await giftRoses.mutateAsync({
        receiver: recipientPrincipal,
        amount: roseAmount,
      });
      setSentAmount(roseAmount);
      setSent(true);
    } catch (e) {
      setError(
        (e as Error)?.message ?? "Transaction failed. Please try again.",
      );
    }
  }

  const isLoading = loadingUser || loadingProfile;
  const userNotFound = !isLoading && username && recipientPrincipal === null;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      data-ocid="payment.page"
    >
      {/* Rose gradient header */}
      <header className="bg-gradient-to-br from-pink-500 to-rose-600 text-white px-4 py-5 flex items-center gap-3 shadow-md">
        <button
          type="button"
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          aria-label="Go back"
          data-ocid="payment.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">🌹</span>
          <h1 className="text-lg font-semibold tracking-tight">Send Rose</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start pt-8 px-4 pb-24 max-w-md mx-auto w-full">
        {/* Loading state */}
        {isLoading && (
          <div
            className="flex flex-col items-center gap-4 mt-12"
            data-ocid="payment.loading_state"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Looking up user…</p>
          </div>
        )}

        {/* User not found */}
        {userNotFound && (
          <div
            className="flex flex-col items-center gap-4 mt-12 text-center"
            data-ocid="payment.error_state"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">
              🌹
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              User not found
            </h2>
            <p className="text-muted-foreground text-sm">
              @{username} doesn't exist or hasn't set up a profile.
            </p>
            <Button
              variant="outline"
              onClick={handleBack}
              data-ocid="payment.cancel_button"
            >
              Go back
            </Button>
          </div>
        )}

        {/* Not authenticated */}
        {!isLoading && !userNotFound && !identity && (
          <div
            className="flex flex-col items-center gap-4 mt-12 text-center"
            data-ocid="payment.auth_prompt"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-3xl shadow-md">
              🌹
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Log in to send Rose
            </h2>
            <p className="text-muted-foreground text-sm">
              You need to be logged in to send Rose Credits.
            </p>
            <Button
              className="bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700"
              data-ocid="payment.login_button"
              onClick={() => navigate({ to: "/profile" })}
            >
              Log in
            </Button>
          </div>
        )}

        {/* Success state */}
        {sent && (
          <div
            className="flex flex-col items-center gap-4 mt-12 text-center"
            data-ocid="payment.success_state"
          >
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h2 className="text-xl font-semibold text-foreground">Sent!</h2>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                {sentAmount.toFixed(2)} Rose
              </span>{" "}
              sent to{" "}
              <span className="font-semibold text-primary">
                @{recipientProfile?.username ?? username}
              </span>
            </p>
            <Button
              variant="outline"
              onClick={handleBack}
              data-ocid="payment.close_button"
            >
              Done
            </Button>
          </div>
        )}

        {/* Payment form */}
        {!isLoading && !userNotFound && !!identity && !sent && (
          <div className="w-full space-y-5">
            {/* Recipient card */}
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <AvatarDisplay
                avatar={
                  recipientProfile?.profilePicture
                    ? recipientProfile.profilePicture.getDirectURL()
                    : undefined
                }
                username={recipientProfile?.username ?? username ?? "?"}
                size={56}
              />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {recipientProfile?.name ||
                    recipientProfile?.username ||
                    username}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  @{recipientProfile?.username ?? username}
                </p>
              </div>
            </div>

            {/* Currency toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrency("rose")}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors border ${
                  currency === "rose"
                    ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-sm"
                    : "bg-muted text-muted-foreground border-border hover:bg-accent"
                }`}
                data-ocid="payment.rose_toggle"
              >
                🌹 Rose
              </button>
              <button
                type="button"
                onClick={() => setCurrency("usd")}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors border ${
                  currency === "usd"
                    ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-sm"
                    : "bg-muted text-muted-foreground border-border hover:bg-accent"
                }`}
                data-ocid="payment.usd_toggle"
              >
                $ USD
              </button>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label
                htmlFor="payment-amount"
                className="text-sm font-medium text-foreground"
              >
                Amount ({currency === "rose" ? "Rose" : "USD $"})
              </label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={currency === "rose" ? "0.01" : "0.01"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="text-lg h-12 border-input focus-visible:ring-primary"
                data-ocid="payment.input"
              />
            </div>

            {/* Exchange rate info */}
            {exchangeRate && exchangeRate > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                1 Rose = ${exchangeRate.toFixed(2)} USD
              </p>
            )}

            {/* Fee breakdown */}
            {numericInput > 0 && isValidAmount && (
              <div className="bg-muted/60 border border-border/50 rounded-xl px-4 py-3 space-y-1 text-sm">
                {currency === "usd" && exchangeRate && exchangeRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">You pay</span>
                    <span className="font-medium">
                      ${numericInput.toFixed(2)} USD
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You send</span>
                  <span className="font-medium">
                    {roseAmount.toFixed(4)} Rose
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Platform fee (5%)
                  </span>
                  <span className="text-destructive font-medium">
                    −{(roseAmount * PLATFORM_FEE).toFixed(4)} Rose
                  </span>
                </div>
                <div className="border-t border-border/50 pt-1 flex justify-between font-semibold">
                  <span className="text-foreground">Recipient receives</span>
                  <span className="text-primary">
                    {recipientReceives.toFixed(4)} Rose
                  </span>
                </div>
              </div>
            )}

            {/* Balance warning */}
            {senderBalanceRose !== null && !hasSufficientBalance && (
              <p className="text-sm text-destructive text-center">
                Insufficient balance. You have {senderBalanceRose.toFixed(4)}{" "}
                Rose.
              </p>
            )}

            {/* Error */}
            {error && (
              <p
                className="text-sm text-destructive text-center"
                data-ocid="payment.error_state"
              >
                {error}
              </p>
            )}

            {/* Send button */}
            <Button
              className="w-full h-12 text-base bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700 shadow-sm"
              disabled={
                !isValidAmount || !hasSufficientBalance || giftRoses.isPending
              }
              onClick={handleSend}
              data-ocid="payment.submit_button"
            >
              {giftRoses.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {giftRoses.isPending
                ? "Sending…"
                : `Send ${
                    isValidAmount ? `${roseAmount.toFixed(4)} Rose` : "Rose"
                  }`}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
