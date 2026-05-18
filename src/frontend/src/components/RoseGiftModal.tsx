import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import {
  useGetIcpUsdExchangeRate,
  useGetRoseSummary,
} from "../hooks/useQueries";

type InputMode = "rose" | "usd";

interface RoseGiftModalProps {
  open: boolean;
  onClose: () => void;
  onGift: (amount: number) => Promise<void>;
  recipientName: string;
  currentBalance: number;
}

export default function RoseGiftModal({
  open,
  onClose,
  onGift,
  recipientName,
  currentBalance,
}: RoseGiftModalProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<InputMode>("rose");
  const [isGifting, setIsGifting] = useState(false);

  const { data: exchangeRate = 8.0 } = useGetIcpUsdExchangeRate();
  // Fetch the real balance from roseSummary as a fallback when the prop is 0
  const { data: roseSummary } = useGetRoseSummary({
    staleTime: 0,
    refetchOnMount: true,
  });
  // userBalance from roseSummary is already a plain float — no division needed
  const summaryBalance = roseSummary?.userBalance ?? 0;
  // Prefer the summary balance over the prop — the prop can be stale/default 0.1
  const effectiveBalance = summaryBalance > 0 ? summaryBalance : currentBalance;

  // Derived values
  const numAmount = Number.parseFloat(amount);
  const isValidNumber = !Number.isNaN(numAmount) && numAmount > 0;

  const roseAmount =
    mode === "rose" ? numAmount : isValidNumber ? numAmount / exchangeRate : 0;
  const usdAmount =
    mode === "usd" ? numAmount : isValidNumber ? numAmount * exchangeRate : 0;

  const handleGift = async () => {
    if (!isValidNumber) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (roseAmount < 0.01) {
      toast.error(
        mode === "usd"
          ? `Amount too small — minimum is 0.01 Rose (≈ $${(0.01 * exchangeRate).toFixed(4)} USD)`
          : "Minimum gift amount is 0.01 Rose",
      );
      return;
    }

    if (roseAmount > effectiveBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setIsGifting(true);
    try {
      await onGift(roseAmount);
      toast.success(
        `Gifted ${roseAmount.toFixed(4)} Roses to ${recipientName}!`,
      );
      setAmount("");
      onClose();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to gift Roses",
      );
    } finally {
      setIsGifting(false);
    }
  };

  const isSubmitDisabled =
    isGifting ||
    !amount ||
    !isValidNumber ||
    roseAmount < 0.01 ||
    roseAmount > effectiveBalance;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img
              src="/assets/generated/rose-gift-icon-transparent.dim_32x32.png"
              alt="Rose"
              className="h-6 w-6"
            />
            Gift Roses
          </DialogTitle>
          <DialogDescription>Send Roses to {recipientName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode toggle */}
          <div className="flex rounded-full border border-border bg-muted p-1 gap-1">
            <button
              type="button"
              data-ocid="gift_modal.rose_mode_toggle"
              onClick={() => {
                setMode("rose");
                setAmount("");
              }}
              disabled={isGifting}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                mode === "rose"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🌹 Rose
            </button>
            <button
              type="button"
              data-ocid="gift_modal.usd_mode_toggle"
              onClick={() => {
                setMode("usd");
                setAmount("");
              }}
              disabled={isGifting}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                mode === "usd"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              $ USD
            </button>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <Label htmlFor="gift-amount">
              {mode === "rose" ? "Amount (Roses)" : "Amount (USD)"}
            </Label>
            <div className="relative">
              {mode === "usd" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
              )}
              <Input
                id="gift-amount"
                data-ocid="gift_modal.amount_input"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isGifting}
                className={mode === "usd" ? "pl-7" : ""}
              />
            </div>

            {/* Live conversion preview */}
            {isValidNumber && numAmount > 0 && (
              <p className="text-sm font-medium text-primary">
                {mode === "rose"
                  ? `≈ $${usdAmount.toFixed(2)} USD`
                  : `≈ ${roseAmount.toFixed(4)} Roses`}
              </p>
            )}

            {/* Balance & minimums */}
            <p className="text-xs text-muted-foreground">
              Your balance: {effectiveBalance.toFixed(4)} Roses
            </p>
            <p className="text-xs text-muted-foreground">
              Minimum: 0.01 Rose • 5% platform fee applies
            </p>

            {/* Exchange rate */}
            <p className="text-xs text-muted-foreground/70">
              1 Rose = ${exchangeRate.toFixed(2)} USD
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGifting}
              className="flex-1"
              data-ocid="gift_modal.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGift}
              disabled={isSubmitDisabled}
              className="flex-1"
              data-ocid="gift_modal.submit_button"
            >
              {isGifting ? "Gifting..." : "Gift Roses"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
