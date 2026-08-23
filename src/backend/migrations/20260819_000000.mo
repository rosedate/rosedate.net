// Migration: add the Fair Spin (Turn the Clock) game state to the Rose Dating
// backend. OldActor matches the previous migration's NewActor exactly (51
// stable fields). NewActor adds the gameState stable field (52 fields total).
// The migration body maps every existing field through unchanged and
// initializes gameState to an empty game pool.
//
// Self-contained: only mo:core/... imports are allowed.
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // ── Shared inlined types (must match the actor's public types exactly) ──────
  type Time = Int;
  type ExternalBlob = Blob;

  type UserRole = { #admin; #user; #guest };

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
    storyReaction : Bool;
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
    summary : Text;
    timestamp : Time;
  };

  type TradeRequestMessage = {
    requester : Principal;
    amount : Float;
    requestType : Text;
    summary : Text;
    timestamp : Time;
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

  type Message = {
    content : MessageType;
    id : Nat;
    isDeleted : Bool;
    isEdited : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    receiver : Principal;
    replyToId : ?Nat;
    sender : Principal;
    senderProfile : ?UserProfile;
    timestamp : Time;
  };

  type Conversation = {
    id : Nat;
    messages : [Message];
    otherParticipantProfile : ?UserProfile;
    participants : [Principal];
  };

  type GroupChat = {
    admins : [Principal];
    avatar : ?ExternalBlob;
    createdAt : Time;
    creator : Principal;
    id : Nat;
    name : Text;
    participants : [Principal];
  };

  type GroupMessage = {
    content : MessageType;
    groupId : Nat;
    id : Nat;
    isDeleted : Bool;
    isEdited : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
    sender : Principal;
    senderProfile : ?UserProfile;
    timestamp : Time;
  };

  type Story = {
    author : Principal;
    caption : ?Text;
    content : MessageType;
    expiresAt : Time;
    id : Nat;
    reactions : [(Text, [Principal])];
    timestamp : Time;
    viewCount : Nat;
    viewedBy : [Principal];
  };

  type Post = {
    author : Principal;
    content : Text;
    embed : ?Text;
    id : Text;
    image : ?ExternalBlob;
    timestamp : Time;
    viewCount : Nat;
  };

  type LikeInteraction = {
    postId : Text;
    timestamp : Time;
    user : Principal;
  };

  type CommentInteraction = {
    comment : Text;
    id : Nat;
    parentCommentId : ?Nat;
    postId : Text;
    timestamp : Time;
    user : Principal;
  };

  type SaveInteraction = {
    postId : Text;
    timestamp : Time;
    user : Principal;
  };

  type ForwardInteraction = {
    conversationId : Nat;
    postId : Text;
    timestamp : Time;
    user : Principal;
  };

  type RoseGiftOnPost = {
    amount : Float;
    gifter : Principal;
    postId : Text;
    timestamp : Time;
  };

  type RoseGiftOnStory = {
    amount : Float;
    gifter : Principal;
    storyId : Nat;
    timestamp : Time;
  };

  type RoseTransactionType = {
    #buy;
    #charityClaim;
    #charityDonate;
    #fee;
    #gift;
    #mint;
    #sell;
    #transfer;
  };

  type RoseTransaction = {
    amount : Float;
    feeDistributed : Float;
    id : Nat;
    receiver : ?Principal;
    sender : ?Principal;
    timestamp : Time;
    transactionType : RoseTransactionType;
  };

  type NotificationType = {
    #comment;
    #follow;
    #groupAdd;
    #groupMessage;
    #like;
    #message;
    #postGift;
    #roseGift;
    #roseReceipt;
    #storyReaction;
    #storyView;
    #systemNotice;
    #tradeRequest;
  };

  type Notification = {
    content : Text;
    id : Nat;
    isRead : Bool;
    linkedId : ?Text;
    linkedType : ?Text;
    notificationType : NotificationType;
    timestamp : Time;
    userId : Principal;
  };

  type StripeConfiguration = {
    allowedCountries : [Text];
    secretKey : Text;
  };

  // Fair Spin game types.
  type SpinOutcome = {
    #win : Float;
    #loss : Float;
  };

  type SpinRecord = {
    id : Nat;
    player : Principal;
    stake : Float;
    outcome : SpinOutcome;
    payout : Float;
    timestamp : Int;
  };

  type GameState = {
    var playerPool : Float;
    var playerParticipation : Map.Map<Principal, Float>;
    var lastSpinTime : Map.Map<Principal, Int>;
    var gameHistory : Map.Map<Principal, [SpinRecord]>;
    var nextSpinId : Nat;
  };

  // ── OldActor: matches the previous migration's NewActor exactly (51 fields) ─
  type OldActor = {
    accessControlState : AccessControlState;
    adminUsername : Text;
    var blockListMap : Map.Map<Principal, [Principal]>;
    var blockRecords : [BlockRecord];
    var charityLastClaimMap : Map.Map<Principal, Int>;
    var charityPool : Float;
    var commentsMap : Map.Map<Text, [CommentInteraction]>;
    var conversationPinnedMessages : Map.Map<Nat, Nat>;
    var conversations : Map.Map<Nat, Conversation>;
    exchangeRateUpdateInterval : Int;
    var followersMap : Map.Map<Principal, [Principal]>;
    var followingMap : Map.Map<Principal, [Principal]>;
    var forwardsMap : Map.Map<Text, [ForwardInteraction]>;
    var groupChats : Map.Map<Nat, GroupChat>;
    var groupMessageDedupStore : Map.Map<Text, Int>;
    var groupMessages : Map.Map<Nat, [GroupMessage]>;
    var groupPinnedMessages : Map.Map<Nat, Nat>;
    var groupTypingMap : Map.Map<Nat, [(Principal, Int)]>;
    var icpUsdExchangeRate : ?Float;
    var lastActiveMap : Map.Map<Principal, Int>;
    var lastExchangeRateUpdate : ?Time;
    var likesMap : Map.Map<Text, [LikeInteraction]>;
    var nextCommentId : Nat;
    var nextConversationId : Nat;
    var nextGroupId : Nat;
    var nextGroupMessageId : Nat;
    var nextMessageId : Nat;
    var nextNotificationId : Nat;
    var nextRoseTransactionId : Nat;
    var nextStoryId : Nat;
    var notificationsMap : Map.Map<Principal, [Notification]>;
    onlineThreshold : Int;
    var pinnedStories : Map.Map<Principal, [Nat]>;
    var pinnedTrendingPostId : ?Text;
    var postRoseGiftsMap : Map.Map<Text, [RoseGiftOnPost]>;
    var postViewersMap : Map.Map<Text, [Principal]>;
    var posts : Map.Map<Text, Post>;
    var roseBalances : Map.Map<Principal, Float>;
    var roseTransactions : [RoseTransaction];
    var savesMap : Map.Map<Text, [SaveInteraction]>;
    var stories : Map.Map<Nat, Story>;
    storyDuration : Int;
    var storyGiftsMap : Map.Map<Nat, [RoseGiftOnStory]>;
    var stripeConfig : ?StripeConfiguration;
    var totalCirculatingRoses : Float;
    totalRoseSupply : Float;
    typingExpiry : Int;
    var typingMap : Map.Map<Nat, [(Principal, Int)]>;
    var userGroups : Map.Map<Principal, [Nat]>;
    var userProfiles : Map.Map<Principal, UserProfile>;
    var userStories : Map.Map<Principal, [Nat]>;
  };

  // ── NewActor: same 51 stable fields plus the new gameState field ───────────
  type NewActor = {
    accessControlState : AccessControlState;
    adminUsername : Text;
    var blockListMap : Map.Map<Principal, [Principal]>;
    var blockRecords : [BlockRecord];
    var charityLastClaimMap : Map.Map<Principal, Int>;
    var charityPool : Float;
    var commentsMap : Map.Map<Text, [CommentInteraction]>;
    var conversationPinnedMessages : Map.Map<Nat, Nat>;
    var conversations : Map.Map<Nat, Conversation>;
    exchangeRateUpdateInterval : Int;
    var followersMap : Map.Map<Principal, [Principal]>;
    var followingMap : Map.Map<Principal, [Principal]>;
    var forwardsMap : Map.Map<Text, [ForwardInteraction]>;
    var groupChats : Map.Map<Nat, GroupChat>;
    var groupMessageDedupStore : Map.Map<Text, Int>;
    var groupMessages : Map.Map<Nat, [GroupMessage]>;
    var groupPinnedMessages : Map.Map<Nat, Nat>;
    var groupTypingMap : Map.Map<Nat, [(Principal, Int)]>;
    var icpUsdExchangeRate : ?Float;
    var lastActiveMap : Map.Map<Principal, Int>;
    var lastExchangeRateUpdate : ?Time;
    var likesMap : Map.Map<Text, [LikeInteraction]>;
    var nextCommentId : Nat;
    var nextConversationId : Nat;
    var nextGroupId : Nat;
    var nextGroupMessageId : Nat;
    var nextMessageId : Nat;
    var nextNotificationId : Nat;
    var nextRoseTransactionId : Nat;
    var nextStoryId : Nat;
    var notificationsMap : Map.Map<Principal, [Notification]>;
    onlineThreshold : Int;
    var pinnedStories : Map.Map<Principal, [Nat]>;
    var pinnedTrendingPostId : ?Text;
    var postRoseGiftsMap : Map.Map<Text, [RoseGiftOnPost]>;
    var postViewersMap : Map.Map<Text, [Principal]>;
    var posts : Map.Map<Text, Post>;
    var roseBalances : Map.Map<Principal, Float>;
    var roseTransactions : [RoseTransaction];
    var savesMap : Map.Map<Text, [SaveInteraction]>;
    var stories : Map.Map<Nat, Story>;
    storyDuration : Int;
    var storyGiftsMap : Map.Map<Nat, [RoseGiftOnStory]>;
    var stripeConfig : ?StripeConfiguration;
    var totalCirculatingRoses : Float;
    totalRoseSupply : Float;
    typingExpiry : Int;
    var typingMap : Map.Map<Nat, [(Principal, Int)]>;
    var userGroups : Map.Map<Principal, [Nat]>;
    var userProfiles : Map.Map<Principal, UserProfile>;
    var userStories : Map.Map<Principal, [Nat]>;
    var gameState : GameState;
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      adminUsername = old.adminUsername;
      var blockListMap = old.blockListMap;
      var blockRecords = old.blockRecords;
      var charityLastClaimMap = old.charityLastClaimMap;
      var charityPool = old.charityPool;
      var commentsMap = old.commentsMap;
      var conversationPinnedMessages = old.conversationPinnedMessages;
      var conversations = old.conversations;
      exchangeRateUpdateInterval = old.exchangeRateUpdateInterval;
      var followersMap = old.followersMap;
      var followingMap = old.followingMap;
      var forwardsMap = old.forwardsMap;
      var groupChats = old.groupChats;
      var groupMessageDedupStore = old.groupMessageDedupStore;
      var groupMessages = old.groupMessages;
      var groupPinnedMessages = old.groupPinnedMessages;
      var groupTypingMap = old.groupTypingMap;
      var icpUsdExchangeRate = old.icpUsdExchangeRate;
      var lastActiveMap = old.lastActiveMap;
      var lastExchangeRateUpdate = old.lastExchangeRateUpdate;
      var likesMap = old.likesMap;
      var nextCommentId = old.nextCommentId;
      var nextConversationId = old.nextConversationId;
      var nextGroupId = old.nextGroupId;
      var nextGroupMessageId = old.nextGroupMessageId;
      var nextMessageId = old.nextMessageId;
      var nextNotificationId = old.nextNotificationId;
      var nextRoseTransactionId = old.nextRoseTransactionId;
      var nextStoryId = old.nextStoryId;
      var notificationsMap = old.notificationsMap;
      onlineThreshold = old.onlineThreshold;
      var pinnedStories = old.pinnedStories;
      var pinnedTrendingPostId = old.pinnedTrendingPostId;
      var postRoseGiftsMap = old.postRoseGiftsMap;
      var postViewersMap = old.postViewersMap;
      var posts = old.posts;
      var roseBalances = old.roseBalances;
      var roseTransactions = old.roseTransactions;
      var savesMap = old.savesMap;
      var stories = old.stories;
      storyDuration = old.storyDuration;
      var storyGiftsMap = old.storyGiftsMap;
      var stripeConfig = old.stripeConfig;
      var totalCirculatingRoses = old.totalCirculatingRoses;
      totalRoseSupply = old.totalRoseSupply;
      typingExpiry = old.typingExpiry;
      var typingMap = old.typingMap;
      var userGroups = old.userGroups;
      var userProfiles = old.userProfiles;
      var userStories = old.userStories;
      var gameState = {
        var playerPool = 0.0;
        var playerParticipation = Map.empty();
        var lastSpinTime = Map.empty();
        var gameHistory = Map.empty();
        var nextSpinId = 0;
      };
    };
  };
};
