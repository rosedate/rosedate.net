// migration.mo
// Migrates actor state to add caption and reactions fields to Story,
// and initializes the new storyGiftsMap field.

import Map "mo:core/Map";

module {
  // ── Shared primitive aliases ────────────────────────────────────────────────
  type Time = Int;
  // ExternalBlob = Blob (as defined by caffeineai-object-storage/Storage.mo)
  type ExternalBlob = Blob;

  // ── Duplicated types from main.mo (cannot import main.mo) ──────────────────

  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  type EmailPreferences = {
    message : Bool;
    roseGift : Bool;
    like : Bool;
    comment : Bool;
    follow : Bool;
    tradeRequest : Bool;
    systemNotice : Bool;
    postGift : Bool;
    roseReceipt : Bool;
    storyView : Bool;
    groupMessage : Bool;
    groupAdd : Bool;
  };

  type UserProfile = {
    name : Text;
    username : Text;
    country : Text;
    gender : ?Text;
    birthYear : ?Nat;
    bio : ?Text;
    profilePicture : ?ExternalBlob;
    email : ?Text;
    emailPreferences : ?EmailPreferences;
  };

  type BlockRecord = {
    blocker : Principal;
    blocked : Principal;
    timestamp : Time;
  };

  type ReceiptMessage = {
    sender : Principal;
    receiver : Principal;
    amount : Float;
    fee : Float;
    timestamp : Time;
    summary : Text;
  };

  type TradeRequestMessage = {
    requester : Principal;
    amount : Float;
    requestType : Text;
    timestamp : Time;
    summary : Text;
  };

  type MessageType = {
    #text : Text;
    #image : ExternalBlob;
    #video : ExternalBlob;
    #voice : ExternalBlob;
    #media : ExternalBlob;
    #rose : Float;
    #receipt : ReceiptMessage;
    #tradeRequest : TradeRequestMessage;
    #forwardedPost : {
      postId : Text;
      author : Principal;
      contentSnippet : Text;
      timestamp : Time;
      image : ?ExternalBlob;
    };
  };

  // Old Story type — no caption or reactions fields
  type OldStory = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time;
    expiresAt : Time;
    viewedBy : [Principal];
    viewCount : Nat;
  };

  // New Story type — with caption and reactions
  type NewStory = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time;
    expiresAt : Time;
    viewedBy : [Principal];
    viewCount : Nat;
    caption : ?Text;
    reactions : [(Text, [Principal])];
  };

  type RoseGiftOnStory = {
    storyId : Nat;
    gifter : Principal;
    amount : Float;
    timestamp : Time;
  };

  type GroupChat = {
    id : Nat;
    name : Text;
    creator : Principal;
    admins : [Principal];
    participants : [Principal];
    avatar : ?ExternalBlob;
    createdAt : Time;
  };

  type GroupMessage = {
    id : Nat;
    groupId : Nat;
    sender : Principal;
    content : MessageType;
    timestamp : Time;
    senderProfile : ?UserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  type Message = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : MessageType;
    timestamp : Time;
    senderProfile : ?UserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  type Conversation = {
    id : Nat;
    participants : [Principal];
    messages : [Message];
    otherParticipantProfile : ?UserProfile;
  };

  type Post = {
    id : Text;
    author : Principal;
    content : Text;
    timestamp : Time;
    image : ?ExternalBlob;
    embed : ?Text;
    viewCount : Nat;
  };

  type LikeInteraction = {
    postId : Text;
    user : Principal;
    timestamp : Time;
  };

  type CommentInteraction = {
    id : Nat;
    postId : Text;
    user : Principal;
    comment : Text;
    timestamp : Time;
    parentCommentId : ?Nat;
  };

  type SaveInteraction = {
    postId : Text;
    user : Principal;
    timestamp : Time;
  };

  type ForwardInteraction = {
    postId : Text;
    user : Principal;
    conversationId : Nat;
    timestamp : Time;
  };

  type RoseGiftOnPost = {
    postId : Text;
    gifter : Principal;
    amount : Float;
    timestamp : Time;
  };

  type RoseTransactionType = {
    #gift;
    #buy;
    #sell;
    #transfer;
    #fee;
    #mint;
  };

  type RoseTransaction = {
    id : Nat;
    sender : ?Principal;
    receiver : ?Principal;
    amount : Float;
    transactionType : RoseTransactionType;
    timestamp : Time;
    feeDistributed : Float;
  };

  type Notification = {
    id : Nat;
    userId : Principal;
    notificationType : NotificationType;
    content : Text;
    timestamp : Time;
    isRead : Bool;
    linkedId : ?Text;
    linkedType : ?Text;
  };

  type NotificationType = {
    #message;
    #roseGift;
    #like;
    #comment;
    #follow;
    #tradeRequest;
    #systemNotice;
    #postGift;
    #roseReceipt;
    #storyView;
    #groupMessage;
    #groupAdd;
  };

  type StripeConfiguration = {
    secretKey : Text;
    allowedCountries : [Text];
  };

  // ── Actor state shapes ──────────────────────────────────────────────────────

  // OldActor: state as it was before this upgrade.
  // Stories used the old type (no caption/reactions).
  // storyGiftsMap did not exist yet.
  public type OldActor = {
    accessControlState : AccessControlState;

    // User profiles
    var userProfiles : Map.Map<Principal, UserProfile>;
    var followersMap : Map.Map<Principal, [Principal]>;
    var followingMap : Map.Map<Principal, [Principal]>;
    var blockListMap : Map.Map<Principal, [Principal]>;
    var blockRecords : [BlockRecord];

    // Stories — old type without caption/reactions; no storyGiftsMap
    var nextStoryId : Nat;
    var stories : Map.Map<Nat, OldStory>;
    var userStories : Map.Map<Principal, [Nat]>;
    var pinnedStories : Map.Map<Principal, [Nat]>;

    // Group chats
    var nextGroupId : Nat;
    var nextGroupMessageId : Nat;
    var groupChats : Map.Map<Nat, GroupChat>;
    var groupMessages : Map.Map<Nat, [GroupMessage]>;
    var userGroups : Map.Map<Principal, [Nat]>;

    // Direct conversations
    var nextMessageId : Nat;
    var nextConversationId : Nat;
    var conversations : Map.Map<Nat, Conversation>;
    var conversationPinnedMessages : Map.Map<Nat, Nat>;
    var groupPinnedMessages : Map.Map<Nat, Nat>;

    // Posts
    var posts : Map.Map<Text, Post>;
    var pinnedTrendingPostId : ?Text;
    var nextCommentId : Nat;
    var likesMap : Map.Map<Text, [LikeInteraction]>;
    var commentsMap : Map.Map<Text, [CommentInteraction]>;
    var savesMap : Map.Map<Text, [SaveInteraction]>;
    var forwardsMap : Map.Map<Text, [ForwardInteraction]>;
    var postRoseGiftsMap : Map.Map<Text, [RoseGiftOnPost]>;
    var postViewersMap : Map.Map<Text, [Principal]>;

    // Rose economy
    var nextRoseTransactionId : Nat;
    var roseTransactions : [RoseTransaction];
    var roseBalances : Map.Map<Principal, Float>;
    var totalCirculatingRoses : Float;

    // Payment
    var stripeConfig : ?StripeConfiguration;

    // External integrations
    var icpUsdExchangeRate : ?Float;
    var lastExchangeRateUpdate : ?Time;

    // Notifications
    var nextNotificationId : Nat;
    var notificationsMap : Map.Map<Principal, [Notification]>;

    // Online presence
    var lastActiveMap : Map.Map<Principal, Int>;

    // Typing indicators
    var typingMap : Map.Map<Nat, [(Principal, Int)]>;
    var groupTypingMap : Map.Map<Nat, [(Principal, Int)]>;
  };

  // NewActor: state after this upgrade.
  // Stories use the new type (with caption/reactions).
  // storyGiftsMap is present.
  public type NewActor = {
    accessControlState : AccessControlState;

    // User profiles
    var userProfiles : Map.Map<Principal, UserProfile>;
    var followersMap : Map.Map<Principal, [Principal]>;
    var followingMap : Map.Map<Principal, [Principal]>;
    var blockListMap : Map.Map<Principal, [Principal]>;
    var blockRecords : [BlockRecord];

    // Stories — new type with caption/reactions; storyGiftsMap added
    var nextStoryId : Nat;
    var stories : Map.Map<Nat, NewStory>;
    var userStories : Map.Map<Principal, [Nat]>;
    var pinnedStories : Map.Map<Principal, [Nat]>;
    var storyGiftsMap : Map.Map<Nat, [RoseGiftOnStory]>;

    // Group chats
    var nextGroupId : Nat;
    var nextGroupMessageId : Nat;
    var groupChats : Map.Map<Nat, GroupChat>;
    var groupMessages : Map.Map<Nat, [GroupMessage]>;
    var userGroups : Map.Map<Principal, [Nat]>;

    // Direct conversations
    var nextMessageId : Nat;
    var nextConversationId : Nat;
    var conversations : Map.Map<Nat, Conversation>;
    var conversationPinnedMessages : Map.Map<Nat, Nat>;
    var groupPinnedMessages : Map.Map<Nat, Nat>;

    // Posts
    var posts : Map.Map<Text, Post>;
    var pinnedTrendingPostId : ?Text;
    var nextCommentId : Nat;
    var likesMap : Map.Map<Text, [LikeInteraction]>;
    var commentsMap : Map.Map<Text, [CommentInteraction]>;
    var savesMap : Map.Map<Text, [SaveInteraction]>;
    var forwardsMap : Map.Map<Text, [ForwardInteraction]>;
    var postRoseGiftsMap : Map.Map<Text, [RoseGiftOnPost]>;
    var postViewersMap : Map.Map<Text, [Principal]>;

    // Rose economy
    var nextRoseTransactionId : Nat;
    var roseTransactions : [RoseTransaction];
    var roseBalances : Map.Map<Principal, Float>;
    var totalCirculatingRoses : Float;

    // Payment
    var stripeConfig : ?StripeConfiguration;

    // External integrations
    var icpUsdExchangeRate : ?Float;
    var lastExchangeRateUpdate : ?Time;

    // Notifications
    var nextNotificationId : Nat;
    var notificationsMap : Map.Map<Principal, [Notification]>;

    // Online presence
    var lastActiveMap : Map.Map<Principal, Int>;

    // Typing indicators
    var typingMap : Map.Map<Nat, [(Principal, Int)]>;
    var groupTypingMap : Map.Map<Nat, [(Principal, Int)]>;
  };

  // Migrate: add caption=null and reactions=[] to every story;
  // initialize storyGiftsMap as an empty map.
  public func run(old : OldActor) : NewActor {
    let migratedStories = old.stories.map<Nat, OldStory, NewStory>(
      func(_id, s) {
        { s with caption = null; reactions = [] }
      }
    );
    let newStoryGiftsMap = Map.empty<Nat, [RoseGiftOnStory]>();
    {
      accessControlState = old.accessControlState;
      var userProfiles = old.userProfiles;
      var followersMap = old.followersMap;
      var followingMap = old.followingMap;
      var blockListMap = old.blockListMap;
      var blockRecords = old.blockRecords;
      var nextStoryId = old.nextStoryId;
      var stories = migratedStories;
      var userStories = old.userStories;
      var pinnedStories = old.pinnedStories;
      var storyGiftsMap = newStoryGiftsMap;
      var nextGroupId = old.nextGroupId;
      var nextGroupMessageId = old.nextGroupMessageId;
      var groupChats = old.groupChats;
      var groupMessages = old.groupMessages;
      var userGroups = old.userGroups;
      var nextMessageId = old.nextMessageId;
      var nextConversationId = old.nextConversationId;
      var conversations = old.conversations;
      var conversationPinnedMessages = old.conversationPinnedMessages;
      var groupPinnedMessages = old.groupPinnedMessages;
      var posts = old.posts;
      var pinnedTrendingPostId = old.pinnedTrendingPostId;
      var nextCommentId = old.nextCommentId;
      var likesMap = old.likesMap;
      var commentsMap = old.commentsMap;
      var savesMap = old.savesMap;
      var forwardsMap = old.forwardsMap;
      var postRoseGiftsMap = old.postRoseGiftsMap;
      var postViewersMap = old.postViewersMap;
      var nextRoseTransactionId = old.nextRoseTransactionId;
      var roseTransactions = old.roseTransactions;
      var roseBalances = old.roseBalances;
      var totalCirculatingRoses = old.totalCirculatingRoses;
      var stripeConfig = old.stripeConfig;
      var icpUsdExchangeRate = old.icpUsdExchangeRate;
      var lastExchangeRateUpdate = old.lastExchangeRateUpdate;
      var nextNotificationId = old.nextNotificationId;
      var notificationsMap = old.notificationsMap;
      var lastActiveMap = old.lastActiveMap;
      var typingMap = old.typingMap;
      var groupTypingMap = old.groupTypingMap;
    }
  };
};
