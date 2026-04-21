import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Ban,
  Camera,
  Check,
  CornerUpLeft,
  Edit2,
  Forward as ForwardIcon,
  Image as ImageIcon,
  LogOut,
  Mic,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  Send,
  ShieldOff,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Conversation,
  ExternalBlob,
  type GroupChat,
  type Message,
  type MessageType,
} from "../backend";
import ExpiredMediaPlaceholder from "../components/ExpiredMediaPlaceholder";
import LoginButton from "../components/LoginButton";
import ProfileLinkMessageText from "../components/ProfileLinkMessageText";
import RoseGiftModal from "../components/RoseGiftModal";
import VideoRecorder from "../components/VideoRecorder";
import VoiceRecorder from "../components/VoiceRecorder";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useBlockUser,
  useDeleteMessage,
  useEditMessage,
  useForwardMessage,
  useGetConversations,
  useGetGroupChats,
  useGetOnlineUsers,
  useGetPinnedConversationMessage,
  useGetRoseBalance,
  useGetTypingUsers,
  useGetUserProfile,
  useIsUserBlocked,
  useLeaveConversation,
  useMarkConversationRead,
  usePinConversationMessage,
  useReactToMessage,
  useSendMessage,
  useSetTyping,
  useUnblockUser,
  useUnpinConversationMessage,
  useUpdateLastActive,
} from "../hooks/useQueries";
import { isMediaExpired } from "../lib/mediaExpiration";
import { getMimeType } from "../lib/mimeTypes";
import { containsProfileLink } from "../lib/profileLinkDetection";
import { getVideoUploadWarning } from "../lib/videoUploadGuidance";

// Extended Message type to handle optional new backend fields
type ExtendedMessage = Message & {
  reactions?: [string, string[]][];
  readBy?: string[];
  replyToId?: bigint | null;
};

const EMOJI_OPTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"] as const;
const TYPING_STOP_DELAY = 3000;

// Highlight text matching a search term
function HighlightText({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;
  const regex = new RegExp(
    `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 text-yellow-900 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// Animated typing dots bubble
function TypingBubble({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : `${names.slice(0, 2).join(", ")} are typing`;
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// Emoji reactions overlay
function EmojiReactionPicker({
  onSelect,
  onClose,
  isOwn,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOwn: boolean;
}) {
  return (
    <div
      className={`absolute bottom-full mb-1 z-50 flex gap-1 bg-card border border-rose-100 rounded-full shadow-lg px-2 py-1 ${isOwn ? "right-0" : "left-0"}`}
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="text-lg hover:scale-125 transition-transform p-0.5 rounded-full hover:bg-rose-50"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// Reaction badges below a message
function ReactionBadges({
  reactions,
}: {
  reactions: [string, string[]][];
}) {
  if (!reactions || reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(([emoji, principals]) => (
        <span
          key={emoji}
          className="inline-flex items-center gap-0.5 bg-rose-50 border border-rose-100 rounded-full px-1.5 py-0.5 text-xs"
        >
          {emoji}
          {principals.length > 1 && (
            <span className="text-rose-600 font-medium">
              {principals.length}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// Reply-to quote block
function ReplyQuoteBlock({ text }: { text: string }) {
  return (
    <div className="border-l-2 border-rose-400 pl-2 mb-1 text-xs text-muted-foreground italic truncate max-w-full">
      {text}
    </div>
  );
}

// Enhanced video player with unified MIME type handling
function EnhancedVideoPlayer({
  src,
  onPlay,
}: { src: string; onPlay?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    video.appendChild(source);
    const handlePlay = () => {
      setIsPlaying(true);
      if (!hasTrackedView && onPlay) {
        onPlay();
        setHasTrackedView(true);
      }
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = () =>
      toast.error("This video format may not be supported on your device.");
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
    };
  }, [src, hasTrackedView, onPlay]);

  const handleVideoClick = async () => {
    const video = videoRef.current;
    if (!video) return;
    setHasInteracted(true);
    if (video.paused) {
      try {
        await video.play();
      } catch {
        toast.error("Failed to play video.");
      }
    } else {
      video.pause();
    }
  };

  return (
    <div className="relative max-w-full">
      <video
        ref={videoRef}
        className="max-w-full rounded max-h-64 sm:max-h-96 cursor-pointer"
        controls
        playsInline
        preload="metadata"
        onClick={handleVideoClick}
      />
      {!hasInteracted && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-3">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced audio player with unified MIME type handling
function EnhancedAudioPlayer({
  src,
  type,
  onPlay,
}: { src: string; type: "voice" | "media"; onPlay?: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    audio.appendChild(source);
    const handlePlay = () => {
      if (!hasTrackedView && onPlay) {
        onPlay();
        setHasTrackedView(true);
      }
    };
    const handleError = () =>
      toast.error("This audio format may not be supported on your device.");
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("error", handleError);
    };
  }, [src, hasTrackedView, onPlay]);

  return (
    <div className="flex items-center gap-2">
      {type === "voice" && <Mic className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />}
      <audio
        ref={audioRef}
        controls
        className="max-w-full h-8"
        preload="metadata"
      />
    </div>
  );
}

// Forward message modal
type ForwardTarget =
  | { kind: "conversation"; id: bigint; name: string; avatar?: string }
  | { kind: "group"; id: bigint; name: string; avatar?: string };

function ForwardMessageModal({
  open,
  onClose,
  onForward,
  conversations,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  onForward: (target: ForwardTarget) => void;
  conversations: Conversation[];
  groups: GroupChat[];
}) {
  const [search, setSearch] = useState("");

  const targets: ForwardTarget[] = [
    ...conversations.map((c) => ({
      kind: "conversation" as const,
      id: c.id,
      name:
        c.otherParticipantProfile?.name || `Conversation ${c.id.toString()}`,
      avatar: c.otherParticipantProfile?.profilePicture?.getDirectURL(),
    })),
    ...groups.map((g) => ({
      kind: "group" as const,
      id: g.id,
      name: g.name,
      avatar: g.avatar?.getDirectURL(),
    })),
  ];

  const filtered = search.trim()
    ? targets.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : targets;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <ForwardIcon className="h-4 w-4" />
            Forward Message
          </DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Input
            placeholder="Search conversations or groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8 text-sm border-rose-200 focus:border-rose-400"
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-2.5 text-muted-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No conversations or groups found
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((target) => (
                <button
                  key={`${target.kind}-${target.id.toString()}`}
                  type="button"
                  onClick={() => {
                    onForward(target);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-rose-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {target.avatar ? (
                      <img
                        src={target.avatar}
                        alt={target.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-rose-600 text-xs font-bold">
                        {target.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {target.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {target.kind === "group" ? "Group" : "Direct message"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Per-message action menu
function MessageActions({
  message,
  isOwn,
  isPinned,
  onEdit,
  onDelete,
  onForward,
  onReply,
  onPin,
  onUnpin,
}: {
  message: ExtendedMessage;
  isOwn: boolean;
  isPinned: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onForward: () => void;
  onReply: () => void;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const isText = message.content.__kind__ === "text";
  const isDeleted = message.isDeleted;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 text-muted-foreground flex-shrink-0"
          aria-label="Message actions"
          data-ocid="msg-actions-trigger"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isOwn ? "end" : "start"}
        className="min-w-[140px]"
      >
        {!isDeleted && (
          <DropdownMenuItem onClick={onReply} className="gap-2 cursor-pointer">
            <CornerUpLeft className="h-3.5 w-3.5 text-rose-500" />
            Reply
          </DropdownMenuItem>
        )}
        {!isDeleted && (
          <DropdownMenuItem
            onClick={onForward}
            className="gap-2 cursor-pointer"
          >
            <ForwardIcon className="h-3.5 w-3.5 text-rose-500" />
            Forward
          </DropdownMenuItem>
        )}
        {!isDeleted &&
          (isPinned ? (
            <DropdownMenuItem
              onClick={onUnpin}
              className="gap-2 cursor-pointer"
            >
              <PinOff className="h-3.5 w-3.5 text-rose-500" />
              Unpin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onPin} className="gap-2 cursor-pointer">
              <Pin className="h-3.5 w-3.5 text-rose-500" />
              Pin
            </DropdownMenuItem>
          ))}
        {isOwn && isText && !isDeleted && (
          <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
            <Edit2 className="h-3.5 w-3.5 text-blue-500" />
            Edit
          </DropdownMenuItem>
        )}
        {isOwn && !isDeleted && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ConversationPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { conversationId } = useParams({ from: "/chats/$conversationId" });

  const {
    data: conversations,
    isLoading,
    refetch: refetchConversations,
  } = useGetConversations();
  const { data: groups = [] } = useGetGroupChats();
  const { data: roseBalance } = useGetRoseBalance();
  const { data: onlineUsers = [] } = useGetOnlineUsers();
  const sendMessage = useSendMessage();
  const leaveConversation = useLeaveConversation();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const forwardMessage = useForwardMessage();
  const reactToMessage = useReactToMessage();
  const markConversationRead = useMarkConversationRead();
  const setTyping = useSetTyping();
  const updateLastActive = useUpdateLastActive();
  const pinConversationMessage = usePinConversationMessage();
  const unpinConversationMessage = useUnpinConversationMessage();

  const [messageText, setMessageText] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showRoseGift, setShowRoseGift] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<bigint | null>(null);
  const [editText, setEditText] = useState("");
  // Forward state
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(
    null,
  );
  // Emoji reaction picker state
  const [emojiPickerForId, setEmojiPickerForId] = useState<bigint | null>(null);
  // Reply state
  const [replyTo, setReplyTo] = useState<{
    id: bigint;
    snippet: string;
  } | null>(null);
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Try to parse conversationId as Principal for new chat flow
  let targetPrincipal: Principal | null = null;
  let isNewChatFlow = false;
  try {
    targetPrincipal = Principal.fromText(conversationId);
    isNewChatFlow = true;
  } catch {
    // Not a valid principal, treat as conversation ID
  }

  const conversation = conversations?.find((conv) => {
    if (conv.id.toString() === conversationId) return true;
    if (targetPrincipal) {
      return conv.participants.some(
        (p) => p.toString() === targetPrincipal!.toString(),
      );
    }
    return false;
  });

  let otherParticipant: Principal | null = null;
  if (conversation) {
    otherParticipant =
      conversation.participants.find(
        (p) => p.toString() !== identity?.getPrincipal().toString(),
      ) || null;
  } else if (isNewChatFlow && targetPrincipal) {
    otherParticipant = targetPrincipal;
  }

  const { data: targetUserProfile } = useGetUserProfile(
    otherParticipant || Principal.anonymous(),
  );
  const { data: isBlocked } = useIsUserBlocked(
    otherParticipant || Principal.anonymous(),
  );

  // Pinned message for this conversation
  const { data: pinnedMessage } =
    useGetPinnedConversationMessage(otherParticipant);

  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  // Check if other participant is online
  const isOtherOnline = otherParticipant
    ? onlineUsers.includes(otherParticipant.toString())
    : false;

  // Typing users from backend (poll every 3s)
  const convIdForTyping = conversation?.id ?? null;
  const { data: typingUserPrincipals = [] } =
    useGetTypingUsers(convIdForTyping);

  // Resolve typing user names from conversation profiles
  const typingNames = typingUserPrincipals
    .filter((p) => p !== myPrincipal)
    .map((p) => {
      if (p === otherParticipant?.toString()) {
        return (
          conversation?.otherParticipantProfile?.name ||
          targetUserProfile?.name ||
          "Someone"
        );
      }
      return "Someone";
    })
    .filter(Boolean);

  // Update last active every 60 seconds
  // biome-ignore lint/correctness/useExhaustiveDependencies: run on mount only
  useEffect(() => {
    updateLastActive.mutate();
    const interval = setInterval(() => updateLastActive.mutate(), 60000);
    return () => clearInterval(interval);
  }, []);

  // Mark entire conversation as read on mount and when new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only when conversation id changes
  useEffect(() => {
    if (!conversation?.id) return;
    markConversationRead.mutate(conversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

  // Also mark read when messages count changes (new messages arrived)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only when message count changes
  useEffect(() => {
    if (!conversation?.id || !conversation.messages.length) return;
    markConversationRead.mutate(conversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.messages.length]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: conversation.messages is the correct dep for scroll-to-bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  // Refetch when desktop tab becomes visible again (Page Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchConversations();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refetchConversations]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!emojiPickerForId) return;
    const handler = () => setEmojiPickerForId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [emojiPickerForId]);

  const setTypingMutate = setTyping.mutate;

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (conversation?.id) {
        setTypingMutate({ conversationId: conversation.id, isTyping: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, setTypingMutate]);

  const handleTypingInput = useCallback(
    (value: string) => {
      setMessageText(value);
      if (!conversation?.id) return;
      // Send typing=true immediately
      setTypingMutate({ conversationId: conversation.id, isTyping: true });
      // Reset the stop-typing timer
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingMutate({ conversationId: conversation.id, isTyping: false });
      }, TYPING_STOP_DELAY);
    },
    [conversation?.id, setTypingMutate],
  );

  const stopTyping = useCallback(() => {
    if (!conversation?.id) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingMutate({ conversationId: conversation.id, isTyping: false });
  }, [conversation?.id, setTypingMutate]);

  // Filtered messages for search mode
  const allMessages = conversation?.messages as ExtendedMessage[] | undefined;
  const filteredMessages =
    showSearch && searchTerm.trim()
      ? (allMessages ?? []).filter(
          (m) =>
            m.content.__kind__ === "text" &&
            m.content.text.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : allMessages;

  const getMessageSnippet = (msg: ExtendedMessage) => {
    if (msg.content.__kind__ === "text") {
      return msg.content.text.slice(0, 50);
    }
    if (msg.content.__kind__ === "image") return "📷 Image";
    if (msg.content.__kind__ === "video") return "🎥 Video";
    if (msg.content.__kind__ === "voice") return "🎤 Voice message";
    return "Message";
  };

  // Find the original snippet for a replyToId
  const getReplySnippet = (replyToId: bigint | null | undefined): string => {
    if (!replyToId || !conversation) return "Original message";
    const orig = (conversation.messages as ExtendedMessage[]).find(
      (m) => m.id === replyToId,
    );
    return orig ? getMessageSnippet(orig) : "Original message";
  };

  const handleSendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !otherParticipant) return;
    const content: MessageType = { __kind__: "text", text: messageText.trim() };
    try {
      stopTyping();
      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content,
        replyToId: replyTo?.id,
      });
      setMessageText("");
      setReplyTo(null);
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !otherParticipant) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    try {
      setUploadProgress(0);
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(await file.arrayBuffer()),
      ).withUploadProgress((p) => setUploadProgress(p));
      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content: { __kind__: "image", image: blob },
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
      toast.success("Image sent!");
    } catch {
      toast.error("Failed to send image");
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !otherParticipant) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    const warning = getVideoUploadWarning(file);
    if (warning) toast.warning(warning, { duration: 5000 });
    try {
      setUploadProgress(0);
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(await file.arrayBuffer()),
      ).withUploadProgress((p) => setUploadProgress(p));
      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content: { __kind__: "video", video: blob },
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
      toast.success("Video sent!");
    } catch {
      toast.error("Failed to send video");
    } finally {
      setUploadProgress(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleVoiceRecorded = async (audioBlob: Blob) => {
    if (!otherParticipant) return;
    try {
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(await audioBlob.arrayBuffer()),
      );
      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content: { __kind__: "voice", voice: blob },
      });
      setShowVoiceRecorder(false);
      toast.success("Voice message sent!");
    } catch {
      toast.error("Failed to send voice message");
    }
  };

  const handleVideoRecorded = async (videoBlob: Blob) => {
    if (!otherParticipant) return;
    try {
      const blob = ExternalBlob.fromBytes(
        new Uint8Array(await videoBlob.arrayBuffer()),
      );
      await sendMessage.mutateAsync({
        receiver: otherParticipant,
        content: { __kind__: "video", video: blob },
      });
      setShowVideoRecorder(false);
      toast.success("Video message sent!");
    } catch {
      toast.error("Failed to send video message");
    }
  };

  const handleRoseGift = async (amount: number) => {
    if (!otherParticipant) return;
    await sendMessage.mutateAsync({
      receiver: otherParticipant,
      content: { __kind__: "rose", rose: amount },
    });
  };

  const handleLeaveConversation = async () => {
    if (!conversation) return;
    try {
      await leaveConversation.mutateAsync(conversation.id);
      toast.success("Left conversation");
      navigate({ to: "/chats" });
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to leave conversation");
    }
  };

  const handleBlockUser = async () => {
    if (!otherParticipant) return;
    try {
      await blockUser.mutateAsync(otherParticipant);
      toast.success("User blocked");
      navigate({ to: "/chats" });
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to block user");
    }
  };

  const handleUnblockUser = async () => {
    if (!otherParticipant) return;
    try {
      await unblockUser.mutateAsync(otherParticipant);
      toast.success("User unblocked");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to unblock user");
    }
  };

  const handleEditMessage = async (msg: ExtendedMessage) => {
    if (!conversation) return;
    if (!editText.trim()) return;
    try {
      await editMessage.mutateAsync({
        conversationId: conversation.id,
        messageId: msg.id,
        newText: editText.trim(),
      });
      setEditingMessageId(null);
      setEditText("");
      toast.success("Message edited");
    } catch {
      toast.error("Failed to edit message");
    }
  };

  const handleDeleteMessage = async (msg: ExtendedMessage) => {
    if (!conversation) return;
    try {
      await deleteMessage.mutateAsync({
        conversationId: conversation.id,
        messageId: msg.id,
      });
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleForwardMessage = async (
    msg: ExtendedMessage,
    target: ForwardTarget,
  ) => {
    if (!conversation) return;
    try {
      if (target.kind === "conversation") {
        await forwardMessage.mutateAsync({
          sourceConversationId: conversation.id,
          messageId: msg.id,
          targetConversationId: target.id,
        });
      } else {
        await forwardMessage.mutateAsync({
          sourceConversationId: conversation.id,
          messageId: msg.id,
          targetGroupId: target.id,
        });
      }
      toast.success(`Forwarded to ${target.name}`);
    } catch {
      toast.error("Failed to forward message");
    }
  };

  const handleReactToMessage = async (msg: ExtendedMessage, emoji: string) => {
    if (!otherParticipant) return;
    try {
      await reactToMessage.mutateAsync({
        receiver: otherParticipant,
        messageId: msg.id,
        emoji,
      });
    } catch {
      // Silent fail — reaction is a nice-to-have
    }
  };

  const handlePinMessage = async (msg: ExtendedMessage) => {
    if (!otherParticipant) return;
    try {
      await pinConversationMessage.mutateAsync({
        other: otherParticipant,
        messageId: msg.id,
      });
      toast.success("Message pinned");
    } catch {
      toast.error("Failed to pin message");
    }
  };

  const handleUnpinMessage = async () => {
    if (!otherParticipant) return;
    try {
      await unpinConversationMessage.mutateAsync(otherParticipant);
      toast.success("Message unpinned");
    } catch {
      toast.error("Failed to unpin message");
    }
  };

  const renderMessage = (message: ExtendedMessage) => {
    const isOwn = message.sender.toString() === myPrincipal;
    const senderProfile = message.senderProfile;
    const senderName =
      senderProfile?.name || `${message.sender.toString().slice(0, 12)}...`;
    const avatarUrl = senderProfile?.profilePicture?.getDirectURL();
    const mediaExpired = isMediaExpired(message.timestamp);
    const isEditing = editingMessageId === message.id;
    const reactions = message.reactions ?? [];
    const isThisPinned = pinnedMessage?.id === message.id;
    const replyToId = message.replyToId ?? null;
    const showEmojiPicker = emojiPickerForId === message.id;

    return (
      <div
        key={message.id.toString()}
        data-message-id={message.id.toString()}
        className={`flex gap-2 mb-3 sm:mb-4 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isOwn && (
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={senderName} />
            ) : null}
            <AvatarFallback className="text-[10px] sm:text-xs">
              {senderName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[75%] sm:max-w-[70%]`}
        >
          <div
            className={`flex items-center gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Message bubble with single-tap emoji reaction */}
            <div className="relative">
              <div
                className={`${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg p-2 sm:p-3 min-w-0 cursor-pointer select-none`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!message.isDeleted && !isEditing) {
                    setEmojiPickerForId(
                      emojiPickerForId === message.id ? null : message.id,
                    );
                  }
                }}
              >
                {/* Reply quote */}
                {replyToId && !message.isDeleted && (
                  <ReplyQuoteBlock text={getReplySnippet(replyToId)} />
                )}

                {message.isDeleted ? (
                  <p className="text-xs sm:text-sm italic text-muted-foreground">
                    [Message deleted]
                  </p>
                ) : isEditing ? (
                  <div className="flex gap-2 min-w-[200px]">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 text-xs h-7 bg-background/20 border-0 text-inherit placeholder:text-inherit/60"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditMessage(message);
                        if (e.key === "Escape") {
                          setEditingMessageId(null);
                          setEditText("");
                        }
                      }}
                      data-ocid="msg-edit-input"
                    />
                    <button
                      type="button"
                      onClick={() => handleEditMessage(message)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessageId(null);
                        setEditText("");
                      }}
                      className="text-muted-foreground/70 hover:text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {message.content.__kind__ === "text" &&
                      (containsProfileLink(message.content.text) ? (
                        <ProfileLinkMessageText text={message.content.text} />
                      ) : showSearch && searchTerm ? (
                        <p className="text-xs sm:text-sm break-words">
                          <HighlightText
                            text={message.content.text}
                            term={searchTerm}
                          />
                        </p>
                      ) : (
                        <p className="text-xs sm:text-sm break-words">
                          {message.content.text}
                        </p>
                      ))}
                    {message.content.__kind__ === "image" &&
                      (mediaExpired ? (
                        <ExpiredMediaPlaceholder
                          mediaType="image"
                          className="max-w-full"
                        />
                      ) : (
                        <img
                          src={message.content.image.getDirectURL()}
                          alt="Shared media"
                          className="max-w-full rounded max-h-64 sm:max-h-96 object-contain"
                        />
                      ))}
                    {message.content.__kind__ === "video" &&
                      (mediaExpired ? (
                        <ExpiredMediaPlaceholder
                          mediaType="video"
                          className="max-w-full"
                        />
                      ) : (
                        <EnhancedVideoPlayer
                          src={message.content.video.getDirectURL()}
                        />
                      ))}
                    {message.content.__kind__ === "voice" &&
                      (mediaExpired ? (
                        <ExpiredMediaPlaceholder
                          mediaType="voice"
                          className="max-w-full"
                        />
                      ) : (
                        <EnhancedAudioPlayer
                          src={message.content.voice.getDirectURL()}
                          type="voice"
                        />
                      ))}
                    {message.content.__kind__ === "media" &&
                      (mediaExpired ? (
                        <ExpiredMediaPlaceholder
                          mediaType="media"
                          className="max-w-full"
                        />
                      ) : (
                        <EnhancedAudioPlayer
                          src={message.content.media.getDirectURL()}
                          type="media"
                        />
                      ))}
                    {message.content.__kind__ === "rose" && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🌹</span>
                        <span className="font-semibold">
                          {message.content.rose.toFixed(2)} Roses
                        </span>
                      </div>
                    )}
                    {message.content.__kind__ === "receipt" && (
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="font-semibold">Transaction Receipt</p>
                        <p>{message.content.receipt.summary}</p>
                        <p className="text-[10px] sm:text-xs opacity-75">
                          Fee: {message.content.receipt.fee.toFixed(2)} ROSES
                        </p>
                      </div>
                    )}
                    {message.content.__kind__ === "tradeRequest" && (
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="font-semibold">Trade Request</p>
                        <p>{message.content.tradeRequest.summary}</p>
                      </div>
                    )}
                    {message.content.__kind__ === "forwardedPost" && (
                      <div className="space-y-2 text-xs sm:text-sm">
                        <p className="font-semibold flex items-center gap-1">
                          <ForwardIcon className="h-3 w-3" />
                          Forwarded Post
                        </p>
                        <div className="bg-background/50 rounded p-2">
                          {message.content.forwardedPost.image && (
                            <img
                              src={message.content.forwardedPost.image.getDirectURL()}
                              alt="Post"
                              className="w-full rounded mb-2 max-h-32 object-cover"
                            />
                          )}
                          <p className="line-clamp-3">
                            {message.content.forwardedPost.contentSnippet}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Emoji picker overlay */}
              {showEmojiPicker && !message.isDeleted && (
                <EmojiReactionPicker
                  isOwn={isOwn}
                  onSelect={(emoji) => handleReactToMessage(message, emoji)}
                  onClose={() => setEmojiPickerForId(null)}
                />
              )}
            </div>

            {/* Action button */}
            {!message.isDeleted && (
              <div className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <MessageActions
                  message={message}
                  isOwn={isOwn}
                  isPinned={isThisPinned}
                  onEdit={() => {
                    setEditingMessageId(message.id);
                    setEditText(
                      message.content.__kind__ === "text"
                        ? message.content.text
                        : "",
                    );
                  }}
                  onDelete={() => handleDeleteMessage(message)}
                  onForward={() => setForwardingMessage(message)}
                  onReply={() =>
                    setReplyTo({
                      id: message.id,
                      snippet: getMessageSnippet(message),
                    })
                  }
                  onPin={() => handlePinMessage(message)}
                  onUnpin={handleUnpinMessage}
                />
              </div>
            )}
          </div>

          {/* Reactions */}
          {reactions.length > 0 && <ReactionBadges reactions={reactions} />}

          <div
            className={`flex items-center gap-1.5 mt-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
          >
            <span className="text-[10px] text-muted-foreground">
              {new Date(
                Number(message.timestamp) / 1_000_000,
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {message.isEdited && !message.isDeleted && (
              <span className="text-[10px] text-muted-foreground italic">
                (edited)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!identity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Login Required</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-muted-foreground text-sm">
              Please log in to view conversations
            </p>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <Skeleton className="h-12 w-full mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!conversation && !isNewChatFlow) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              Conversation not found
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={() => navigate({ to: "/chats" })}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chats
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayProfile =
    conversation?.otherParticipantProfile || targetUserProfile;
  const displayName =
    displayProfile?.name ||
    `${otherParticipant?.toString().slice(0, 12)}...` ||
    "Unknown";
  const displayAvatar = displayProfile?.profilePicture?.getDirectURL();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-4 py-3 sm:py-4 flex flex-col shrink-0 gap-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/chats" })}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Avatar
              className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 cursor-pointer"
              onClick={() =>
                otherParticipant &&
                navigate({
                  to: "/users/$userId",
                  params: { userId: otherParticipant.toString() },
                })
              }
            >
              {displayAvatar ? <AvatarImage src={displayAvatar} /> : null}
              <AvatarFallback className="text-xs sm:text-sm">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2
                  className="font-semibold text-sm sm:text-base truncate cursor-pointer hover:underline"
                  onClick={() =>
                    otherParticipant &&
                    navigate({
                      to: "/users/$userId",
                      params: { userId: otherParticipant.toString() },
                    })
                  }
                >
                  {displayName}
                </h2>
                {isOtherOnline && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0 animate-pulse"
                    aria-label="Online"
                  />
                )}
              </div>
              {displayProfile?.username && (
                <p className="text-xs text-muted-foreground truncate">
                  @{displayProfile.username}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Search toggle button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowSearch((v) => !v);
                if (showSearch) setSearchTerm("");
              }}
              className="shrink-0"
              aria-label="Search messages"
              data-ocid="msg-search-toggle"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conversation && (
                  <DropdownMenuItem onClick={() => setShowLeaveDialog(true)}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Conversation
                  </DropdownMenuItem>
                )}
                {isBlocked ? (
                  <DropdownMenuItem onClick={() => setShowUnblockDialog(true)}>
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Unblock User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setShowBlockDialog(true)}
                    className="text-destructive"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Block User
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Inline search bar (slides down when active) */}
        {showSearch && (
          <div className="mt-2 flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              // biome-ignore lint/a11y/noAutofocus: intentional UX — user clicked the search button
              autoFocus
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              data-ocid="msg-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pinned message banner */}
      {pinnedMessage && !pinnedMessage.isDeleted && (
        <div
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-rose-50 border-b border-rose-100 shrink-0 cursor-pointer"
          onClick={() => {
            const el = document.querySelector(
              `[data-message-id="${pinnedMessage.id.toString()}"]`,
            );
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const el = document.querySelector(
                `[data-message-id="${pinnedMessage.id.toString()}"]`,
              );
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
          aria-label="Scroll to pinned message"
        >
          <Pin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-700 flex-1 truncate">
            <span className="font-medium">Pinned: </span>
            {pinnedMessage.content.__kind__ === "text"
              ? pinnedMessage.content.text.slice(0, 80)
              : pinnedMessage.content.__kind__ === "image"
                ? "📷 Image"
                : pinnedMessage.content.__kind__ === "video"
                  ? "🎥 Video"
                  : pinnedMessage.content.__kind__ === "voice"
                    ? "🎤 Voice message"
                    : "Pinned message"}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleUnpinMessage();
            }}
            className="text-rose-500 hover:text-rose-700 text-xs font-medium shrink-0"
            data-ocid="conversation.unpin_button"
          >
            Unpin
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2">
        {/* Search empty state — shown when search is active but no messages match */}
        {showSearch && searchTerm && (filteredMessages ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">
              No messages match &quot;{searchTerm}&quot;
            </p>
          </div>
        ) : conversation && (filteredMessages ?? []).length > 0 ? (
          <>
            {(filteredMessages ?? []).map(renderMessage)}
            {/* Typing indicator */}
            {typingNames.length > 0 && <TypingBubble names={typingNames} />}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="max-w-md space-y-4">
              <div className="text-4xl sm:text-5xl mb-4">💬</div>
              <h3 className="text-lg sm:text-xl font-semibold">
                Start a new conversation
              </h3>
              <p className="text-sm text-muted-foreground">
                Send a message to {displayName} to start chatting
              </p>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/chats" })}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chats
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Message Input Area */}
      <div className="border-t bg-card px-3 sm:px-4 py-3 sm:py-4 shrink-0">
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-rose-50 border border-rose-100 rounded-lg">
            <CornerUpLeft className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <p className="text-xs text-rose-700 flex-1 truncate">
              Replying to: {replyTo.snippet}
            </p>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {uploadProgress !== null && (
          <div className="mb-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={!otherParticipant || uploadProgress !== null}
              className="shrink-0"
            >
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => videoInputRef.current?.click()}
              disabled={!otherParticipant || uploadProgress !== null}
              className="shrink-0"
            >
              <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowVoiceRecorder(true)}
              disabled={!otherParticipant}
              className="shrink-0"
            >
              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowVideoRecorder(true)}
              disabled={!otherParticipant}
              className="shrink-0"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowRoseGift(true)}
              disabled={!otherParticipant}
              className="shrink-0"
            >
              <span className="text-base sm:text-lg">🌹</span>
            </Button>
          </div>
          <form onSubmit={handleSendTextMessage} className="flex-1 flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => handleTypingInput(e.target.value)}
              placeholder="Type a message..."
              disabled={!otherParticipant || sendMessage.isPending}
              className="flex-1 text-base"
              data-ocid="msg-input"
            />
            <Button
              type="submit"
              size="icon"
              disabled={
                !messageText.trim() ||
                !otherParticipant ||
                sendMessage.isPending
              }
              className="shrink-0"
              data-ocid="msg-send-btn"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Modals */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onRecorded={handleVoiceRecorded}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}
      {showVideoRecorder && (
        <VideoRecorder
          onRecorded={handleVideoRecorded}
          onCancel={() => setShowVideoRecorder(false)}
        />
      )}
      {showRoseGift && otherParticipant && (
        <RoseGiftModal
          open={showRoseGift}
          recipientName={displayName}
          currentBalance={roseBalance || 0}
          onGift={handleRoseGift}
          onClose={() => setShowRoseGift(false)}
        />
      )}

      {/* Forward Modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          open={!!forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          onForward={(target) => {
            if (forwardingMessage)
              handleForwardMessage(
                forwardingMessage as ExtendedMessage,
                target,
              );
          }}
          conversations={
            conversations?.filter((c) => c.id !== conversation?.id) ?? []
          }
          groups={groups}
        />
      )}

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this conversation? You can always
              start a new one later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveConversation}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block {displayName}? You will no longer
              see their content and they won&apos;t be able to contact you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unblock {displayName}? They will be able
              to contact you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockUser}>
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
