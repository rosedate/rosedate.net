import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BarChart2,
  Gift,
  Heart,
  MessageSquare,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAnalyticsSummary,
  useGetCallerUserAnalytics,
} from "../hooks/useQueries";

export default function AnalyticsPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetAnalyticsSummary();
  const { data: userAnalytics, isLoading: userLoading } =
    useGetCallerUserAnalytics();

  if (!identity) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md card-romantic">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Please log in to access analytics
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatValue = (
    loading: boolean,
    value: number | bigint | undefined | null,
    fallback = "—",
  ) => {
    if (loading) return "…";
    if (value === undefined || value === null) return fallback;
    return Number(value).toLocaleString();
  };

  const platformStats = [
    {
      title: "Total Users",
      value: formatValue(summaryLoading, summary?.totalUsers),
      description: "Registered users on the platform",
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Total Posts",
      value: formatValue(summaryLoading, summary?.totalPosts),
      description: "Posts created by the community",
      icon: TrendingUp,
      gradient: "from-rose-500 to-pink-500",
    },
    {
      title: "Total Messages",
      value: formatValue(summaryLoading, summary?.totalMessages),
      description: "Messages exchanged on the platform",
      icon: MessageSquare,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Active Users",
      value: formatValue(summaryLoading, summary?.activeUsers),
      description: "Recently active users",
      icon: Activity,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      title: "Rose Gifts",
      value: formatValue(summaryLoading, summary?.totalRoseGifts),
      description: "Total Rose gifts sent",
      icon: Heart,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Rose Transactions",
      value: formatValue(summaryLoading, summary?.totalRoseTransactions),
      description: "Total economy transactions",
      icon: BarChart2,
      gradient: "from-indigo-500 to-purple-500",
    },
  ];

  const myStats = userAnalytics
    ? [
        {
          title: "Posts Created",
          value: formatValue(userLoading, userAnalytics.postCount),
          description: "Posts you've shared",
          icon: TrendingUp,
          gradient: "from-rose-500 to-pink-500",
        },
        {
          title: "Messages Sent",
          value: formatValue(userLoading, userAnalytics.messageCount),
          description: "Messages you've sent",
          icon: MessageSquare,
          gradient: "from-purple-500 to-pink-500",
        },
        {
          title: "Reactions Received",
          value: formatValue(userLoading, userAnalytics.reactionsReceived),
          description: "Reactions on your content",
          icon: Heart,
          gradient: "from-amber-500 to-orange-500",
        },
        {
          title: "Rose Credits Balance",
          value: userLoading
            ? "…"
            : userAnalytics.roseBalance.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }),
          description: "Your current Rose Credits",
          icon: User,
          gradient: "from-green-500 to-emerald-500",
        },
        {
          title: "Gifts Received",
          value: formatValue(userLoading, userAnalytics.giftsReceived),
          description: "Roses gifted to you",
          icon: Gift,
          gradient: "from-indigo-500 to-purple-500",
        },
      ]
    : null;

  return (
    <div className="container max-w-6xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-24">
      {/* Platform Analytics */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-rose-500 to-pink-500 bg-clip-text text-transparent">
            Platform Analytics
          </h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Live platform insights and community metrics
        </p>
      </div>

      {summaryError && !summaryLoading && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          Failed to load analytics. Please try refreshing the page.
        </div>
      )}

      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platformStats.map((s, index) => {
            const Icon = s.icon;
            return (
              <Card
                key={index}
                className="card-romantic hover:shadow-rose-glow transition-all duration-300"
                data-ocid="analytics-stat-card"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.title}
                  </CardTitle>
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${s.gradient} opacity-20`}
                  >
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {summary && (
        <Card className="mt-6 card-romantic">
          <CardHeader>
            <CardTitle className="text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Economy Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Roses Circulating
                  </span>
                  <span className="font-semibold">
                    {summary.totalRosesCirculating.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Platform Fees Collected
                  </span>
                  <span className="font-semibold">
                    {summary.totalPlatformFees.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Posts</span>
                  <span className="font-semibold">
                    {Number(summary.totalPosts).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Messages</span>
                  <span className="font-semibold">
                    {Number(summary.totalMessages).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Stats Section */}
      <div className="mt-8 mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-rose-500 to-pink-500 bg-clip-text text-transparent">
            Your Stats
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Your personal activity and achievements
        </p>
      </div>

      {userLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : myStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myStats.map((s, index) => {
            const Icon = s.icon;
            return (
              <Card
                key={index}
                className="card-romantic hover:shadow-rose-glow transition-all duration-300"
                data-ocid="user-analytics-stat-card"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.title}
                  </CardTitle>
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${s.gradient} opacity-20`}
                  >
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="card-romantic">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Complete your profile to see your personal stats
          </CardContent>
        </Card>
      )}

      <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-rose-400/10 to-pink-400/10 border border-primary/20">
        <p className="text-sm text-muted-foreground text-center">
          <strong className="text-foreground">Live data</strong> — analytics
          refresh automatically every 60 seconds.
        </p>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
