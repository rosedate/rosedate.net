// Migration: bootstrap the Rose Dating backend stable state on fresh install.
//
// The first historical migration (20260806_044810.mo) declares a non-empty
// OldActor (51 fields) that matches a previously deployed .most signature. On a
// fresh install the chain replays from an empty actor, so that migration traps
// with "field `accessControlState` expected but not found in state". Historical
// migration files are frozen and cannot be modified, so this new migration runs
// FIRST (its timestamp sorts before 20260806_044810.mo) and materializes the
// 51-field state from scratch.
//
// OldActor = {} matches the fresh empty actor. NewActor exactly matches the
// OldActor shape of 20260806_044810.mo (51 fields, same names and types). The
// body constructs every field from scratch: empty defaults for collections and
// counters, constants for the 7 let fields (accessControlState, adminUsername,
// exchangeRateUpdateInterval, onlineThreshold, storyDuration, totalRoseSupply,
// typingExpiry). The first historical migration then runs with its OldActor
// matching this created state and no longer traps.
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

  // ── OldActor: {} matches the fresh empty actor on install ───────────────────
  type OldActor = {};

  // ── NewActor: exactly matches the OldActor shape of 20260806_044810.mo ─────
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
  };

  public func migration(_old : OldActor) : NewActor {
    {
      // 7 let fields: constants matching the values the first historical
      // migration assigns on upgrade.
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
      adminUsername = "rosalia";
      exchangeRateUpdateInterval = 3_600_000_000_000;
      onlineThreshold = 5 * 60 * 1_000_000_000;
      storyDuration = 72 * 60 * 60 * 1_000_000_000;
      totalRoseSupply = 9_999_999.0;
      typingExpiry = 5 * 1_000_000_000;
      // 44 var fields: empty defaults for collections and counters.
      var blockListMap = Map.empty();
      var blockRecords = [];
      var charityLastClaimMap = Map.empty();
      var charityPool = 0.0;
      var commentsMap = Map.empty();
      var conversationPinnedMessages = Map.empty();
      var conversations = Map.empty();
      var followersMap = Map.empty();
      var followingMap = Map.empty();
      var forwardsMap = Map.empty();
      var groupChats = Map.empty();
      var groupMessageDedupStore = Map.empty();
      var groupMessages = Map.empty();
      var groupPinnedMessages = Map.empty();
      var groupTypingMap = Map.empty();
      var icpUsdExchangeRate = null;
      var lastActiveMap = Map.empty();
      var lastExchangeRateUpdate = null;
      var likesMap = Map.empty();
      var nextCommentId = 0;
      var nextConversationId = 0;
      var nextGroupId = 0;
      var nextGroupMessageId = 0;
      var nextMessageId = 0;
      var nextNotificationId = 0;
      var nextRoseTransactionId = 0;
      var nextStoryId = 0;
      var notificationsMap = Map.empty();
      var pinnedStories = Map.empty();
      var pinnedTrendingPostId = null;
      var postRoseGiftsMap = Map.empty();
      var postViewersMap = Map.empty();
      var posts = Map.empty();
      var roseBalances = Map.empty();
      var roseTransactions = [];
      var savesMap = Map.empty();
      var stories = Map.empty();
      var storyGiftsMap = Map.empty();
      var stripeConfig = null;
      var totalCirculatingRoses = 0.0;
      var typingMap = Map.empty();
      var userGroups = Map.empty();
      var userProfiles = Map.empty();
      var userStories = Map.empty();
    };
  };
};
