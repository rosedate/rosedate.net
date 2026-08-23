import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Clock,
  Coins,
  Gift,
  History,
  Landmark,
  Loader2,
  Lock,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { SpinOutcome, SpinRecord, SpinResult } from "../backend";
import LoginButton from "../components/LoginButton";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreatePost,
  useDepositToPool,
  useGetIcpUsdExchangeRate,
  useGetPoolOverview,
  useGetProviderPosition,
  useGetRoseBalance,
  useWithdrawFromPool,
} from "../hooks/useQueries";

// ─── Game constants ──────────────────────────────────────────────────────────
const MIN_DEPOSIT = 0.1;
const COOLDOWN_SECONDS = 3;
const MAX_HISTORY = 19;

// 12 wheel segments alternating win/loss, matching the backend outcome set
const SEGMENTS: { label: string; kind: "win" | "loss"; pct: number }[] = [
  { label: "I", kind: "win", pct: 5 },
  { label: "II", kind: "loss", pct: 10 },
  { label: "III", kind: "win", pct: 15 },
  { label: "IV", kind: "loss", pct: 20 },
  { label: "V", kind: "win", pct: 25 },
  { label: "VI", kind: "loss", pct: 30 },
  { label: "VII", kind: "win", pct: 35 },
  { label: "VIII", kind: "loss", pct: 40 },
  { label: "IX", kind: "win", pct: 45 },
  { label: "X", kind: "loss", pct: 50 },
  { label: "XI", kind: "win", pct: 55 },
  { label: "XII", kind: "loss", pct: 60 },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

function formatRoses(n: number): string {
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(ts: bigint): string {
  // Backend timestamps are nanoseconds (Time.now()); convert to milliseconds.
  const ms = Number(ts) / 1_000_000;
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${Math.max(sec, 0)}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function outcomeText(outcome: SpinOutcome): { label: string; win: boolean } {
  if (outcome.__kind__ === "win") {
    return { label: `Won ${Math.round(outcome.win * 100)}%`, win: true };
  }
  return { label: `Lost ${Math.round(outcome.loss * 100)}%`, win: false };
}

function isWin(
  outcome: SpinOutcome,
): outcome is Extract<SpinOutcome, { __kind__: "win" }> {
  return outcome.__kind__ === "win";
}

// ─── Clock-face spin wheel ───────────────────────────────────────────────────
function SpinWheel({
  spinning,
  targetRotation,
}: {
  spinning: boolean;
  targetRotation: number;
}) {
  const cx = 150;
  const cy = 150;
  const r = 140;

  const segments = useMemo(() => {
    return SEGMENTS.map((seg, i) => {
      const start = i * SEGMENT_ANGLE - 90;
      const end = start + SEGMENT_ANGLE;
      const startRad = (start * Math.PI) / 180;
      const endRad = (end * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
      const midAngle = ((start + end) / 2) * (Math.PI / 180);
      const labelR = r * 0.62;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      const pctR = r * 0.82;
      const px = cx + pctR * Math.cos(midAngle);
      const py = cy + pctR * Math.sin(midAngle);
      return {
        ...seg,
        path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        labelPos: { x: lx, y: ly },
        pctPos: { x: px, y: py },
      };
    });
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* Outer gold ring */}
      <div className="rounded-full p-2.5 bg-gradient-to-br from-[#d4af37] via-[#b8860b] to-[#8b6914] shadow-rose-glow">
        <div className="rounded-full p-1.5 bg-[#3a0d1c]">
          <div
            className="relative overflow-hidden rounded-full"
            style={{ aspectRatio: "1 / 1" }}
          >
            <svg
              viewBox="0 0 300 300"
              className="h-full w-full"
              role="img"
              aria-label="Fair Spin clock wheel"
            >
              {segments.map((seg, i) => (
                <g key={seg.label}>
                  <path
                    d={seg.path}
                    fill={
                      seg.kind === "win"
                        ? i % 2 === 0
                          ? "#7a1f3d"
                          : "#8f2a4a"
                        : i % 2 === 0
                          ? "#4a0e1c"
                          : "#3a0d1c"
                    }
                    stroke="#d4af37"
                    strokeWidth="1.5"
                  />
                  <text
                    x={seg.labelPos.x}
                    y={seg.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#f5e6c8"
                    fontSize="20"
                    fontWeight="700"
                    fontFamily="Georgia, serif"
                  >
                    {seg.label}
                  </text>
                  <text
                    x={seg.pctPos.x}
                    y={seg.pctPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={seg.kind === "win" ? "#ffd98a" : "#e8b4c8"}
                    fontSize="11"
                    fontWeight="600"
                  >
                    {seg.kind === "win" ? `+${seg.pct}%` : `-${seg.pct}%`}
                  </text>
                </g>
              ))}
              {/* Center hub */}
              <circle cx={cx} cy={cy} r="26" fill="#d4af37" />
              <circle cx={cx} cy={cy} r="20" fill="#3a0d1c" />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#f5e6c8"
                fontSize="13"
                fontWeight="700"
                fontFamily="Georgia, serif"
              >
                SPIN
              </text>
            </svg>
            {/* Rotating wheel overlay */}
            <div
              className="absolute inset-0 rounded-full transition-transform duration-[4000ms] ease-[cubic-bezier(0.15,0.85,0.25,1)]"
              style={{
                transform: `rotate(${targetRotation}deg)`,
                transitionDuration: spinning ? "4000ms" : "0ms",
              }}
            >
              <svg viewBox="0 0 300 300" className="h-full w-full">
                {segments.map((seg, i) => {
                  const start = i * SEGMENT_ANGLE - 90;
                  const end = start + SEGMENT_ANGLE;
                  const startRad = (start * Math.PI) / 180;
                  const endRad = (end * Math.PI) / 180;
                  const x1 = cx + r * Math.cos(startRad);
                  const y1 = cy + r * Math.sin(startRad);
                  const x2 = cx + r * Math.cos(endRad);
                  const y2 = cy + r * Math.sin(endRad);
                  const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
                  const midAngle = ((start + end) / 2) * (Math.PI / 180);
                  const labelR = r * 0.62;
                  const lx = cx + labelR * Math.cos(midAngle);
                  const ly = cy + labelR * Math.sin(midAngle);
                  const pctR = r * 0.82;
                  const px = cx + pctR * Math.cos(midAngle);
                  const py = cy + pctR * Math.sin(midAngle);
                  return (
                    <g key={seg.label}>
                      <path
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={
                          seg.kind === "win"
                            ? i % 2 === 0
                              ? "#7a1f3d"
                              : "#8f2a4a"
                            : i % 2 === 0
                              ? "#4a0e1c"
                              : "#3a0d1c"
                        }
                        stroke="#d4af37"
                        strokeWidth="1.5"
                      />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#f5e6c8"
                        fontSize="20"
                        fontWeight="700"
                        fontFamily="Georgia, serif"
                      >
                        {seg.label}
                      </text>
                      <text
                        x={px}
                        y={py}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={seg.kind === "win" ? "#ffd98a" : "#e8b4c8"}
                        fontSize="11"
                        fontWeight="600"
                      >
                        {seg.kind === "win" ? `+${seg.pct}%` : `-${seg.pct}%`}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
      {/* Pointer */}
      <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2">
        <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[18px] border-l-transparent border-r-transparent border-t-[#d4af37] drop-shadow" />
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function FairSpinPage() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: roseBalance } = useGetRoseBalance();
  const { data: icpUsdRate } = useGetIcpUsdExchangeRate();
  const poolOverviewQuery = useGetPoolOverview();
  const providerPositionQuery = useGetProviderPosition();

  const isAuthed = !!identity;

  // Backend queries
  const poolQuery = useQuery({
    queryKey: ["gamePool"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getGamePool();
    },
    enabled: !!actor,
  });
  const historyQuery = useQuery({
    queryKey: ["gameHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGameHistory();
    },
    enabled: !!actor,
  });

  // Local state
  const [depositAmount, setDepositAmount] = useState("");
  const [stake, setStake] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [targetRotation, setTargetRotation] = useState(0);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [lpDepositAmount, setLpDepositAmount] = useState("");
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pool = poolQuery.data;
  const history = historyQuery.data ?? [];
  const recentHistory = history.slice(0, MAX_HISTORY);

  const poolOverview = poolOverviewQuery.data;
  const providerPosition = providerPositionQuery.data;

  const participationPct =
    pool && pool.maxParticipation > 0
      ? (pool.playerParticipation / pool.maxParticipation) * 100
      : 0;

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setTimeout(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [cooldown]);

  const invalidateGame = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["gamePool"] });
    queryClient.invalidateQueries({ queryKey: ["gameHistory"] });
    queryClient.invalidateQueries({ queryKey: ["roseBalance"] });
  }, [queryClient]);

  // After a spin, only pool participation and history change — the wallet
  // balance is NOT affected by a spin, so do not invalidate roseBalance here.
  const invalidateAfterSpin = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["gamePool"] });
    queryClient.invalidateQueries({ queryKey: ["gameHistory"] });
  }, [queryClient]);

  // Mutations
  const depositMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!actor) throw new Error("Actor not available");
      const res = await actor.depositToGame(amount);
      if (res.__kind__ === "err") throw new Error(res.err);
    },
    onSuccess: () => {
      toast.success("Deposit successful!");
      setDepositAmount("");
      invalidateGame();
    },
    onError: (e) => toast.error((e as Error).message || "Deposit failed"),
  });

  const spinMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!actor) throw new Error("Actor not available");
      const res = await actor.spin(amount);
      if (res.__kind__ === "err") throw new Error(res.err);
      return res.ok;
    },
    onSuccess: (result: SpinResult) => {
      setLastResult(result);
      // Rotate wheel so the pointer lands on the winning segment
      const idx = SEGMENTS.findIndex((s) => {
        if (result.outcome.__kind__ === "win") {
          return (
            s.kind === "win" && s.pct === Math.round(result.outcome.win * 100)
          );
        }
        return (
          s.kind === "loss" && s.pct === Math.round(result.outcome.loss * 100)
        );
      });
      const segIndex = idx >= 0 ? idx : 0;
      // Pointer is at top (-90deg). Segment i spans [i*30-90, (i+1)*30-90].
      // To land segment center at top, wheel must rotate so that center angle
      // points to -90. Center angle = i*30-90+15. We want wheel rotation R such
      // that (centerAngle + R) mod 360 = 270 (top). R = 270 - centerAngle.
      const centerAngle = segIndex * SEGMENT_ANGLE - 90 + SEGMENT_ANGLE / 2;
      const base = 270 - centerAngle;
      const fullTurns = 5 * 360;
      const next = base + fullTurns;
      setTargetRotation((prev) => {
        const normalized = ((next % 360) + 360) % 360;
        const prevNorm = ((prev % 360) + 360) % 360;
        const delta = normalized - prevNorm;
        return prev + fullTurns + (delta < 0 ? delta + 360 : delta);
      });
      setSpinning(true);
      setTimeout(() => setSpinning(false), 4100);
      setCooldown(COOLDOWN_SECONDS);
      invalidateAfterSpin();
    },
    onError: (e) => toast.error((e as Error).message || "Spin failed"),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const res = await actor.withdrawFromGame();
      if (res.__kind__ === "err") throw new Error(res.err);
      return res.ok;
    },
    onSuccess: (amount: number) => {
      toast.success(`Withdrew ${formatRoses(amount)} roses`);
      setLastResult(null);
      invalidateGame();
    },
    onError: (e) => toast.error((e as Error).message || "Withdraw failed"),
  });

  const lpDepositMutation = useDepositToPool();
  const lpWithdrawMutation = useWithdrawFromPool();

  const createPost = useCreatePost();

  const handleDeposit = () => {
    const amount = Number.parseFloat(depositAmount);
    if (Number.isNaN(amount) || amount < MIN_DEPOSIT) {
      toast.error(`Minimum deposit is ${MIN_DEPOSIT} roses`);
      return;
    }
    depositMutation.mutate(amount);
  };

  const handleLpDeposit = () => {
    const amount = Number.parseFloat(lpDepositAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount to deposit");
      return;
    }
    lpDepositMutation.mutate(amount);
  };

  const handleLpWithdraw = () => {
    if (!providerPosition) {
      toast.error("You have no share in the pool to withdraw");
      return;
    }
    lpWithdrawMutation.mutate();
  };

  const handleSpin = () => {
    if (cooldown > 0) return;
    const amount = Number.parseFloat(stake);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a stake to spin");
      return;
    }
    spinMutation.mutate(amount);
  };

  const fairSpinUrl = `${window.location.origin}/fair-spin`;

  const buildShareText = useCallback(() => {
    if (!lastResult) return "";
    const rate = icpUsdRate ?? 8.0;
    const icpOf = (roses: number) =>
      `≈ ${formatRoses(roses)} ICP ($${formatRoses(roses * rate)})`;
    if (isWin(lastResult.outcome)) {
      const pct = Math.round(lastResult.outcome.win * 100);
      const won = lastResult.payout - lastResult.stake;
      return `🌹 I just won ${formatRoses(won)} roses (${icpOf(won)}) on Fair Spin (Turn the Clock)! ${pct}% on my stake of ${formatRoses(lastResult.stake)} (${icpOf(lastResult.stake)}).`;
    }
    const pct = Math.round(lastResult.outcome.loss * 100);
    const lost = lastResult.stake - lastResult.payout;
    return `🌹 Fair Spin result: I spun ${formatRoses(lastResult.stake)} roses (${icpOf(lastResult.stake)}) and took a ${pct}% hit (lost ${formatRoses(lost)} roses, ${icpOf(lost)}). The clock keeps turning!`;
  }, [lastResult, icpUsdRate]);

  const handleShareToPosts = async () => {
    if (!lastResult) return;
    const text = `${buildShareText()} ${fairSpinUrl}`;
    try {
      await createPost.mutateAsync({ content: text, image: null });
      toast.success("Shared to Posts!");
      navigate({ to: "/posts" });
    } catch (e) {
      toast.error((e as Error).message || "Failed to share");
    }
  };

  const handleShareX = () => {
    if (!lastResult) return;
    const text = buildShareText();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fairSpinUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (!isAuthed) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md card-romantic">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full rose-gradient shadow-rose-glow-sm">
              <Gift className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Fair Spin
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Sign in to turn the clock and spin for romantic surprises.
            </p>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full rose-gradient px-4 py-1.5 text-primary-foreground shadow-rose-glow-sm">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-semibold">Turn the Clock</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Fair Spin
        </h1>
        <p className="text-muted-foreground text-sm">
          Spin the clock for a chance to win up to 55% on your stake
        </p>
      </div>

      {/* Balance strip */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="card-romantic">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full rose-gradient-soft">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Your balance</p>
              <p className="font-semibold text-lg">
                {roseBalance !== undefined
                  ? formatRoses(Number(roseBalance))
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-romantic">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full rose-gradient-soft">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Game pool</p>
              <p className="font-semibold text-lg">
                {pool ? formatRoses(pool.pool) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wheel */}
      <Card className="card-romantic">
        <CardContent className="p-6 space-y-5">
          <SpinWheel spinning={spinning} targetRotation={targetRotation} />

          {/* Stake input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stake" className="text-sm font-medium">
                Your stake (roses)
              </Label>
              <span
                className="text-xs text-muted-foreground"
                data-ocid="fairspin.stake.participation"
              >
                In pool:{" "}
                <span className="font-semibold text-foreground">
                  {pool ? formatRoses(pool.playerParticipation) : "—"}
                </span>{" "}
                roses
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                id="stake"
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 1.0"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                data-ocid="fairspin.stake.input"
              />
              <Button
                onClick={handleSpin}
                disabled={spinning || cooldown > 0 || spinMutation.isPending}
                className="rose-gradient text-primary-foreground shadow-rose-glow-sm hover:opacity-90 min-w-[120px]"
                data-ocid="fairspin.spin_button"
              >
                {spinMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                SPIN
              </Button>
            </div>
            {cooldown > 0 && (
              <p
                className="text-xs text-muted-foreground flex items-center gap-1"
                data-ocid="fairspin.cooldown"
              >
                <Lock className="h-3 w-3" /> Next spin in {cooldown}s
              </p>
            )}
          </div>

          {/* Outcome */}
          {lastResult && (
            <div
              className={`rounded-2xl border p-4 text-center slide-up ${
                lastResult.outcome.__kind__ === "win"
                  ? "border-primary/40 bg-primary/5"
                  : "border-destructive/40 bg-destructive/5"
              }`}
              data-ocid="fairspin.outcome"
            >
              <div className="flex items-center justify-center gap-2">
                {lastResult.outcome.__kind__ === "win" ? (
                  <TrendingUp className="h-5 w-5 text-primary" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
                <p
                  className={`font-display text-2xl font-bold ${
                    lastResult.outcome.__kind__ === "win"
                      ? "text-primary"
                      : "text-destructive"
                  }`}
                >
                  {outcomeText(lastResult.outcome).label}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {lastResult.outcome.__kind__ === "win"
                  ? `You won ${formatRoses(lastResult.payout - lastResult.stake)} roses on a ${formatRoses(lastResult.stake)} stake`
                  : `You lost ${formatRoses(lastResult.stake - lastResult.payout)} roses on a ${formatRoses(lastResult.stake)} stake`}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleShareToPosts}
                  disabled={createPost.isPending}
                  data-ocid="fairspin.share_posts_button"
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleShareX}
                  aria-label="Share to X"
                  data-ocid="fairspin.share_x_button"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit + participation */}
      <Card className="card-romantic">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5 text-primary" /> Deposit to the pool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deposit" className="text-sm font-medium">
              Amount (min {MIN_DEPOSIT} roses)
            </Label>
            <div className="flex gap-2">
              <Input
                id="deposit"
                type="number"
                min={MIN_DEPOSIT}
                step="0.1"
                placeholder={`e.g. ${MIN_DEPOSIT}`}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                data-ocid="fairspin.deposit.input"
              />
              <Button
                onClick={handleDeposit}
                disabled={depositMutation.isPending}
                data-ocid="fairspin.deposit_button"
              >
                {depositMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
                Deposit
              </Button>
            </div>
          </div>

          {/* Participation vs cap */}
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Your pool participation
              </span>
              <span className="font-semibold">
                {pool ? formatRoses(pool.playerParticipation) : "—"} /{" "}
                {pool ? formatRoses(pool.maxParticipation) : "—"}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full rose-gradient transition-all"
                style={{ width: `${Math.min(participationPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You can participate up to 60% of the game pool
            </p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-muted-foreground">
                Withdraw your full participation
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
                data-ocid="fairspin.withdraw_pool_button"
              >
                {withdrawMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game history */}
      <Card className="card-romantic">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" /> Game history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : recentHistory.length === 0 ? (
            <p
              className="text-center text-muted-foreground py-6"
              data-ocid="fairspin.history_empty"
            >
              No spins yet — turn the clock to begin your story.
            </p>
          ) : (
            <ul className="space-y-2" data-ocid="fairspin.history_list">
              {recentHistory.map((rec: SpinRecord, i) => {
                const o = outcomeText(rec.outcome);
                return (
                  <li
                    key={rec.id.toString()}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3"
                    data-ocid={`fairspin.history_item.${i}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          o.win
                            ? "bg-green-500/10 text-green-600"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {o.win ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            o.win ? "text-green-600" : ""
                          }`}
                        >
                          {o.win
                            ? `Won ${formatRoses(rec.payout - rec.stake)} roses`
                            : `Lost ${formatRoses(rec.stake - rec.payout)} roses`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {rec.username} · Stake {formatRoses(rec.stake)} ·{" "}
                          {o.label}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(rec.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Shared LP pool */}
      <Card className="card-romantic border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5 text-primary" /> Shared LP pool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Pool overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">Total pool value</p>
              <p
                className="font-semibold text-lg"
                data-ocid="fairspin.lp_total_value"
              >
                {poolOverview ? formatRoses(poolOverview.totalPoolValue) : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">Total providers</p>
              <p
                className="font-semibold text-lg"
                data-ocid="fairspin.lp_total_providers"
              >
                {poolOverview ? poolOverview.totalProviders.toString() : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">Your share</p>
              <p
                className="font-semibold text-lg"
                data-ocid="fairspin.lp_own_share"
              >
                {providerPosition
                  ? `${formatRoses(providerPosition.sharePct * 100)}%`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Provider position */}
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your portion</span>
              <span className="font-semibold" data-ocid="fairspin.lp_portion">
                {providerPosition ? formatRoses(providerPosition.portion) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Percentage share</span>
              <span className="font-semibold" data-ocid="fairspin.lp_share_pct">
                {providerPosition
                  ? `${formatRoses(providerPosition.sharePct * 100)}%`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Profit / Loss</span>
              {providerPosition ? (
                <span
                  className={`font-semibold ${
                    providerPosition.profitLoss >= 0
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                  data-ocid="fairspin.lp_profit_loss"
                >
                  {providerPosition.profitLoss >= 0 ? "+" : ""}
                  {formatRoses(providerPosition.profitLoss)}
                </span>
              ) : (
                <span className="font-semibold">—</span>
              )}
            </div>
          </div>

          {/* Deposit form */}
          <div className="space-y-2">
            <Label htmlFor="lp-deposit" className="text-sm font-medium">
              Deposit to the pool
            </Label>
            <div className="flex gap-2">
              <Input
                id="lp-deposit"
                type="number"
                min="0"
                step="0.1"
                placeholder="Amount (roses)"
                value={lpDepositAmount}
                onChange={(e) => setLpDepositAmount(e.target.value)}
                data-ocid="fairspin.lp_deposit.input"
              />
              <Button
                onClick={handleLpDeposit}
                disabled={lpDepositMutation.isPending}
                className="rose-gradient text-primary-foreground shadow-rose-glow-sm hover:opacity-90 min-w-[120px]"
                data-ocid="fairspin.lp_deposit_button"
              >
                {lpDepositMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
                Deposit
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your deposit is credited to the pool in full.
            </p>
          </div>

          {/* Withdraw form */}
          <div className="space-y-2">
            <Label htmlFor="lp-withdraw" className="text-sm font-medium">
              Withdraw your proportional share
            </Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleLpWithdraw}
                disabled={lpWithdrawMutation.isPending || !providerPosition}
                className="min-w-[120px]"
                data-ocid="fairspin.lp_withdraw_button"
              >
                {lpWithdrawMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                Withdraw
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You receive your full proportional share of the current pool
              value.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
