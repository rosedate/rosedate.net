import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@dfinity/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  Edit3,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
  Pin,
  Send,
  Shield,
  ShieldOff,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { CommentInteraction, Post, Story } from "../backend";
import { getMimeType } from "../lib/mimeTypes";

const POSTS_PAGE_SIZE = 9;
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useBlockUser,
  useCommentOnPost,
  useDeleteComment,
  useDeletePost,
  useEditPost,
  useFollowUser,
  useGetFollowerCount,
  useGetFollowingCount,
  useGetOnlineUsers,
  useGetPinnedStories,
  useGetPostComments,
  useGetPostInteractions,
  useGetUserPosts,
  useGetUserProfile,
  useIsFollowing,
  useIsUserBlocked,
  useLikePost,
  useUnblockUser,
  useUnfollowUser,
} from "../hooks/useQueries";

// ─── Embed helpers (mirrors PostsPage.tsx) ────────────────────────────────────
const EMBED_PREFIX = "[embed:";
const EMBED_SUFFIX = "]";

function parseEmbed(content: string): {
  text: string;
  embedUrl: string | null;
} {
  const startIdx = content.indexOf(EMBED_PREFIX);
  if (startIdx === -1) return { text: content, embedUrl: null };
  const endIdx = content.indexOf(EMBED_SUFFIX, startIdx + EMBED_PREFIX.length);
  if (endIdx === -1) return { text: content, embedUrl: null };
  const embedUrl = content.slice(startIdx + EMBED_PREFIX.length, endIdx);
  const text = content.slice(0, startIdx).trim();
  return { text, embedUrl };
}

function detectEmbedType(url: string): "youtube" | "x" | "tiktok" | "unknown" {
  if (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("youtube-nocookie.com")
  )
    return "youtube";
  if (
    url.includes("twitter.com") ||
    url.includes("x.com") ||
    url.includes("twttr.com") ||
    url.includes("platform.twitter.com")
  )
    return "x";
  if (url.includes("tiktok.com")) return "tiktok";
  return "unknown";
}

function EmbedRenderer({ embedUrl }: { embedUrl: string }) {
  const type = detectEmbedType(embedUrl);

  if (type === "x") {
    let iframeSrc: string | null = null;
    let fallbackUrl = embedUrl;

    if (embedUrl.includes("platform.twitter.com/embed/Tweet.html")) {
      iframeSrc = embedUrl;
    } else {
      const tweetIdMatch =
        embedUrl.match(/twitter\.com\/[^/\s"']+\/status\/(\d+)/i) ||
        embedUrl.match(/x\.com\/[^/\s"']+\/status\/(\d+)/i);
      if (tweetIdMatch) {
        iframeSrc = `https://platform.twitter.com/embed/Tweet.html?id=${tweetIdMatch[1]}&theme=light&lang=en`;
        fallbackUrl = embedUrl;
      }
    }

    if (iframeSrc) {
      return (
        <div
          className="mt-2 mb-1 w-full"
          style={{ borderRadius: "12px", overflow: "hidden" }}
          data-ocid="profile-embed-x"
        >
          <iframe
            src={iframeSrc}
            width="100%"
            height="500"
            style={{ borderRadius: "12px", overflow: "hidden", border: "none" }}
            scrolling="no"
            allowFullScreen
            loading="lazy"
            title="X (Twitter) post"
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"
          />
        </div>
      );
    }

    return (
      <a
        href={fallbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/70 transition-colors mt-2 mb-1"
        data-ocid="profile-embed-x"
      >
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">
            View on X (Twitter)
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {fallbackUrl}
          </p>
        </div>
      </a>
    );
  }

  const isTikTok = type === "tiktok";
  const height = isTikTok ? "700px" : "315px";

  return (
    <div
      className="mt-2 mb-1 rounded-xl overflow-hidden w-full"
      style={{ height }}
    >
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        className="rounded-xl border-0 w-full"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title="Embedded content"
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        data-ocid="profile-embed-iframe"
      />
    </div>
  );
}

// Helper to get initials
function getInitials(name?: string, principal?: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (principal) return principal.slice(0, 2).toUpperCase();
  return "??";
}

// Commenter avatar component for UserProfilePage
interface CommenterAvatarProps {
  principalId: string;
  currentUserPrincipal: string;
  onNavigate: (principalId: string) => void;
}

function CommenterAvatar({
  principalId,
  currentUserPrincipal,
  onNavigate,
}: CommenterAvatarProps) {
  const { data: profile, isLoading } = useGetUserProfile(principalId);
  const isCurrentUser = principalId === currentUserPrincipal;

  const avatarUrl = profile?.profilePicture
    ? profile.profilePicture.getDirectURL()
    : null;
  const initials = getInitials(profile?.name, principalId);
  const displayName =
    profile?.username || profile?.name || `${principalId.slice(0, 8)}...`;

  const handleClick = () => {
    if (!isCurrentUser) onNavigate(principalId);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${!isCurrentUser ? "cursor-pointer" : ""} flex-shrink-0`}
        onClick={handleClick}
        title={!isCurrentUser ? `View ${displayName}'s profile` : undefined}
      >
        {isLoading ? (
          <Skeleton className="w-7 h-7 rounded-full" />
        ) : (
          <Avatar className="w-7 h-7 ring-1 ring-rose-200">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-rose-100 text-rose-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <span
        className={`text-xs font-semibold ${!isCurrentUser ? "cursor-pointer hover:text-rose-600 transition-colors" : ""}`}
        onClick={handleClick}
      >
        {isLoading ? <Skeleton className="h-3 w-16" /> : displayName}
      </span>
    </div>
  );
}

// Comment item for UserProfilePage
interface CommentItemProps {
  comment: CommentInteraction;
  postId: string;
  currentUserPrincipal: string;
  onNavigate: (principalId: string) => void;
}

function CommentItem({
  comment,
  postId,
  currentUserPrincipal,
  onNavigate,
}: CommentItemProps) {
  const deleteCommentMutation = useDeleteComment();
  const isOwner = comment.user.toString() === currentUserPrincipal;

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex gap-2 py-2">
      <CommenterAvatar
        principalId={comment.user.toString()}
        currentUserPrincipal={currentUserPrincipal}
        onNavigate={onNavigate}
      />
      <div className="flex-1 min-w-0">
        <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl px-3 py-2">
          <p className="text-sm text-foreground">{comment.comment}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(comment.timestamp)}
          </span>
          {isOwner && (
            <button
              className="text-xs text-red-400 hover:text-red-600 font-medium"
              onClick={() =>
                deleteCommentMutation.mutate({ postId, commentId: comment.id })
              }
              disabled={deleteCommentMutation.isPending}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Post card for user profile
interface PostCardProps {
  post: Post;
  currentUserPrincipal: string;
  isOwnPost: boolean;
  onOpenComments: (post: Post) => void;
  onNavigate: (principalId: string) => void;
}

function PostCard({
  post,
  currentUserPrincipal: _currentUserPrincipal,
  isOwnPost,
  onOpenComments,
  onNavigate: _onNavigate,
}: PostCardProps) {
  const { data: interactions } = useGetPostInteractions(post.id);
  const likePostMutation = useLikePost();
  const deletePostMutation = useDeletePost();
  const editPostMutation = useEditPost();
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const imageUrl = post.image ? post.image.getDirectURL() : null;

  // Parse embed from post content
  const { text: postText, embedUrl } = parseEmbed(post.content);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    await deletePostMutation.mutateAsync(post.id);
  };

  const handleEdit = async () => {
    await editPostMutation.mutateAsync({
      postId: post.id,
      content: editContent,
      image: post.image ?? null,
    });
    setEditMode(false);
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {formatDate(post.timestamp)}
          </span>
          {isOwnPost && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditMode(!editMode)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Edit post"
                data-ocid="profile-post-edit-btn"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deletePostMutation.isPending}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Delete post"
                data-ocid="profile-post-delete-btn"
              >
                {deletePostMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Edit mode */}
        {editMode ? (
          <div className="space-y-2 mb-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none text-sm border-rose-200 focus:border-rose-400"
              data-ocid="profile-post-edit-textarea"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleEdit}
                disabled={editPostMutation.isPending}
                className="rounded-full bg-rose-500 hover:bg-rose-600 text-white"
              >
                {editPostMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditMode(false);
                  setEditContent(post.content);
                }}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {postText && (
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                {postText}
              </p>
            )}
            {/* Embed preview */}
            {embedUrl && <EmbedRenderer embedUrl={embedUrl} />}
            {imageUrl && (
              <div className="mb-3 rounded-xl overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Post"
                  className="w-full object-cover max-h-64"
                />
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-4 pt-2 border-t border-rose-50">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rose-500 transition-colors"
            onClick={() => likePostMutation.mutate(post.id)}
          >
            <Heart className="w-4 h-4" />
            <span>{interactions?.likes?.toString() ?? "0"}</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rose-500 transition-colors"
            onClick={() => onOpenComments(post)}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{interactions?.comments?.toString() ?? "0"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Comments Modal for UserProfilePage
interface CommentsModalProps {
  post: Post | null;
  currentUserPrincipal: string;
  onClose: () => void;
  onNavigate: (principalId: string) => void;
}

function CommentsModal({
  post,
  currentUserPrincipal,
  onClose,
  onNavigate,
}: CommentsModalProps) {
  const { data: comments, isLoading } = useGetPostComments(post?.id ?? "");
  const commentMutation = useCommentOnPost();
  const [commentText, setCommentText] = useState("");

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;
    await commentMutation.mutateAsync({
      postId: post.id,
      comment: commentText.trim(),
      parentCommentId: null,
    });
    setCommentText("");
  };

  if (!post) return null;

  return (
    <Dialog open={!!post} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-rose-500" />
            Comments
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                  <Skeleton className="h-12 flex-1 rounded-xl" />
                </div>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="divide-y divide-rose-50">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id.toString()}
                  comment={comment}
                  postId={post.id}
                  currentUserPrincipal={currentUserPrincipal}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No comments yet. Be the first!
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t border-rose-100">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 rounded-full border-rose-200 focus:border-rose-400 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
          <Button
            size="icon"
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-full flex-shrink-0"
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || commentMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Enhanced video player for highlight stories — injects MIME type via source element
function HighlightVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Clear any stale source children before re-attaching
    while (video.firstChild) video.removeChild(video.firstChild);
    const source = document.createElement("source");
    source.src = videoUrl;
    source.type = getMimeType(videoUrl);
    video.appendChild(source);
    video.load();
    video.play().catch(() => {
      /* autoplay may be blocked — controls allow manual play */
    });
  }, [videoUrl]);

  return (
    <video
      ref={videoRef}
      className="max-w-full max-h-[75vh] mx-auto rounded-xl"
      controls
      playsInline
      muted
      preload="metadata"
    />
  );
}

// Story viewer modal for Highlights
function HighlightStoryModal({
  story,
  onClose,
}: {
  story: Story | null;
  onClose: () => void;
}) {
  if (!story) return null;

  const renderContent = () => {
    if (story.content.__kind__ === "image") {
      return (
        <img
          src={story.content.image.getDirectURL()}
          alt="Highlight"
          className="max-w-full max-h-[75vh] object-contain mx-auto rounded-xl"
        />
      );
    }
    if (story.content.__kind__ === "video") {
      // Key on story.id ensures the component fully remounts (and the effect re-fires)
      // every time a different highlight is opened — critical for mobile MIME injection
      return (
        <HighlightVideoPlayer
          key={story.id.toString()}
          videoUrl={story.content.video.getDirectURL()}
        />
      );
    }
    return null;
  };

  return (
    <Dialog open={!!story} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 bg-black/95">
        <div className="relative min-h-[300px] flex items-center justify-center p-8">
          <button
            type="button"
            className="absolute top-2 right-2 z-10 text-white bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          {renderContent()}
        </div>
        <div className="px-4 pb-3 text-center text-xs text-white/60">
          {new Date(Number(story.timestamp) / 1_000_000).toLocaleDateString(
            [],
            { month: "short", day: "numeric", year: "numeric" },
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Highlights section — horizontal row of pinned story thumbnails
const HIGHLIGHTS_PAGE_SIZE = 9;

function HighlightsSection({ userId }: { userId: string }) {
  const { data: pinnedStories, isLoading } = useGetPinnedStories(userId);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [visibleCount, setVisibleCount] = useState(HIGHLIGHTS_PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Pin className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Highlights
          </h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={i}
              className="w-16 h-16 rounded-full flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!pinnedStories || pinnedStories.length === 0) return null;

  // Sort newest first — use pinnedAt if available, fall back to story timestamp
  const sortedStories = [...pinnedStories].sort((a, b) => {
    const aTime = (a as Story & { pinnedAt?: bigint }).pinnedAt ?? a.timestamp;
    const bTime = (b as Story & { pinnedAt?: bigint }).pinnedAt ?? b.timestamp;
    return Number(bTime) - Number(aTime);
  });

  const visibleStories = sortedStories.slice(0, visibleCount);
  const hasMore = pinnedStories.length > visibleCount;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Pin className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Highlights
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {visibleStories.map((story) => {
          const thumbUrl =
            story.content.__kind__ === "image"
              ? story.content.image.getDirectURL()
              : story.content.__kind__ === "video"
                ? story.content.video.getDirectURL()
                : null;
          const viewCount = story.viewedBy?.length ?? 0;

          return (
            <button
              key={story.id.toString()}
              type="button"
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
              onClick={() => setViewingStory(story)}
              data-ocid="highlight-thumb"
            >
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-rose-400 via-pink-500 to-rose-600">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-background bg-rose-100 flex items-center justify-center group-hover:opacity-90 transition-opacity">
                  {thumbUrl && story.content.__kind__ === "image" ? (
                    <img
                      src={thumbUrl}
                      alt="Highlight"
                      className="w-full h-full object-cover"
                    />
                  ) : story.content.__kind__ === "video" && thumbUrl ? (
                    <div className="w-full h-full relative bg-rose-950">
                      <video
                        src={thumbUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          // Seek to first frame to display a real thumbnail
                          (e.currentTarget as HTMLVideoElement).currentTime =
                            0.5;
                        }}
                      />
                      <div className="absolute bottom-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <Bookmark className="w-5 h-5 text-rose-400" />
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-muted-foreground max-w-[60px] truncate">
                  {new Date(
                    Number(story.timestamp) / 1_000_000,
                  ).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Eye className="w-2.5 h-2.5" />
                  {viewCount}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((v) => v + HIGHLIGHTS_PAGE_SIZE)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          data-ocid="highlights-view-more"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          View More ({pinnedStories.length - visibleCount} more)
        </button>
      )}

      <HighlightStoryModal
        story={viewingStory}
        onClose={() => setViewingStory(null)}
      />
    </div>
  );
}

export default function UserProfilePage() {
  // Route is /users/$userId as defined in App.tsx
  const { userId } = useParams({ from: "/users/$userId" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const currentUserPrincipal = identity?.getPrincipal().toString() ?? "";

  const { data: profile, isLoading: profileLoading } =
    useGetUserProfile(userId);
  const { data: posts, isLoading: postsLoading } = useGetUserPosts(userId);
  const { data: followerCount } = useGetFollowerCount(userId);
  const { data: followingCount } = useGetFollowingCount(userId);
  const { data: isFollowing } = useIsFollowing(userId);
  const { data: isBlocked } = useIsUserBlocked(userId);
  const { data: onlineUsers = [] } = useGetOnlineUsers();

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [visiblePostCount, setVisiblePostCount] = useState(POSTS_PAGE_SIZE);

  // Sort posts newest first
  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => Number(b.timestamp - a.timestamp));
  }, [posts]);

  const visiblePosts = sortedPosts.slice(0, visiblePostCount);
  const hasMorePosts = sortedPosts.length > visiblePostCount;

  // Navigate to another user's profile using the correct route /users/$userId
  const handleNavigateToProfile = useCallback(
    (pid: string) => {
      if (pid !== userId) {
        navigate({ to: "/users/$userId", params: { userId: pid } });
      }
    },
    [navigate, userId],
  );

  const isOwnProfile = userId === currentUserPrincipal;

  const avatarUrl = profile?.profilePicture
    ? profile.profilePicture.getDirectURL()
    : null;
  const initials = getInitials(profile?.name, userId);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-background">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 to-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-background/80 backdrop-blur-sm border-b border-rose-100 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/users" })}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-sm truncate">
            {profile.username || profile.name}
          </h2>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Info */}
        <div className="bg-white dark:bg-card rounded-2xl p-5 border border-rose-100 shadow-sm">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 ring-4 ring-rose-200 flex-shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.name} />}
              <AvatarFallback className="bg-rose-100 text-rose-700 text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {profile.name}
                </h1>
                {onlineUsers.includes(userId) && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0 animate-pulse"
                    aria-label="Online"
                  />
                )}
              </div>
              <p className="text-sm text-rose-600 font-medium">
                @{profile.username}
              </p>
              {profile.country && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {profile.country}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {profile.bio}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-sm font-bold">
                    {followerCount?.toString() ?? "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">
                    {followingCount?.toString() ?? "0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-2 mt-4">
              <Button
                className={`flex-1 rounded-full text-sm ${isFollowing ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
                onClick={() => {
                  if (isFollowing) {
                    unfollowMutation.mutate(Principal.fromText(userId));
                  } else {
                    followMutation.mutate(Principal.fromText(userId));
                  }
                }}
                disabled={
                  followMutation.isPending || unfollowMutation.isPending
                }
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-1.5" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() =>
                  navigate({
                    to: "/chats/$conversationId",
                    params: { conversationId: userId },
                  })
                }
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Message
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full ${isBlocked ? "border-green-200 text-green-700 hover:bg-green-50" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                onClick={() => {
                  if (isBlocked) {
                    unblockMutation.mutate(Principal.fromText(userId));
                  } else {
                    blockMutation.mutate(Principal.fromText(userId));
                  }
                }}
                disabled={blockMutation.isPending || unblockMutation.isPending}
              >
                {isBlocked ? (
                  <ShieldOff className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Highlights */}
        <HighlightsSection userId={userId} />

        {/* Posts */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Posts
          </h3>
          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : sortedPosts.length > 0 ? (
            <>
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserPrincipal={currentUserPrincipal}
                  isOwnPost={isOwnProfile}
                  onOpenComments={setSelectedPost}
                  onNavigate={handleNavigateToProfile}
                />
              ))}
              {hasMorePosts && (
                <button
                  type="button"
                  onClick={() =>
                    setVisiblePostCount((v) => v + POSTS_PAGE_SIZE)
                  }
                  className="w-full py-2.5 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
                >
                  View More ({sortedPosts.length - visiblePostCount} remaining)
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No posts yet
            </div>
          )}
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        post={selectedPost}
        currentUserPrincipal={currentUserPrincipal}
        onClose={() => setSelectedPost(null)}
        onNavigate={handleNavigateToProfile}
      />
    </div>
  );
}
