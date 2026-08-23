import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export type SearchResult = {
    __kind__: "postResult";
    postResult: {
        author: Principal;
        searchType: string;
        timestamp: Time;
        image?: ExternalBlob;
        contentSnippet: string;
        postId: string;
    };
} | {
    __kind__: "messageResult";
    messageResult: {
        messageId: bigint;
        senderProfile?: UserProfile;
        sender: Principal;
        searchType: string;
        conversationId: bigint;
        timestamp: Time;
        contentSnippet: string;
        receiver: Principal;
    };
} | {
    __kind__: "userResult";
    userResult: {
        principal: Principal;
        balance: number;
        searchType: string;
        profile: UserProfile;
    };
};
export interface ProfileWithPrincipal {
    principal: Principal;
    balance: number;
    profile: UserProfile;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export type Time = bigint;
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface GroupMessage {
    id: bigint;
    isDeleted: boolean;
    content: MessageType;
    senderProfile?: UserProfile;
    sender: Principal;
    groupId: bigint;
    isEdited: boolean;
    timestamp: Time;
    replyToId?: bigint;
    reactions: Array<[string, Array<Principal>]>;
    readBy: Array<Principal>;
}
export interface EmailPreferences {
    postGift: boolean;
    groupMessage: boolean;
    roseReceipt: boolean;
    tradeRequest: boolean;
    systemNotice: boolean;
    storyReaction: boolean;
    storyView: boolean;
    like: boolean;
    comment: boolean;
    groupAdd: boolean;
    message: boolean;
    roseGift: boolean;
    follow: boolean;
}
export interface CommentInteraction {
    id: bigint;
    parentCommentId?: bigint;
    user: Principal;
    comment: string;
    timestamp: Time;
    postId: string;
}
export interface BlockRecord {
    blocked: Principal;
    blocker: Principal;
    timestamp: Time;
}
export interface AnalyticsSummary {
    activeUsers: bigint;
    totalPlatformFees: number;
    totalRosesCirculating: number;
    totalRoseTransactions: bigint;
    totalMessages: bigint;
    totalUsers: bigint;
    totalRoseGifts: number;
    totalPosts: bigint;
}
export interface RoseTransaction {
    id: bigint;
    feeDistributed: number;
    transactionType: RoseTransactionType;
    sender?: Principal;
    timestamp: Time;
    amount: number;
    receiver?: Principal;
}
export interface GamePoolInfo {
    playerParticipation: number;
    pool: number;
    maxParticipation: number;
}
export interface TradeRequestMessage {
    requester: Principal;
    summary: string;
    timestamp: Time;
    amount: number;
    requestType: string;
}
export interface GroupChat {
    id: bigint;
    creator: Principal;
    participants: Array<Principal>;
    name: string;
    createdAt: Time;
    admins: Array<Principal>;
    avatar?: ExternalBlob;
}
export interface UnreadCounts {
    groups: Array<GroupUnreadCount>;
    direct: Array<DirectUnreadCount>;
}
export interface Post {
    id: string;
    content: string;
    embed?: string;
    author: Principal;
    viewCount: bigint;
    timestamp: Time;
    image?: ExternalBlob;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface UserAnalytics {
    giftsReceived: bigint;
    postCount: bigint;
    roseBalance: number;
    reactionsReceived: bigint;
    messageCount: bigint;
}
export interface PoolOverview {
    totalProviders: bigint;
    ownPosition?: ProviderPosition;
    totalPoolValue: number;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface SpinResult {
    stake: number;
    outcome: SpinOutcome;
    payout: number;
    poolAfter: number;
}
export interface PlatformStats {
    totalMessages: bigint;
    totalUsers: bigint;
    totalInteractions: bigint;
    totalPosts: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface Story {
    id: bigint;
    content: MessageType;
    expiresAt: Time;
    author: Principal;
    viewCount: bigint;
    viewedBy: Array<Principal>;
    timestamp: Time;
    caption?: string;
    reactions: Array<[string, Array<Principal>]>;
}
export interface SpinRecord {
    id: bigint;
    username: string;
    player: Principal;
    stake: number;
    timestamp: bigint;
    outcome: SpinOutcome;
    payout: number;
}
export interface GroupUnreadCount {
    groupId: bigint;
    unreadCount: bigint;
}
export type MessageType = {
    __kind__: "media";
    media: ExternalBlob;
} | {
    __kind__: "tradeRequest";
    tradeRequest: TradeRequestMessage;
} | {
    __kind__: "receipt";
    receipt: ReceiptMessage;
} | {
    __kind__: "video";
    video: ExternalBlob;
} | {
    __kind__: "voice";
    voice: ExternalBlob;
} | {
    __kind__: "rose";
    rose: number;
} | {
    __kind__: "text";
    text: string;
} | {
    __kind__: "image";
    image: ExternalBlob;
} | {
    __kind__: "forwardedPost";
    forwardedPost: {
        author: Principal;
        timestamp: Time;
        image?: ExternalBlob;
        contentSnippet: string;
        postId: string;
    };
};
export interface HttpHeader {
    value: string;
    name: string;
}
export interface ReceiptMessage {
    fee: number;
    sender: Principal;
    summary: string;
    timestamp: Time;
    amount: number;
    receiver: Principal;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface ProviderPosition {
    provider: Principal;
    sharePct: number;
    profitLoss: number;
    portion: number;
    contribution: number;
}
export interface NotificationCount {
    groupAddCount: bigint;
    storyViewCount: bigint;
    likeCount: bigint;
    roseGiftCount: bigint;
    systemCount: bigint;
    totalCount: bigint;
    followCount: bigint;
    unreadCount: bigint;
    messageCount: bigint;
    roseReceiptCount: bigint;
    commentCount: bigint;
    storyReactionCount: bigint;
    tradeRequestCount: bigint;
    postGiftCount: bigint;
    groupMessageCount: bigint;
}
export type SpinOutcome = {
    __kind__: "win";
    win: number;
} | {
    __kind__: "loss";
    loss: number;
};
export interface Notification {
    id: bigint;
    linkedId?: string;
    content: string;
    userId: Principal;
    notificationType: NotificationType;
    isRead: boolean;
    timestamp: Time;
    linkedType?: string;
}
export interface ProfileFilter {
    country?: string;
    minAge?: bigint;
    onlineOnly?: boolean;
    gender?: string;
    maxAge?: bigint;
    minBalance?: number;
}
export interface Message {
    id: bigint;
    isDeleted: boolean;
    content: MessageType;
    senderProfile?: UserProfile;
    sender: Principal;
    isEdited: boolean;
    timestamp: Time;
    replyToId?: bigint;
    receiver: Principal;
    reactions: Array<[string, Array<Principal>]>;
    readBy: Array<Principal>;
}
export interface DirectUnreadCount {
    conversationId: bigint;
    unreadCount: bigint;
}
export interface Conversation {
    id: bigint;
    participants: Array<Principal>;
    messages: Array<Message>;
    otherParticipantProfile?: UserProfile;
}
export interface UserProfile {
    bio?: string;
    country: string;
    username: string;
    birthYear?: bigint;
    name: string;
    email?: string;
    emailPreferences?: EmailPreferences;
    gender?: string;
    profilePicture?: ExternalBlob;
}
export enum NotificationType {
    postGift = "postGift",
    groupMessage = "groupMessage",
    roseReceipt = "roseReceipt",
    tradeRequest = "tradeRequest",
    systemNotice = "systemNotice",
    storyReaction = "storyReaction",
    storyView = "storyView",
    like = "like",
    comment = "comment",
    groupAdd = "groupAdd",
    message = "message",
    roseGift = "roseGift",
    follow = "follow"
}
export enum RoseTransactionType {
    buy = "buy",
    fee = "fee",
    charityClaim = "charityClaim",
    gift = "gift",
    mint = "mint",
    sell = "sell",
    charityDonate = "charityDonate",
    transfer = "transfer"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_invalidDedupId_duplicate {
    invalidDedupId = "invalidDedupId",
    duplicate = "duplicate"
}
export interface backendInterface {
    addGroupParticipant(groupId: bigint, newParticipant: Principal): Promise<void>;
    adminDepositToPool(amount: number): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminWithdrawFromPool(amount: number): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(userToBlock: Principal): Promise<void>;
    buyRosesFromUser(seller: Principal, amount: number): Promise<void>;
    claimAllRoses(): Promise<void>;
    /**
     * / Claim 0.01 Rose from the charity pool once every 24 hours.
     * / The 5% fee is applied: caller receives 0.01 * 0.95 = 0.0095 Roses after fee.
     */
    claimDailyCharity(): Promise<string>;
    cleanupExpiredStories(): Promise<bigint>;
    clearAllNotifications(): Promise<void>;
    commentOnPost(postId: string, comment: string, parentCommentId: bigint | null): Promise<void>;
    convertBalanceToUsd(amount: number): Promise<number>;
    convertBalanceToUsdQuery(amount: number): Promise<number>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createGroupChat(name: string, initialParticipants: Array<Principal>, avatar: ExternalBlob | null): Promise<bigint>;
    createPost(content: string, image: ExternalBlob | null, embed: string | null): Promise<void>;
    createStory(content: MessageType, caption: string | null): Promise<bigint>;
    deleteCallerProfile(): Promise<void>;
    deleteComment(postId: string, commentId: bigint): Promise<void>;
    deleteGroupMessage(groupId: bigint, messageId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteMessage(conversationId: bigint, messageId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteNotification(notificationId: bigint): Promise<void>;
    deletePost(postId: string): Promise<void>;
    depositToGame(amount: number): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    depositToPool(amount: number): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Donate `amount` Roses to the charity pool.
     * / The standard 5% platform fee is applied: fee is distributed pro-rata to
     * / all holders, and the net (amount * 0.95) goes into charityPool.
     */
    donateToCharity(amount: number): Promise<string>;
    editGroupMessage(groupId: bigint, messageId: bigint, newText: string): Promise<{
        __kind__: "ok";
        ok: GroupMessage;
    } | {
        __kind__: "err";
        err: string;
    }>;
    editMessage(conversationId: bigint, messageId: bigint, newText: string): Promise<{
        __kind__: "ok";
        ok: Message;
    } | {
        __kind__: "err";
        err: string;
    }>;
    editPost(postId: string, content: string, image: ExternalBlob | null, embed: string | null): Promise<void>;
    execute(qJson: string): Promise<Result>;
    filterProfiles(filter: ProfileFilter, limit: bigint, offset: bigint): Promise<Array<ProfileWithPrincipal>>;
    followUser(targetUser: Principal): Promise<void>;
    forwardGroupMessageToConversation(sourceGroupId: bigint, messageId: bigint, targetConversationId: bigint): Promise<{
        __kind__: "ok";
        ok: Message;
    } | {
        __kind__: "err";
        err: string;
    }>;
    forwardMessage(sourceConversationId: bigint, messageId: bigint, targetConversationId: bigint): Promise<{
        __kind__: "ok";
        ok: Message;
    } | {
        __kind__: "err";
        err: string;
    }>;
    forwardMessageToGroup(sourceConversationId: bigint, messageId: bigint, targetGroupId: bigint): Promise<{
        __kind__: "ok";
        ok: GroupMessage;
    } | {
        __kind__: "err";
        err: string;
    }>;
    forwardPostToConversation(postId: string, conversationId: bigint): Promise<void>;
    getActiveStories(): Promise<Array<Story>>;
    getAllBlockRecords(): Promise<Array<BlockRecord>>;
    getAllRoseTransactions(): Promise<Array<RoseTransaction>>;
    getAllUserProfiles(): Promise<Array<[Principal, UserProfile]>>;
    getAnalyticsSummary(): Promise<AnalyticsSummary>;
    getBlockedUsers(): Promise<Array<Principal>>;
    getCallerEmailPreferences(): Promise<{
        email?: string;
        preferences?: EmailPreferences;
    }>;
    getCallerPosts(limit: bigint, offset: bigint): Promise<Array<Post>>;
    getCallerUserAnalytics(): Promise<{
        __kind__: "ok";
        ok: UserAnalytics;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getCallerUserProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Returns the current charity pool balance and the caller's last claim timestamp.
     */
    getCharityInfo(): Promise<{
        pool: number;
        lastClaimTime?: bigint;
    }>;
    getConversations(): Promise<Array<Conversation>>;
    getFollowerCount(targetUser: Principal): Promise<bigint>;
    getFollowingCount(targetUser: Principal): Promise<bigint>;
    getGameHistory(): Promise<Array<SpinRecord>>;
    getGamePool(): Promise<GamePoolInfo>;
    getGroupChats(): Promise<Array<GroupChat>>;
    getGroupDetails(groupId: bigint): Promise<GroupChat>;
    getGroupMessages(groupId: bigint): Promise<Array<GroupMessage>>;
    getGroupTypingUsers(groupId: bigint): Promise<Array<Principal>>;
    getIcpUsdExchangeRate(): Promise<number>;
    getLastSeen(userId: Principal): Promise<bigint | null>;
    getNotificationCountByType(): Promise<NotificationCount>;
    getNotifications(limit: bigint, offset: bigint): Promise<{
        total: bigint;
        notifications: Array<Notification>;
    }>;
    getOnlineUsers(): Promise<Array<Principal>>;
    /**
     * / Returns the pinned message for a direct conversation, or null if none is pinned.
     */
    getPinnedConversationMessage(other: Principal): Promise<Message | null>;
    /**
     * / Returns the pinned group message, or null if none is pinned.
     */
    getPinnedGroupMessage(groupId: bigint): Promise<GroupMessage | null>;
    getPinnedStories(userId: Principal): Promise<Array<Story>>;
    getPinnedTrendingPost(): Promise<Post | null>;
    getPlatformStats(): Promise<PlatformStats>;
    getPoolOverview(): Promise<PoolOverview>;
    getPostComments(postId: string): Promise<Array<CommentInteraction>>;
    getPostCountByUser(userId: Principal): Promise<bigint>;
    getPostInteractions(postId: string): Promise<{
        totalRosesGifted: number;
        forwards: bigint;
        likes: bigint;
        saves: bigint;
        comments: bigint;
        roseGifts: bigint;
    }>;
    getPostViewCount(postId: string): Promise<bigint>;
    getPosts(limit: bigint, offset: bigint): Promise<Array<Post>>;
    getPostsFromFollowedUsers(): Promise<Array<Post>>;
    getProviderPosition(): Promise<ProviderPosition | null>;
    getRoseBalance(): Promise<number>;
    getRoseSummary(): Promise<{
        totalCirculating: number;
        feeRewards: number;
        userBalance: number;
    }>;
    getRoseTransactionHistory(): Promise<Array<RoseTransaction>>;
    getSavedPosts(limit: bigint, offset: bigint): Promise<Array<Post>>;
    getStoryReactions(storyId: bigint): Promise<Array<[string, Array<Principal>]>>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getTotalCirculatingRoses(): Promise<number>;
    getTypingUsers(conversationId: bigint): Promise<Array<Principal>>;
    getUnreadCounts(): Promise<UnreadCounts>;
    getUnreadNotificationCount(): Promise<bigint>;
    getUserByUsername(username: string): Promise<Principal | null>;
    getUserPosts(userId: Principal, limit: bigint, offset: bigint): Promise<Array<Post>>;
    getUserProfile(arg0: {
        profileId: Principal;
    }): Promise<UserProfile>;
    getUserRoseBalance(user: Principal): Promise<number>;
    getUserStories(userId: Principal): Promise<Array<Story>>;
    giftRoses(receiver: Principal, amount: number): Promise<void>;
    giftRosesOnPost(postId: string, amount: number): Promise<void>;
    giftRosesOnStory(storyId: bigint, amount: number): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(targetUser: Principal): Promise<boolean>;
    isOnline(userId: Principal): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    isUserBlocked(user: Principal): Promise<boolean>;
    leaveConversation(conversationId: bigint): Promise<void>;
    leaveGroup(groupId: bigint): Promise<void>;
    likePost(postId: string): Promise<void>;
    markAllNotificationsAsRead(): Promise<void>;
    markConversationRead(conversationId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    markGroupChatRead(groupId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    markGroupMessageRead(groupId: bigint, messageId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    markMessageRead(sender: Principal, messageId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    markNotificationAsRead(notificationId: bigint): Promise<void>;
    markStoryAsViewed(storyId: bigint): Promise<void>;
    /**
     * / Pin a message in a direct conversation. Any participant can pin.
     * / Replaces any previously pinned message.
     */
    pinConversationMessage(other: Principal, messageId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Pin a message in a group chat. Only group creator or admins can pin.
     * / Replaces any previously pinned message.
     */
    pinGroupMessage(groupId: bigint, messageId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    pinPostToTrending(postId: string): Promise<void>;
    pinStory(storyId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    reactToGroupMessage(groupId: bigint, messageId: bigint, emoji: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    reactToMessage(receiver: Principal, messageId: bigint, emoji: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    reactToStory(storyId: bigint, emoji: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recordPostView(postId: string): Promise<void>;
    removeGroupParticipant(groupId: bigint, participant: Principal): Promise<void>;
    requestBuyRoses(amount: number): Promise<string>;
    requestSellRoses(amount: number): Promise<string>;
    saveCallerEmailPreferences(email: string | null, preferences: EmailPreferences): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    savePost(postId: string): Promise<void>;
    schema(): Promise<string>;
    sellRosesToUser(buyer: Principal, amount: number): Promise<void>;
    sendGroupMessage(groupId: bigint, content: MessageType, replyToId: bigint | null, dedupId: string | null): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: Variant_invalidDedupId_duplicate;
    }>;
    sendMessage(receiver: Principal, content: MessageType, replyToId: bigint | null): Promise<void>;
    setGroupTyping(groupId: bigint, isTyping: boolean): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    setTyping(conversationId: bigint, isTyping: boolean): Promise<void>;
    spin(stake: number): Promise<{
        __kind__: "ok";
        ok: SpinResult;
    } | {
        __kind__: "err";
        err: string;
    }>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unblockUser(userToUnblock: Principal): Promise<void>;
    unfollowUser(targetUser: Principal): Promise<void>;
    universalSearch(searchTerm: string, maxResults: bigint | null): Promise<Array<SearchResult>>;
    unlikePost(postId: string): Promise<void>;
    /**
     * / Unpin the currently pinned message in a direct conversation. Any participant can unpin.
     */
    unpinConversationMessage(other: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Unpin the currently pinned message in a group chat. Only group creator or admins can unpin.
     */
    unpinGroupMessage(groupId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    unpinStory(storyId: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    unpinTrendingPost(): Promise<void>;
    unreactToStory(storyId: bigint, emoji: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    unsavePost(postId: string): Promise<void>;
    updateGroupAvatar(groupId: bigint, newAvatar: ExternalBlob | null): Promise<void>;
    updateGroupName(groupId: bigint, newName: string): Promise<void>;
    updateLastActive(): Promise<void>;
    withdrawFromGame(): Promise<{
        __kind__: "ok";
        ok: number;
    } | {
        __kind__: "err";
        err: string;
    }>;
    withdrawFromPool(): Promise<{
        __kind__: "ok";
        ok: number;
    } | {
        __kind__: "err";
        err: string;
    }>;
}
