import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, MessageCircle, Plus, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import CreateGroupChatModal from "../components/CreateGroupChatModal";
import CreateStoryModal from "../components/CreateStoryModal";
import { LazyImage } from "../components/LazyImage";
import { ShimmerSkeleton } from "../components/ShimmerSkeleton";
import StoriesCarousel from "../components/StoriesCarousel";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetActiveStories,
  useGetConversations,
  useGetGroupChats,
  useGetUnreadCounts,
} from "../hooks/useQueries";

const STORIES_PAGE_SIZE = 9;
const GROUPS_PAGE_SIZE = 9;
const CONVOS_PAGE_SIZE = 9;

export default function ChatsPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();

  const currentPrincipal = identity?.getPrincipal().toString();

  const { data: conversations = [], isLoading: convsLoading } =
    useGetConversations();
  const { data: groupChats = [], isLoading: groupsLoading } =
    useGetGroupChats();
  const { data: activeStories = [], isLoading: storiesLoading } =
    useGetActiveStories();
  const { data: unreadCounts } = useGetUnreadCounts();

  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Pagination state
  const [visibleStoryAuthors, setVisibleStoryAuthors] =
    useState(STORIES_PAGE_SIZE);
  const [visibleGroups, setVisibleGroups] = useState(GROUPS_PAGE_SIZE);
  const [visibleConvos, setVisibleConvos] = useState(CONVOS_PAGE_SIZE);

  // Build lookup maps for unread counts
  const directUnreadMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of unreadCounts?.direct ?? []) {
      map.set(item.conversationId.toString(), Number(item.unreadCount));
    }
    return map;
  }, [unreadCounts]);

  const groupUnreadMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of unreadCounts?.groups ?? []) {
      map.set(item.groupId.toString(), Number(item.unreadCount));
    }
    return map;
  }, [unreadCounts]);

  // Group stories by author to count unique story authors
  const storiesByAuthor = React.useMemo(() => {
    const map = new Map<string, typeof activeStories>();
    for (const story of activeStories) {
      const key = story.author.toString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(story);
    }
    return Array.from(map.keys());
  }, [activeStories]);

  // Slice stories to only show those belonging to the first N authors
  const visibleStoryAuthorSet = React.useMemo(
    () => new Set(storiesByAuthor.slice(0, visibleStoryAuthors)),
    [storiesByAuthor, visibleStoryAuthors],
  );

  const _slicedStories = React.useMemo(
    () =>
      activeStories.filter((s) =>
        visibleStoryAuthorSet.has(s.author.toString()),
      ),
    [activeStories, visibleStoryAuthorSet],
  );

  // Sort conversations: most recent first
  const sortedConversations = React.useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aMessages = a.messages || [];
      const bMessages = b.messages || [];
      const aLastMsg = aMessages[aMessages.length - 1];
      const bLastMsg = bMessages[bMessages.length - 1];
      const aTime = aLastMsg ? Number(aLastMsg.timestamp) : 0;
      const bTime = bLastMsg ? Number(bLastMsg.timestamp) : 0;
      return bTime - aTime;
    });
  }, [conversations]);

  const getLastMessage = (conv: (typeof conversations)[0]) => {
    const msgs = conv.messages || [];
    if (msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  };

  const getMessagePreview = (conv: (typeof conversations)[0]) => {
    const last = getLastMessage(conv);
    if (!last) return "No messages yet";
    const content = last.content;
    if (content.__kind__ === "text") return content.text;
    if (content.__kind__ === "image") return "📷 Image";
    if (content.__kind__ === "video") return "🎥 Video";
    if (content.__kind__ === "voice") return "🎤 Voice message";
    if (content.__kind__ === "rose") return `🌹 ${content.rose} Roses`;
    if (content.__kind__ === "receipt") return "💳 Transaction";
    if (content.__kind__ === "tradeRequest") return "📊 Trade Request";
    if (content.__kind__ === "forwardedPost") return "📤 Forwarded post";
    return "Message";
  };

  const getDirectUnreadCount = (conv: (typeof conversations)[0]) => {
    // Use backend unread counts if available, otherwise fall back to simple heuristic
    const backendCount = directUnreadMap.get(conv.id.toString());
    if (backendCount !== undefined) return backendCount;
    // Fallback: check if last message sender is not current user
    const last = getLastMessage(conv);
    if (!last) return 0;
    return last.sender.toString() !== currentPrincipal ? 1 : 0;
  };

  const getGroupUnreadCount = (group: (typeof groupChats)[0]) => {
    return groupUnreadMap.get(group.id.toString()) ?? 0;
  };

  const getAvatarUrl = (profile?: {
    profilePicture?: { getDirectURL(): string };
  }) => {
    if (profile?.profilePicture) return profile.profilePicture.getDirectURL();
    return "/assets/generated/avatar-placeholder.dim_200x200.png";
  };

  const getGroupAvatarUrl = (group: (typeof groupChats)[0]) => {
    if (group.avatar) return group.avatar.getDirectURL();
    return "/assets/generated/group-avatar-placeholder.dim_200x200.png";
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60_000) return "now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return `${Math.floor(diff / 86_400_000)}d`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Stories Section */}
      <section className="pt-4 pb-2">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground">Stories</h2>
          <button
            onClick={() => setShowCreateStory(true)}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80 transition-opacity"
          >
            <Plus size={14} />
            Add Story
          </button>
        </div>

        {storiesLoading ? (
          <div className="flex gap-3 px-4 overflow-x-auto pb-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center gap-1"
              >
                <ShimmerSkeleton className="w-16 h-16 rounded-full" />
                <ShimmerSkeleton className="w-12 h-2 rounded" />
              </div>
            ))}
          </div>
        ) : activeStories.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            No active stories
          </div>
        ) : (
          <>
            {/* StoriesCarousel fetches its own data; we render it normally */}
            <StoriesCarousel />
            {storiesByAuthor.length > visibleStoryAuthors && (
              <div className="flex justify-center mt-2 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs gap-1"
                  onClick={() =>
                    setVisibleStoryAuthors((v) => v + STORIES_PAGE_SIZE)
                  }
                >
                  <ChevronDown size={14} />
                  View More Stories
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <div className="h-px bg-border mx-4" />

      {/* Conversations Section */}
      <section className="pt-4 pb-2">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <MessageCircle size={16} className="text-primary" />
            Messages
          </h2>
        </div>

        {convsLoading ? (
          <div className="space-y-2 px-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <ShimmerSkeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-1">
                  <ShimmerSkeleton className="h-3 w-1/2 rounded" />
                  <ShimmerSkeleton className="h-2 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          <>
            <div className="space-y-1 px-2">
              {sortedConversations.slice(0, visibleConvos).map((conv) => {
                const lastMsg = getLastMessage(conv);
                const unreadCount = getDirectUnreadCount(conv);
                const hasUnread = unreadCount > 0;
                const profile = conv.otherParticipantProfile;
                return (
                  <button
                    key={conv.id.toString()}
                    data-ocid="chats.direct.item"
                    onClick={() =>
                      navigate({
                        to: "/chats/$conversationId",
                        params: { conversationId: conv.id.toString() },
                      })
                    }
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <LazyImage
                        src={getAvatarUrl(profile)}
                        alt={profile?.name || "User"}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                        wrapperClassName="w-12 h-12 rounded-full"
                      />
                      {/* Unread count badge */}
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1 border-2 border-background">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm truncate ${
                            hasUnread
                              ? "font-bold text-foreground"
                              : "font-medium text-foreground"
                          }`}
                        >
                          {profile?.name || "Unknown User"}
                        </span>
                        {lastMsg && (
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            {formatTime(lastMsg.timestamp)}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs truncate ${
                          hasUnread
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {getMessagePreview(conv)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {sortedConversations.length > visibleConvos && (
              <div className="flex justify-center mt-2 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs gap-1"
                  onClick={() => setVisibleConvos((v) => v + CONVOS_PAGE_SIZE)}
                >
                  <ChevronDown size={14} />
                  View More Messages (
                  {sortedConversations.length - visibleConvos} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <div className="h-px bg-border mx-4" />

      {/* Groups Section — below Messages */}
      <section className="pt-4 pb-2">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Groups
          </h2>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80 transition-opacity"
          >
            <Plus size={14} />
            New Group
          </button>
        </div>

        {groupsLoading ? (
          <div className="space-y-2 px-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <ShimmerSkeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-1">
                  <ShimmerSkeleton className="h-3 w-1/2 rounded" />
                  <ShimmerSkeleton className="h-2 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : groupChats.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            No group chats yet
          </div>
        ) : (
          <>
            <div className="space-y-1 px-2">
              {groupChats.slice(0, visibleGroups).map((group) => {
                const groupUnread = getGroupUnreadCount(group);
                const hasGroupUnread = groupUnread > 0;
                return (
                  <button
                    key={group.id.toString()}
                    data-ocid="chats.group.item"
                    onClick={() =>
                      navigate({
                        to: "/groups/$groupId",
                        params: { groupId: group.id.toString() },
                      })
                    }
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <LazyImage
                        src={getGroupAvatarUrl(group)}
                        alt={group.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                        wrapperClassName="w-12 h-12 rounded-full"
                      />
                      {hasGroupUnread && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1 border-2 border-background">
                          {groupUnread > 9 ? "9+" : groupUnread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm truncate ${hasGroupUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}
                        >
                          {group.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {group.participants.length} members
                        </span>
                      </div>
                      <p
                        className={`text-xs truncate ${hasGroupUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      >
                        {group.admins.some(
                          (a) => a.toString() === currentPrincipal,
                        )
                          ? "👑 Admin"
                          : "👤 Member"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {groupChats.length > visibleGroups && (
              <div className="flex justify-center mt-2 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs gap-1"
                  onClick={() => setVisibleGroups((v) => v + GROUPS_PAGE_SIZE)}
                >
                  <ChevronDown size={14} />
                  View More Groups ({groupChats.length - visibleGroups}{" "}
                  remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Modals */}
      <CreateStoryModal
        open={showCreateStory}
        onClose={() => setShowCreateStory(false)}
      />
      <CreateGroupChatModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </div>
  );
}
