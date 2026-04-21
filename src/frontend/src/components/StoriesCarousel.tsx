import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Gift,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Story } from "../backend";
import { ExternalBlob } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetActiveStories,
  useGetConversations,
  useGetGroupChats,
  useGetPinnedStories,
  useGetRoseBalance,
  useGetStoryReactions,
  useGetUserProfile,
  useGiftRosesOnStory,
  useMarkStoryAsViewed,
  usePinStory,
  useReactToStory,
  useSendGroupMessage,
  useSendMessage,
  useUnpinStory,
  useUnreactToStory,
} from "../hooks/useQueries";
import { getMimeType } from "../lib/mimeTypes";
import RoseGiftModal from "./RoseGiftModal";

const REACTION_EMOJIS = ["❤️", "😍", "🌹", "😘", "💋", "🔥", "💯", "😂"];

export default function StoriesCarousel() {
  const { identity } = useInternetIdentity();
  const { data: stories } = useGetActiveStories();
  const markAsViewed = useMarkStoryAsViewed();
  const navigate = useNavigate();

  const callerPrincipal = identity?.getPrincipal().toString() ?? "";

  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch pinned stories for the current user so we know which are pinned
  const { data: ownPinnedStories } = useGetPinnedStories(
    callerPrincipal || null,
  );

  // Group stories by author
  const storiesByAuthor =
    stories?.reduce(
      (acc, story) => {
        const authorId = story.author.toString();
        if (!acc[authorId]) {
          acc[authorId] = [];
        }
        acc[authorId].push(story);
        return acc;
      },
      {} as Record<string, Story[]>,
    ) || {};

  const authors = Object.keys(storiesByAuthor);

  const handleStoryClick = async (authorId: string) => {
    const authorStories = storiesByAuthor[authorId];
    if (authorStories && authorStories.length > 0) {
      setSelectedStory(authorStories[0]);
      setCurrentIndex(0);

      try {
        await markAsViewed.mutateAsync(authorStories[0].id);
      } catch (error) {
        console.error("Failed to mark story as viewed:", error);
      }
    }
  };

  const handleNext = async () => {
    if (!selectedStory) return;

    const authorStories = storiesByAuthor[selectedStory.author.toString()];
    if (currentIndex < authorStories.length - 1) {
      const nextStory = authorStories[currentIndex + 1];
      setSelectedStory(nextStory);
      setCurrentIndex(currentIndex + 1);

      try {
        await markAsViewed.mutateAsync(nextStory.id);
      } catch (error) {
        console.error("Failed to mark story as viewed:", error);
      }
    } else {
      const currentAuthorIndex = authors.indexOf(
        selectedStory.author.toString(),
      );
      if (currentAuthorIndex < authors.length - 1) {
        const nextAuthorId = authors[currentAuthorIndex + 1];
        const nextAuthorStories = storiesByAuthor[nextAuthorId];
        setSelectedStory(nextAuthorStories[0]);
        setCurrentIndex(0);

        try {
          await markAsViewed.mutateAsync(nextAuthorStories[0].id);
        } catch (error) {
          console.error("Failed to mark story as viewed:", error);
        }
      } else {
        setSelectedStory(null);
      }
    }
  };

  const handlePrevious = () => {
    if (!selectedStory) return;

    const authorStories = storiesByAuthor[selectedStory.author.toString()];
    if (currentIndex > 0) {
      setSelectedStory(authorStories[currentIndex - 1]);
      setCurrentIndex(currentIndex - 1);
    } else {
      const currentAuthorIndex = authors.indexOf(
        selectedStory.author.toString(),
      );
      if (currentAuthorIndex > 0) {
        const prevAuthorId = authors[currentAuthorIndex - 1];
        const prevAuthorStories = storiesByAuthor[prevAuthorId];
        setSelectedStory(prevAuthorStories[prevAuthorStories.length - 1]);
        setCurrentIndex(prevAuthorStories.length - 1);
      }
    }
  };

  const handleAvatarClick = (authorId: string) => {
    navigate({ to: `/users/${authorId}` });
  };

  const renderStoryContent = (story: Story) => {
    if (story.content.__kind__ === "image") {
      return (
        <img
          src={story.content.image.getDirectURL()}
          alt="Story"
          className="max-w-full max-h-[80vh] object-contain mx-auto"
        />
      );
    }
    if (story.content.__kind__ === "video") {
      return (
        <EnhancedVideoPlayer
          src={story.content.video.getDirectURL()}
          autoPlay
        />
      );
    }
    if (story.content.__kind__ === "media") {
      return (
        <div className="flex items-center justify-center h-full">
          <a
            href={story.content.media.getDirectURL()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            View Media
          </a>
        </div>
      );
    }
    return null;
  };

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-3 pb-2">
          {authors.map((authorId) => {
            const authorStories = storiesByAuthor[authorId];
            const isOwn = identity?.getPrincipal().toString() === authorId;

            return (
              <StoryThumbnail
                key={authorId}
                authorId={authorId}
                storyCount={authorStories.length}
                isOwn={isOwn}
                onClick={() => handleStoryClick(authorId)}
              />
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!selectedStory}
        onOpenChange={() => setSelectedStory(null)}
      >
        <DialogContent className="max-w-2xl p-0 bg-black/95">
          {selectedStory && (
            <StoryViewer
              story={selectedStory}
              currentIndex={currentIndex}
              storiesByAuthor={storiesByAuthor}
              authors={authors}
              callerPrincipal={callerPrincipal}
              isPinned={
                ownPinnedStories?.some((s) => s.id === selectedStory.id) ??
                false
              }
              onClose={() => setSelectedStory(null)}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onAvatarClick={handleAvatarClick}
              renderStoryContent={renderStoryContent}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Story Viewer ──────────────────────────────────────────────────────────────

interface StoryViewerProps {
  story: Story;
  currentIndex: number;
  storiesByAuthor: Record<string, Story[]>;
  authors: string[];
  callerPrincipal: string;
  isPinned: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onAvatarClick: (authorId: string) => void;
  renderStoryContent: (story: Story) => React.ReactNode;
}

function StoryViewer({
  story,
  currentIndex,
  storiesByAuthor,
  authors,
  callerPrincipal,
  isPinned,
  onClose,
  onNext,
  onPrevious,
  onAvatarClick,
  renderStoryContent,
}: StoryViewerProps) {
  const [showReactionBar, setShowReactionBar] = useState(false);
  const isOwnStory = story.author.toString() === callerPrincipal;

  const handleContentTap = (e: React.MouseEvent) => {
    // Don't open reaction bar if clicking on nav buttons or action buttons
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    setShowReactionBar((prev) => !prev);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-40 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close story"
        data-ocid="story.close_button"
      >
        <X className="h-5 w-5" />
      </Button>

      <StoryHeader
        authorId={story.author.toString()}
        timestamp={story.timestamp}
        onAvatarClick={onAvatarClick}
      />

      {/* Tappable story content area */}
      <div
        className="min-h-[400px] flex items-center justify-center p-12 cursor-pointer relative"
        onClick={handleContentTap}
        data-ocid="story.canvas_target"
      >
        {renderStoryContent(story)}

        {/* Caption overlay */}
        {story.caption && (
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-white text-sm font-medium drop-shadow leading-snug">
                {story.caption}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reaction bar (shown on tap) */}
      {showReactionBar && (
        <StoryReactionBar
          story={story}
          callerPrincipal={callerPrincipal}
          onClose={() => setShowReactionBar(false)}
        />
      )}

      {/* Reaction counts */}
      <StoryReactionCounts storyId={story.id} />

      <div className="absolute inset-y-0 left-0 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 ml-2"
          onClick={onPrevious}
          disabled={
            currentIndex === 0 && authors.indexOf(story.author.toString()) === 0
          }
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="absolute inset-y-0 right-0 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 mr-2"
          onClick={onNext}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1 px-4">
        {storiesByAuthor[story.author.toString()].map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full ${
              idx === currentIndex ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Story Interactions */}
      <StoryInteractions
        story={story}
        isOwnStory={isOwnStory}
        isPinned={isPinned}
      />
    </div>
  );
}

// ── Reaction Bar ──────────────────────────────────────────────────────────────

function StoryReactionBar({
  story,
  callerPrincipal,
  onClose,
}: {
  story: Story;
  callerPrincipal: string;
  onClose: () => void;
}) {
  const reactToStory = useReactToStory();
  const unreactToStory = useUnreactToStory();
  const { data: reactions = [] } = useGetStoryReactions(story.id);

  const myReactions = new Set(
    reactions
      .filter(([, principals]) =>
        principals.some((p) => p.toString() === callerPrincipal),
      )
      .map(([emoji]) => emoji),
  );

  const handleReact = async (emoji: string) => {
    try {
      if (myReactions.has(emoji)) {
        await unreactToStory.mutateAsync({ storyId: story.id, emoji });
      } else {
        await reactToStory.mutateAsync({ storyId: story.id, emoji });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to react";
      toast.error(msg);
    }
    onClose();
  };

  return (
    <div
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1 bg-black/80 backdrop-blur-md rounded-full px-3 py-2 shadow-xl border border-white/10">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`text-xl h-9 w-9 flex items-center justify-center rounded-full transition-all duration-150 hover:scale-125 ${
              myReactions.has(emoji)
                ? "bg-rose-500/40 scale-110"
                : "hover:bg-white/10"
            }`}
            onClick={() => handleReact(emoji)}
            data-ocid="story.reaction_button"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Reaction Counts ───────────────────────────────────────────────────────────

function StoryReactionCounts({ storyId }: { storyId: bigint }) {
  const { data: reactions = [] } = useGetStoryReactions(storyId);

  const totals = reactions
    .map(([emoji, principals]) => ({ emoji, count: principals.length }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (totals.length === 0) return null;

  return (
    <div className="flex gap-1.5 justify-center py-1.5 flex-wrap px-4">
      {totals.map(({ emoji, count }) => (
        <div
          key={emoji}
          className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-0.5"
        >
          <span className="text-sm">{emoji}</span>
          <span className="text-white text-xs font-medium">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ── Video Player ──────────────────────────────────────────────────────────────

function EnhancedVideoPlayer({
  src,
  autoPlay,
}: { src: string; autoPlay?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clear stale <source> children before appending to prevent memory leaks on re-render
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }

    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    video.appendChild(source);
    video.load();

    if (autoPlay) {
      video.play().catch((err) => {
        console.warn("Autoplay failed (user gesture required):", err);
      });
    }
  }, [src, autoPlay]);

  return (
    <video
      ref={videoRef}
      className="max-w-full max-h-[80vh] mx-auto block"
      controls
      playsInline
      muted={autoPlay}
      preload="metadata"
    />
  );
}

// ── Story Thumbnail ───────────────────────────────────────────────────────────

function StoryThumbnail({
  authorId,
  storyCount,
  isOwn,
  onClick,
}: {
  authorId: string;
  storyCount: number;
  isOwn: boolean;
  onClick: () => void;
}) {
  const authorPrincipal = Principal.fromText(authorId);
  const { data: profile } = useGetUserProfile(authorPrincipal);

  return (
    <div
      className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
      onClick={onClick}
    >
      <div className="relative">
        <div className="p-0.5 rounded-full bg-gradient-to-tr from-rose-400 via-pink-500 to-rose-600">
          <Avatar className="h-14 w-14 border-2 border-background">
            {profile?.profilePicture ? (
              <AvatarImage
                src={profile.profilePicture.getDirectURL()}
                alt={profile.name}
              />
            ) : null}
            <AvatarFallback>
              {profile?.name?.charAt(0).toUpperCase() ||
                authorId.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
          {storyCount}
        </div>
      </div>
      <p className="text-xs text-center max-w-[60px] truncate">
        {isOwn ? "You" : profile?.username || authorId.slice(0, 8)}
      </p>
    </div>
  );
}

// ── Story Header ──────────────────────────────────────────────────────────────

function StoryHeader({
  authorId,
  timestamp,
  onAvatarClick,
}: {
  authorId: string;
  timestamp: bigint;
  onAvatarClick: (authorId: string) => void;
}) {
  const authorPrincipal = Principal.fromText(authorId);
  const { data: profile } = useGetUserProfile(authorPrincipal);

  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
      <Avatar
        className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onAvatarClick(authorId)}
      >
        {profile?.profilePicture ? (
          <AvatarImage
            src={profile.profilePicture.getDirectURL()}
            alt={profile.name}
          />
        ) : null}
        <AvatarFallback className="text-xs">
          {profile?.name?.charAt(0).toUpperCase() ||
            authorId.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="text-white">
        <p
          className="text-sm font-semibold cursor-pointer hover:underline"
          onClick={() => onAvatarClick(authorId)}
        >
          {profile?.username || `${authorId.slice(0, 12)}...`}
        </p>
        <p className="text-xs opacity-80">
          {new Date(Number(timestamp) / 1000000).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

// ── Story Interactions ────────────────────────────────────────────────────────

function StoryInteractions({
  story,
  isOwnStory,
  isPinned,
}: {
  story: Story;
  isOwnStory: boolean;
  isPinned: boolean;
}) {
  const [showForward, setShowForward] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [pinPending, setPinPending] = useState(false);
  const pinStory = usePinStory();
  const unpinStory = useUnpinStory();
  const giftRosesOnStory = useGiftRosesOnStory();
  const { data: roseBalance = 0 } = useGetRoseBalance();

  const { data: authorProfile } = useGetUserProfile(story.author);

  const handlePinToggle = async () => {
    if (pinPending) return;
    setPinPending(true);
    try {
      if (isPinned) {
        await unpinStory.mutateAsync(story.id);
        toast.success("Story removed from Highlights");
      } else {
        await pinStory.mutateAsync(story.id);
        toast.success("Story pinned to your Highlights");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update pin";
      toast.error(msg);
    } finally {
      setPinPending(false);
    }
  };

  const handleGift = async (amount: number) => {
    await giftRosesOnStory.mutateAsync({ storyId: story.id, amount });
  };

  return (
    <>
      <div className="absolute bottom-16 left-0 right-0 px-4 z-10">
        <div className="flex items-center gap-2 justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-white hover:bg-white/20"
            onClick={() => setShowForward(true)}
            data-ocid="story.share_button"
          >
            <Share2 className="h-5 w-5" />
          </Button>

          {/* Gift button — hidden for own stories */}
          {!isOwnStory && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-white hover:bg-white/20"
              onClick={() => setShowGift(true)}
              data-ocid="story.gift_button"
              title="Gift Roses"
            >
              <Gift className="h-5 w-5 text-rose-300" />
            </Button>
          )}

          {isOwnStory && (
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 text-white hover:bg-white/20 ${isPinned ? "text-rose-300" : ""}`}
              onClick={handlePinToggle}
              disabled={pinPending}
              data-ocid="story.pin_button"
              title={isPinned ? "Unpin from Highlights" : "Pin to Highlights"}
            >
              {isPinned ? (
                <BookmarkCheck className="h-5 w-5 fill-rose-400 text-rose-300" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {showForward && (
        <ForwardStoryModal
          open={showForward}
          onClose={() => setShowForward(false)}
          story={story}
        />
      )}

      {showGift && (
        <RoseGiftModal
          open={showGift}
          onClose={() => setShowGift(false)}
          onGift={handleGift}
          recipientName={
            authorProfile?.username ||
            authorProfile?.name ||
            story.author.toString().slice(0, 12)
          }
          currentBalance={roseBalance}
        />
      )}
    </>
  );
}

// ── Forward Story Modal ───────────────────────────────────────────────────────

function ForwardStoryModal({
  open,
  onClose,
  story,
}: { open: boolean; onClose: () => void; story: Story }) {
  const { identity } = useInternetIdentity();
  const { data: conversations } = useGetConversations();
  const { data: groups } = useGetGroupChats();
  const sendMessage = useSendMessage();
  const sendGroupMessage = useSendGroupMessage();
  const [selectedConversations, setSelectedConversations] = useState<
    Set<bigint>
  >(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<bigint>>(new Set());
  const [isSending, setIsSending] = useState(false);

  const handleForward = async () => {
    if (selectedConversations.size === 0 && selectedGroups.size === 0) {
      toast.error("Please select at least one conversation or group");
      return;
    }

    setIsSending(true);
    try {
      const ensureMobileCompatibleBlob = async (
        originalBlob: ExternalBlob,
      ): Promise<ExternalBlob> => {
        try {
          const bytes = await originalBlob.getBytes();
          return ExternalBlob.fromBytes(bytes);
        } catch (error) {
          console.error("Error processing blob:", error);
          return originalBlob;
        }
      };

      let forwardContent = story.content;

      if (story.content.__kind__ === "video") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.video,
        );
        forwardContent = { __kind__: "video", video: mobileCompatibleBlob };
      } else if (story.content.__kind__ === "image") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.image,
        );
        forwardContent = { __kind__: "image", image: mobileCompatibleBlob };
      } else if (story.content.__kind__ === "media") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.media,
        );
        forwardContent = { __kind__: "media", media: mobileCompatibleBlob };
      }

      const callerPrincipal = identity?.getPrincipal().toString();

      // Forward to conversations
      for (const convId of selectedConversations) {
        const conv = conversations?.find((c) => c.id === convId);
        if (conv) {
          const receiver = conv.participants.find(
            (p) => p.toString() !== callerPrincipal,
          );
          if (receiver) {
            await sendMessage.mutateAsync({
              receiver,
              content: forwardContent,
            });
          }
        }
      }

      // Forward to groups
      for (const groupId of selectedGroups) {
        await sendGroupMessage.mutateAsync({
          groupId,
          content: forwardContent,
        });
      }

      toast.success("Story forwarded successfully!");
      onClose();
    } catch (error: unknown) {
      toast.error(
        (error instanceof Error ? error.message : null) ||
          "Failed to forward story",
      );
    } finally {
      setIsSending(false);
    }
  };

  const toggleConversation = (convId: bigint) => {
    setSelectedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  };

  const toggleGroup = (groupId: bigint) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Forward Story</h3>

          <ScrollArea className="h-64">
            <div className="space-y-2 pr-4">
              {conversations && conversations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Direct Messages
                  </p>
                  {conversations.map((conv) => (
                    <div
                      key={conv.id.toString()}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleConversation(conv.id)}
                    >
                      <Checkbox
                        checked={selectedConversations.has(conv.id)}
                        onCheckedChange={() => toggleConversation(conv.id)}
                      />
                      <Avatar className="h-8 w-8">
                        {conv.otherParticipantProfile?.profilePicture ? (
                          <AvatarImage
                            src={conv.otherParticipantProfile.profilePicture.getDirectURL()}
                          />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {conv.otherParticipantProfile?.name
                            ?.charAt(0)
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {conv.otherParticipantProfile?.name ||
                          conv.otherParticipantProfile?.username ||
                          "Unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {groups && groups.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 mt-3">
                    Group Chats
                  </p>
                  {groups.map((group) => (
                    <div
                      key={group.id.toString()}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <Checkbox
                        checked={selectedGroups.has(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <Avatar className="h-8 w-8">
                        {group.avatar ? (
                          <AvatarImage src={group.avatar.getDirectURL()} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {group.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{group.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!conversations || conversations.length === 0) &&
                (!groups || groups.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No conversations or groups available
                  </p>
                )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={
                isSending ||
                (selectedConversations.size === 0 && selectedGroups.size === 0)
              }
            >
              {isSending ? "Forwarding..." : "Forward"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
