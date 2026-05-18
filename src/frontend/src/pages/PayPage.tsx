import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Heart,
  Info,
  MessageCircle,
  Share2,
  Store,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ProfileWithPrincipal, RoseTransaction } from "../backend";
import LoginButton from "../components/LoginButton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const TX_PAGE_SIZE = 9;
import {
  useClaimAllRoses,
  useClaimDailyCharity,
  useDonateToCharity,
  useGetCharityInfo,
  useGetDealers,
  useGetIcpUsdExchangeRate,
  useGetRoseSummary,
  useGetRoseTransactionHistory,
  useGetUserProfile,
  useRequestBuyRoses,
  useRequestSellRoses,
} from "../hooks/useQueries";

const OISY_WALLET_ADDRESS =
  "27db2bbd9283aa84a6e3515bb0e8088120baec950cf69f34f50911f6e91d41e8";

function DealerCard({
  dealer,
  onChat,
}: {
  dealer: ProfileWithPrincipal;
  onChat: (dealer: ProfileWithPrincipal) => void;
}) {
  const avatarUrl = dealer.profile.profilePicture
    ? dealer.profile.profilePicture.getDirectURL()
    : "/assets/generated/avatar-placeholder.dim_200x200.png";

  const initials = dealer.profile.name
    ? dealer.profile.name.slice(0, 2).toUpperCase()
    : dealer.profile.username.slice(0, 2).toUpperCase();

  return (
    <Card
      className="hover:shadow-rose-glow transition-all duration-200 cursor-pointer group"
      onClick={() => onChat(dealer)}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
          <AvatarImage src={avatarUrl} alt={dealer.profile.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {dealer.profile.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{dealer.profile.username}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs">🌹</span>
            <span className="text-xs font-medium text-primary">
              {dealer.balance.toFixed(0)} Roses
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 text-primary hover:bg-primary/10 gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onChat(dealer);
          }}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">Chat</span>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PayPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: roseSummary, isLoading: summaryLoading } = useGetRoseSummary({
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: transactions, isLoading: transactionsLoading } =
    useGetRoseTransactionHistory();
  const { data: exchangeRate, isLoading: exchangeRateLoading } =
    useGetIcpUsdExchangeRate();
  const { data: dealers, isLoading: dealersLoading } = useGetDealers();
  const requestBuy = useRequestBuyRoses();
  const requestSell = useRequestSellRoses();
  const claimRoses = useClaimAllRoses();

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [txVisible, setTxVisible] = useState(TX_PAGE_SIZE);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState<"rose" | "usd">(
    "rose",
  );
  const [paymentCopied, setPaymentCopied] = useState(false);

  const selfPrincipal = identity?.getPrincipal() ?? null;
  const { data: currentUserProfile } = useGetUserProfile(selfPrincipal);

  // Charity state
  const [donateAmount, setDonateAmount] = useState("");
  const [showDonateConfirm, setShowDonateConfirm] = useState(false);
  const [claimCountdown, setClaimCountdown] = useState("");

  const { data: charityInfo, isLoading: charityLoading } = useGetCharityInfo();
  const donateToCharity = useDonateToCharity();
  const claimDailyCharity = useClaimDailyCharity();

  // Compute whether user can claim (24h cooldown)
  const canClaim = useCallback(() => {
    if (!charityInfo?.lastClaimTime) return true;
    const lastClaim = Number(charityInfo.lastClaimTime) / 1_000_000; // ns → ms
    return Date.now() - lastClaim >= 24 * 60 * 60 * 1000;
  }, [charityInfo]);

  // Live countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      if (!charityInfo?.lastClaimTime) {
        setClaimCountdown("");
        return;
      }
      const lastClaim = Number(charityInfo.lastClaimTime) / 1_000_000;
      const nextClaim = lastClaim + 24 * 60 * 60 * 1000;
      const diff = nextClaim - Date.now();
      if (diff <= 0) {
        setClaimCountdown("");
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setClaimCountdown(`Claim again in ${h}h ${m}m`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [charityInfo]);

  const donateFee = donateAmount ? Number.parseFloat(donateAmount) * 0.05 : 0;
  const donateNet = donateAmount ? Number.parseFloat(donateAmount) * 0.95 : 0;

  // Calculate USD equivalents
  const roseBalanceUsd =
    roseSummary && exchangeRate ? roseSummary.userBalance * exchangeRate : 0;
  const feeRewardsUsd =
    roseSummary && exchangeRate ? roseSummary.feeRewards * exchangeRate : 0;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(OISY_WALLET_ADDRESS);
    setCopiedAddress(true);
    toast.success("Wallet address copied to clipboard");
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleBuyRequest = async () => {
    const amount = Number.parseFloat(buyAmount);
    if (Number.isNaN(amount) || amount < 0.01) {
      toast.error("Minimum amount is 0.01 Rose");
      return;
    }

    try {
      const message = await requestBuy.mutateAsync(amount);
      toast.success(message);
      setBuyAmount("");
      navigate({ to: "/chats" });
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to submit buy request");
    }
  };

  const handleSellRequest = async () => {
    const amount = Number.parseFloat(sellAmount);
    if (Number.isNaN(amount) || amount < 0.01) {
      toast.error("Minimum amount is 0.01 Rose");
      return;
    }

    try {
      const message = await requestSell.mutateAsync(amount);
      toast.success(message);
      setSellAmount("");
      navigate({ to: "/chats" });
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to submit sell request");
    }
  };

  const handleClaimRoses = async () => {
    try {
      await claimRoses.mutateAsync();
      toast.success("Successfully claimed all Roses!");
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to claim Roses");
    }
  };

  const handleDonateToCharity = async () => {
    const amount = Number.parseFloat(donateAmount);
    if (Number.isNaN(amount) || amount < 0.01) {
      toast.error("Minimum donation is 0.01 Rose");
      return;
    }
    try {
      const msg = await donateToCharity.mutateAsync(amount);
      toast.success(msg);
      setDonateAmount("");
      setShowDonateConfirm(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Donation failed");
    }
  };

  const handleClaimDailyCharity = async () => {
    try {
      const msg = await claimDailyCharity.mutateAsync();
      toast.success(msg);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Claim failed");
    }
  };

  const handleChatWithDealer = (dealer: ProfileWithPrincipal) => {
    navigate({
      to: "/chats/$conversationId",
      params: { conversationId: dealer.principal.toString() },
    });
  };

  // Helper function to determine if transaction is sent or received gift
  const getGiftDirection = (
    tx: RoseTransaction,
  ): "sent" | "received" | null => {
    if (tx.transactionType !== "gift") return null;

    const userPrincipal = identity?.getPrincipal().toString();
    if (!userPrincipal) return null;

    const senderPrincipal = tx.sender?.toString();
    const receiverPrincipal = tx.receiver?.toString();

    if (senderPrincipal === userPrincipal) return "sent";
    if (receiverPrincipal === userPrincipal) return "received";
    return null;
  };

  if (!identity) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl">
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Please login to access Rose currency features
            </p>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-6">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="/assets/generated/rose-coin-icon-transparent.dim_64x64.png"
            alt="Rose"
            className="h-12 w-12"
          />
          <h1 className="text-3xl font-bold">Rose Currency</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your Roses and transactions
        </p>
      </div>

      {/* Exchange Rate Display */}
      <div className="mb-6 text-center">
        {exchangeRateLoading ? (
          <Skeleton className="h-6 w-48 mx-auto" />
        ) : exchangeRate ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              1 ICP = ${exchangeRate.toFixed(2)} USD
            </span>
          </div>
        ) : null}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Your Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {roseSummary?.userBalance.toFixed(4) || "0.0000"} 🌹
                </div>
                {exchangeRate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ≈ ${roseBalanceUsd.toFixed(2)} USD
                  </p>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground mt-1">1 Rose = 1 ICP</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Fee Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {roseSummary?.feeRewards.toFixed(4) || "0.0000"} 🌹
                </div>
                {exchangeRate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ≈ ${feeRewardsUsd.toFixed(2)} USD
                  </p>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              5% fee redistribution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Circulating
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {roseSummary?.totalCirculating.toFixed(0) || "0"} 🌹
                </div>
                {exchangeRate && roseSummary && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ≈ $
                    {(roseSummary.totalCirculating * exchangeRate).toFixed(2)}{" "}
                    USD
                  </p>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Max supply: 9,999,999
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rose Dealers Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Store className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Rose Dealers</h2>
          {dealers && dealers.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {dealers.length}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Connect with verified Rose dealers (50+ Roses) to buy or sell Roses
          directly.
        </p>

        {dealersLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dealers && dealers.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dealers.map((dealer) => (
              <DealerCard
                key={dealer.principal.toString()}
                dealer={dealer}
                onChat={handleChatWithDealer}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <div className="text-4xl mb-3">🌹</div>
              <p className="font-medium text-muted-foreground">
                No rose dealers available at the moment
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Users with 50+ Roses will appear here as dealers.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ICP Deposit Instructions */}
      <Alert className="mb-8 border-primary/50">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-base font-semibold">
          How to Deposit ICP
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <div>
            <p className="text-sm mb-2">
              To buy Roses, first deposit ICP to the Oisy wallet address below:
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-xs break-all font-mono">
                {OISY_WALLET_ADDRESS}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyAddress}
                className="shrink-0"
              >
                {copiedAddress ? (
                  <span className="text-xs">Copied!</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Purchase ICP via Banxa:</p>
            <p className="text-sm text-muted-foreground mb-3">
              You can buy ICP with credit/debit card through Banxa.com and send
              it to the wallet address above.
            </p>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a
                href="https://banxa.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Banxa.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="trade" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trade">Buy/Sell</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="trade" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Buy Roses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="h-5 w-5 text-green-500" />
                  Buy Roses
                </CardTitle>
                <CardDescription>
                  Request to purchase Roses from admin "rosalia"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buy-amount">Amount (Roses)</Label>
                  <Input
                    id="buy-amount"
                    type="number"
                    step="0.0001"
                    min="0.01"
                    placeholder="0.0000"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    disabled={requestBuy.isPending}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimum: 0.01 Rose</span>
                    {exchangeRate &&
                      buyAmount &&
                      !Number.isNaN(Number.parseFloat(buyAmount)) && (
                        <span>
                          ≈ $
                          {(
                            Number.parseFloat(buyAmount) * exchangeRate
                          ).toFixed(2)}{" "}
                          USD
                        </span>
                      )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rate: 1 Rose = 1 ICP ≈ ${exchangeRate?.toFixed(2) || "8.00"}{" "}
                    USD
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleBuyRequest}
                  disabled={requestBuy.isPending || !buyAmount}
                >
                  {requestBuy.isPending ? "Submitting..." : "Request to Buy"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  A trade request will be sent to admin "rosalia" via chat
                </p>
              </CardContent>
            </Card>

            {/* Sell Roses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-rose-500" />
                  Sell Roses
                </CardTitle>
                <CardDescription>
                  Request to sell your Roses to admin "rosalia"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sell-amount">Amount (Roses)</Label>
                  <Input
                    id="sell-amount"
                    type="number"
                    step="0.0001"
                    min="0.01"
                    placeholder="0.0000"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    disabled={requestSell.isPending}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Available:{" "}
                      {roseSummary?.userBalance.toFixed(4) || "0.0000"} 🌹
                    </span>
                    {exchangeRate &&
                      sellAmount &&
                      !Number.isNaN(Number.parseFloat(sellAmount)) && (
                        <span>
                          ≈ $
                          {(
                            Number.parseFloat(sellAmount) * exchangeRate
                          ).toFixed(2)}{" "}
                          USD
                        </span>
                      )}
                  </div>
                </div>
                <Button
                  className="w-full rose-gradient"
                  onClick={handleSellRequest}
                  disabled={requestSell.isPending || !sellAmount}
                >
                  {requestSell.isPending ? "Submitting..." : "Request to Sell"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  A trade request will be sent to admin "rosalia" via chat
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Link Card */}
          {identity && currentUserProfile?.username && (
            <div className="bg-white rounded-2xl border border-rose-200/60 shadow-sm overflow-hidden mb-4">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3">
                <h3 className="text-white font-semibold text-base">
                  My Payment Link
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/pay/${currentUserProfile.username}${paymentAmount ? `?amount=${paymentAmount}&currency=${paymentCurrency}` : ""}`)}`}
                    alt="Payment QR Code"
                    className="rounded-xl border border-rose-100"
                  />
                </div>
                <div className="flex items-center gap-2 bg-rose-50 rounded-xl px-3 py-2 border border-rose-100">
                  <span className="text-xs text-rose-700 font-mono flex-1 truncate">
                    rosedate.net/pay/{currentUserProfile.username}
                    {paymentAmount
                      ? `?amount=${paymentAmount}&currency=${paymentCurrency}`
                      : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/pay/${currentUserProfile.username}${paymentAmount ? `?amount=${paymentAmount}&currency=${paymentCurrency}` : ""}`,
                      );
                      setPaymentCopied(true);
                      setTimeout(() => setPaymentCopied(false), 2000);
                    }}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-600 transition-colors"
                  >
                    {paymentCopied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/pay/${currentUserProfile.username}${paymentAmount ? `?amount=${paymentAmount}&currency=${paymentCurrency}` : ""}`;
                      if (navigator.share) {
                        navigator.share({ url });
                      } else {
                        navigator.clipboard.writeText(url);
                        setPaymentCopied(true);
                        setTimeout(() => setPaymentCopied(false), 2000);
                      }
                    }}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPaymentCurrency("rose")}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${paymentCurrency === "rose" ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-600 border border-pink-200"}`}
                    >
                      Rose
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentCurrency("usd")}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${paymentCurrency === "usd" ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-600 border border-pink-200"}`}
                    >
                      $ USD
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="flex-1 rounded-xl border border-rose-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Charity Card */}
          <Card
            className="overflow-hidden border-rose-200/60 shadow-sm"
            data-ocid="charity.card"
          >
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-4 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Heart className="h-5 w-5 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Charity Pool</h3>
                <p className="text-white/80 text-xs">
                  Donate or claim 0.01 Rose daily
                </p>
              </div>
            </div>
            <CardContent className="p-5 space-y-5">
              {/* Pool Balance */}
              <div className="text-center py-2">
                {charityLoading ? (
                  <Skeleton className="h-10 w-40 mx-auto" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-rose-600">
                      {charityInfo?.pool.toFixed(4) ?? "0.0000"} 🌹
                    </p>
                    {exchangeRate && charityInfo && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ≈ ${(charityInfo.pool * exchangeRate).toFixed(2)} USD
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Total pool balance
                    </p>
                  </>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Donate Section */}
                <div className="space-y-3 p-4 bg-rose-50/60 rounded-2xl border border-rose-100">
                  <p className="text-sm font-semibold text-rose-700">
                    Donate Roses
                  </p>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0.01"
                      placeholder="0.0100"
                      value={donateAmount}
                      onChange={(e) => {
                        setDonateAmount(e.target.value);
                        setShowDonateConfirm(false);
                      }}
                      disabled={donateToCharity.isPending}
                      className="border-rose-200 focus-visible:ring-rose-400"
                      data-ocid="charity.donate_input"
                    />
                    {donateAmount &&
                      !Number.isNaN(Number.parseFloat(donateAmount)) &&
                      Number.parseFloat(donateAmount) >= 0.01 && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>Fee (5%): {donateFee.toFixed(4)} 🌹</p>
                          <p className="font-medium text-rose-700">
                            Pool receives: {donateNet.toFixed(4)} 🌹
                          </p>
                        </div>
                      )}
                  </div>
                  {!showDonateConfirm ? (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                      disabled={
                        !donateAmount ||
                        Number.isNaN(Number.parseFloat(donateAmount)) ||
                        Number.parseFloat(donateAmount) < 0.01
                      }
                      onClick={() => setShowDonateConfirm(true)}
                      data-ocid="charity.donate_button"
                    >
                      <Heart className="h-3.5 w-3.5 mr-1.5" />
                      Donate
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-center text-muted-foreground">
                        Confirm donation of{" "}
                        {Number.parseFloat(donateAmount).toFixed(4)} 🌹
                        <br />
                        <span className="text-rose-600 font-medium">
                          Pool receives {donateNet.toFixed(4)} 🌹 after 5% fee
                        </span>
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex-1 border-rose-200"
                          onClick={() => setShowDonateConfirm(false)}
                          disabled={donateToCharity.isPending}
                          data-ocid="charity.cancel_button"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
                          onClick={handleDonateToCharity}
                          disabled={donateToCharity.isPending}
                          data-ocid="charity.confirm_button"
                        >
                          {donateToCharity.isPending
                            ? "Donating..."
                            : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Claim Section */}
                <div className="space-y-3 p-4 bg-pink-50/60 rounded-2xl border border-pink-100">
                  <p className="text-sm font-semibold text-pink-700">
                    Daily Claim
                  </p>
                  <div className="text-center py-2">
                    <p className="text-2xl font-bold text-pink-600">0.01 🌹</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      per day (after 5% fee)
                    </p>
                  </div>
                  {claimCountdown ? (
                    <div
                      className="text-center space-y-2"
                      data-ocid="charity.loading_state"
                    >
                      <p className="text-xs font-medium text-rose-600">
                        {claimCountdown}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled
                        variant="outline"
                        data-ocid="charity.claim_button"
                      >
                        Already Claimed
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                      onClick={handleClaimDailyCharity}
                      disabled={claimDailyCharity.isPending || !canClaim()}
                      data-ocid="charity.claim_button"
                    >
                      {claimDailyCharity.isPending
                        ? "Claiming..."
                        : "Claim 0.01 Rose"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Claim Section */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                Admin: Claim All Roses
              </CardTitle>
              <CardDescription>
                Admin only — claim the full Rose supply (9,999,999 Roses)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleClaimRoses}
                disabled={claimRoses.isPending}
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                {claimRoses.isPending
                  ? "Claiming..."
                  : "Claim All Roses (Admin)"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            (() => {
              const reversed = [...transactions].reverse();
              const visibleTxs = reversed.slice(0, txVisible);
              const hasMoreTx = reversed.length > txVisible;
              return (
                <div className="space-y-3">
                  {visibleTxs.map((tx) => {
                    const direction = getGiftDirection(tx);
                    const isGift = tx.transactionType === "gift";
                    const isBuy = tx.transactionType === "buy";
                    const isSell = tx.transactionType === "sell";
                    const isMint = tx.transactionType === "mint";
                    const isCharityDonate =
                      tx.transactionType === "charityDonate";
                    const isCharityClaim =
                      tx.transactionType === "charityClaim";

                    const txLabel = isMint
                      ? "Minted"
                      : isCharityDonate
                        ? "Charity Donation"
                        : isCharityClaim
                          ? "Charity Claim"
                          : isGift && direction === "sent"
                            ? "Gift Sent"
                            : isGift && direction === "received"
                              ? "Gift Received"
                              : isBuy
                                ? "Purchased"
                                : isSell
                                  ? "Sold"
                                  : tx.transactionType;

                    const isOutflow =
                      direction === "sent" || isSell || isCharityDonate;
                    const iconColor =
                      isMint || isCharityClaim
                        ? "bg-yellow-100 text-yellow-600"
                        : isCharityDonate
                          ? "bg-pink-100 text-pink-600"
                          : isOutflow
                            ? "bg-rose-100 text-rose-600"
                            : "bg-green-100 text-green-600";

                    return (
                      <Card key={tx.id.toString()}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${iconColor}`}>
                                {isOutflow ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : (
                                  <ArrowDownLeft className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{txLabel}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    Number(tx.timestamp) / 1_000_000,
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-semibold ${
                                  isOutflow ? "text-rose-600" : "text-green-600"
                                }`}
                              >
                                {isOutflow ? "-" : "+"}
                                {tx.amount.toFixed(4)} 🌹
                              </p>
                              {tx.feeDistributed > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Fee: {tx.feeDistributed.toFixed(4)}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {hasMoreTx && (
                    <button
                      type="button"
                      onClick={() => setTxVisible((v) => v + TX_PAGE_SIZE)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl border border-primary/20 transition-colors"
                      data-ocid="transactions-view-more"
                    >
                      <ArrowDownLeft className="h-4 w-4" />
                      View More ({reversed.length - txVisible} more)
                    </button>
                  )}
                </div>
              );
            })()
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No transactions yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
