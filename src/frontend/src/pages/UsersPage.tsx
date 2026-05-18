import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Clock, Filter, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LazyImage } from "../components/LazyImage";
import { ShimmerSkeleton } from "../components/ShimmerSkeleton";
import {
  formatLastSeen,
  useAutoUpdateLastActive,
  useFilterProfiles,
  useGetLastSeen,
  useGetOnlineUsers,
} from "../hooks/useQueries";

const PAGE_SIZE = 49;

// Per-card last-seen sub-component to lazy-fetch only visible cards
function UserLastSeen({
  userId,
  isOnline,
}: {
  userId: string;
  isOnline: boolean;
}) {
  const { data: lastSeen } = useGetLastSeen(userId);
  const label = formatLastSeen(lastSeen);

  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500 shadow-[0_0_5px_1px_rgba(34,197,94,0.5)]" />
        <span className="text-xs font-medium text-green-600">Online now</span>
      </div>
    );
  }
  if (!label) return null;
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Clock className="h-3 w-3 shrink-0" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

export default function UsersPage() {
  const navigate = useNavigate();
  // Keep current user's heartbeat alive while on this page
  useAutoUpdateLastActive();

  const { data: onlineUsers = [] } = useGetOnlineUsers();

  const [showFilters, setShowFilters] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [country, setCountry] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [gender, setGender] = useState("");
  const [minBalance, setMinBalance] = useState([0]);

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when any filter changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally watching filter values to reset pagination
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [country, minAge, maxAge, gender, minBalance, onlineOnly]);

  const { data: profiles, isLoading } = useFilterProfiles({
    country: country || undefined,
    // Convert to BigInt only when passing to the hook; the hook handles serialization safely
    minAge: minAge ? BigInt(minAge) : undefined,
    maxAge: maxAge ? BigInt(maxAge) : undefined,
    gender: gender && gender !== "any" ? gender : undefined,
    minBalance: minBalance[0] > 0 ? minBalance[0] : undefined,
    onlineOnly: onlineOnly ? true : undefined,
  });

  // Sort profiles alphabetically by username, then slice for current page
  const visibleProfiles = useMemo(() => {
    if (!profiles) return [];
    const sorted = [...profiles].sort((a, b) =>
      a.profile.username.localeCompare(b.profile.username, undefined, {
        sensitivity: "base",
      }),
    );
    return sorted.slice(0, visibleCount);
  }, [profiles, visibleCount]);

  const hasMore = profiles ? visibleCount < profiles.length : false;

  const handleViewMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const handleClearFilters = () => {
    setOnlineOnly(false);
    setCountry("");
    setMinAge("");
    setMaxAge("");
    setGender("");
    setMinBalance([0]);
  };

  const handleMessageClick = (userId: Principal) => {
    navigate({
      to: "/chats/$conversationId",
      params: { conversationId: userId.toString() },
    });
  };

  const handleProfileClick = (userId: Principal, username?: string) => {
    navigate({
      to: "/users/$userId",
      params: { userId: username || userId.toString() },
    });
  };

  return (
    <div className="container max-w-6xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Discover Users</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? "Hide" : "Show"} Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">
                Filter Users
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            {/* Online Only toggle — always shown first */}
            <div
              className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
              data-ocid="users.online_only.toggle"
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.5)]" />
                <Label
                  htmlFor="onlineOnly"
                  className="cursor-pointer text-sm font-semibold text-foreground"
                >
                  Online Only
                </Label>
                <span className="text-xs text-muted-foreground">
                  Show currently active users
                </span>
              </div>
              <Switch
                id="onlineOnly"
                checked={onlineOnly}
                onCheckedChange={setOnlineOnly}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm">
                  Country
                </Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Enter country"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm">
                  Gender
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Any gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any gender</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minAge" className="text-sm">
                  Min Age
                </Label>
                <Input
                  id="minAge"
                  type="number"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  placeholder="Min age"
                  min="18"
                  max="100"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAge" className="text-sm">
                  Max Age
                </Label>
                <Input
                  id="maxAge"
                  type="number"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  placeholder="Max age"
                  min="18"
                  max="100"
                  className="text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">
                Minimum Rose Balance: {minBalance[0]}
              </Label>
              <Slider
                value={minBalance}
                onValueChange={setMinBalance}
                max={1000}
                step={10}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <ShimmerSkeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <ShimmerSkeleton className="h-4 w-full max-w-[120px]" />
                    <ShimmerSkeleton className="h-3 w-full max-w-[80px]" />
                  </div>
                </div>
                <ShimmerSkeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : visibleProfiles.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {visibleProfiles.map((profileData) => (
              <Card
                key={profileData.principal.toString()}
                className="hover:shadow-romantic transition-shadow"
              >
                <CardContent className="p-4 sm:p-6">
                  <div
                    className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 cursor-pointer"
                    onClick={() =>
                      handleProfileClick(
                        profileData.principal,
                        profileData.profile.username,
                      )
                    }
                  >
                    {profileData.profile.profilePicture ? (
                      <LazyImage
                        src={profileData.profile.profilePicture.getDirectURL()}
                        alt={profileData.profile.name}
                        wrapperClassName="h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-full hover:shadow-rose-glow transition-shadow"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 hover:shadow-rose-glow transition-shadow">
                        <AvatarFallback className="text-base sm:text-lg">
                          {profileData.profile.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {profileData.profile.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        @{profileData.profile.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profileData.profile.country}
                      </p>
                      <UserLastSeen
                        userId={profileData.principal.toString()}
                        isOnline={onlineUsers.includes(
                          profileData.principal.toString(),
                        )}
                      />
                    </div>
                  </div>

                  {profileData.profile.bio && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                      {profileData.profile.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-2">
                    {profileData.profile.birthYear && (
                      <span>
                        Age:{" "}
                        {new Date().getFullYear() -
                          Number(profileData.profile.birthYear)}
                      </span>
                    )}
                    {profileData.profile.gender && (
                      <span className="ml-auto mr-2">
                        {profileData.profile.gender}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    <span>{profileData.balance.toFixed(2)} 🌹</span>
                  </div>

                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleMessageClick(profileData.principal)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {visibleProfiles.length} of {profiles?.length} users
              </p>
              <Button
                variant="outline"
                onClick={handleViewMore}
                className="gap-2 px-8"
              >
                <ChevronDown className="h-4 w-4" />
                View More
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center px-4">
            <p className="text-sm sm:text-base text-muted-foreground">
              No users found matching your filters
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
