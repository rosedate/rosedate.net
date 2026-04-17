// migration.mo
// Safe upgrade migration for Rose Dating backend.
// Adds optional email and emailPreferences fields to UserProfile.
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // ── Shared primitive types ───────────────────────────────────────────────────
  type Time = Int;
  type ExternalBlob = Blob;

  // ── Inline type definitions (cannot import main.mo) ─────────────────────────

  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  // Old UserProfile (without email and emailPreferences)
  type OldUserProfile = {
    name : Text;
    username : Text;
    country : Text;
    gender : ?Text;
    birthYear : ?Nat;
    bio : ?Text;
    profilePicture : ?ExternalBlob;
  };

  // New UserProfile (with email and emailPreferences)
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

  type NewUserProfile = {
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

  type Story = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time;
    expiresAt : Time;
    viewedBy : [Principal];
    viewCount : Nat;
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

  type BlockRecord = {
    blocker : Principal;
    blocked : Principal;
    timestamp : Time;
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

  type OldGroupChat = {
    id : Nat;
    name : Text;
    creator : Principal;
    admins : [Principal];
    participants : [Principal];
    avatar : ?ExternalBlob;
    createdAt : Time;
  };

  type OldGroupMessage = {
    id : Nat;
    groupId : Nat;
    sender : Principal;
    content : MessageType;
    timestamp : Time;
    senderProfile : ?OldUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  type OldMessage = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : MessageType;
    timestamp : Time;
    senderProfile : ?OldUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  type OldConversation = {
    id : Nat;
    participants : [Principal];
    messages : [OldMessage];
    otherParticipantProfile : ?OldUserProfile;
  };

  type NewGroupChat = OldGroupChat;

  type NewGroupMessage = {
    id : Nat;
    groupId : Nat;
    sender : Principal;
    content : MessageType;
    timestamp : Time;
    senderProfile : ?NewUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  type NewMessage = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : MessageType;
    timestamp : Time;
    senderProfile : ?NewUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  type NewConversation = {
    id : Nat;
    participants : [Principal];
    messages : [NewMessage];
    otherParticipantProfile : ?NewUserProfile;
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

  // ── OldActor: previous stable state shape ────────────────────────────────────
  public type OldActor = {
    // Authorization component state
    accessControlState : AccessControlState;

    // User profiles & social graph
    userProfiles : Map.Map<Principal, OldUserProfile>;
    followersMap : Map.Map<Principal, [Principal]>;
    followingMap : Map.Map<Principal, [Principal]>;
    blockListMap : Map.Map<Principal, [Principal]>;
    blockRecords : [BlockRecord];

    // Stories
    nextStoryId : Nat;
    stories : Map.Map<Nat, Story>;
    userStories : Map.Map<Principal, [Nat]>;
    pinnedStories : Map.Map<Principal, [Nat]>;

    // Group chats
    nextGroupId : Nat;
    nextGroupMessageId : Nat;
    groupChats : Map.Map<Nat, OldGroupChat>;
    groupMessages : Map.Map<Nat, [OldGroupMessage]>;
    userGroups : Map.Map<Principal, [Nat]>;

    // Direct conversations
    nextMessageId : Nat;
    nextConversationId : Nat;
    conversations : Map.Map<Nat, OldConversation>;

    // Posts
    posts : Map.Map<Text, Post>;
    pinnedTrendingPostId : ?Text;
    nextCommentId : Nat;
    likesMap : Map.Map<Text, [LikeInteraction]>;
    commentsMap : Map.Map<Text, [CommentInteraction]>;
    savesMap : Map.Map<Text, [SaveInteraction]>;
    forwardsMap : Map.Map<Text, [ForwardInteraction]>;
    postRoseGiftsMap : Map.Map<Text, [RoseGiftOnPost]>;
    postViewersMap : Map.Map<Text, [Principal]>;

    // Rose economy
    nextRoseTransactionId : Nat;
    roseTransactions : [RoseTransaction];
    roseBalances : Map.Map<Principal, Float>;
    totalCirculatingRoses : Float;

    // Exchange rate cache
    icpUsdExchangeRate : ?Float;
    lastExchangeRateUpdate : ?Time;

    // Notifications
    nextNotificationId : Nat;
    notificationsMap : Map.Map<Principal, [Notification]>;

    // Online presence
    lastActiveMap : Map.Map<Principal, Int>;
  };

  // ── NewActor: adds email/emailPreferences to UserProfile ─────────────────────
  public type NewActor = {
    accessControlState : AccessControlState;
    userProfiles : Map.Map<Principal, NewUserProfile>;
    followersMap : Map.Map<Principal, [Principal]>;
    followingMap : Map.Map<Principal, [Principal]>;
    blockListMap : Map.Map<Principal, [Principal]>;
    blockRecords : [BlockRecord];
    nextStoryId : Nat;
    stories : Map.Map<Nat, Story>;
    userStories : Map.Map<Principal, [Nat]>;
    pinnedStories : Map.Map<Principal, [Nat]>;
    nextGroupId : Nat;
    nextGroupMessageId : Nat;
    groupChats : Map.Map<Nat, NewGroupChat>;
    groupMessages : Map.Map<Nat, [NewGroupMessage]>;
    userGroups : Map.Map<Principal, [Nat]>;
    nextMessageId : Nat;
    nextConversationId : Nat;
    conversations : Map.Map<Nat, NewConversation>;
    posts : Map.Map<Text, Post>;
    pinnedTrendingPostId : ?Text;
    nextCommentId : Nat;
    likesMap : Map.Map<Text, [LikeInteraction]>;
    commentsMap : Map.Map<Text, [CommentInteraction]>;
    savesMap : Map.Map<Text, [SaveInteraction]>;
    forwardsMap : Map.Map<Text, [ForwardInteraction]>;
    postRoseGiftsMap : Map.Map<Text, [RoseGiftOnPost]>;
    postViewersMap : Map.Map<Text, [Principal]>;
    nextRoseTransactionId : Nat;
    roseTransactions : [RoseTransaction];
    roseBalances : Map.Map<Principal, Float>;
    totalCirculatingRoses : Float;
    icpUsdExchangeRate : ?Float;
    lastExchangeRateUpdate : ?Time;
    nextNotificationId : Nat;
    notificationsMap : Map.Map<Principal, [Notification]>;
    lastActiveMap : Map.Map<Principal, Int>;
  };

  // Helper: upgrade OldUserProfile to NewUserProfile (null email/prefs)
  func upgradeProfile(old : OldUserProfile) : NewUserProfile {
    {
      name = old.name;
      username = old.username;
      country = old.country;
      gender = old.gender;
      birthYear = old.birthYear;
      bio = old.bio;
      profilePicture = old.profilePicture;
      email = null;
      emailPreferences = null;
    };
  };

  func upgradeOptProfile(old : ?OldUserProfile) : ?NewUserProfile {
    switch (old) {
      case null null;
      case (?p) ?upgradeProfile(p);
    };
  };

  func upgradeMessage(old : OldMessage) : NewMessage {
    {
      id = old.id;
      sender = old.sender;
      receiver = old.receiver;
      content = old.content;
      timestamp = old.timestamp;
      senderProfile = upgradeOptProfile(old.senderProfile);
      isEdited = old.isEdited;
      isDeleted = old.isDeleted;
      reactions = old.reactions;
      readBy = old.readBy;
      replyToId = old.replyToId;
    };
  };

  func upgradeConversation(old : OldConversation) : NewConversation {
    {
      id = old.id;
      participants = old.participants;
      messages = old.messages.map(upgradeMessage);
      otherParticipantProfile = upgradeOptProfile(old.otherParticipantProfile);
    };
  };

  func upgradeGroupMessage(old : OldGroupMessage) : NewGroupMessage {
    {
      id = old.id;
      groupId = old.groupId;
      sender = old.sender;
      content = old.content;
      timestamp = old.timestamp;
      senderProfile = upgradeOptProfile(old.senderProfile);
      isEdited = old.isEdited;
      isDeleted = old.isDeleted;
      reactions = old.reactions;
      readBy = old.readBy;
      replyToId = old.replyToId;
    };
  };

  // ── Migration: upgrade all UserProfile records in the state ──────────────────
  public func run(old : OldActor) : NewActor {
    let newUserProfiles = Map.empty<Principal, NewUserProfile>();
    for ((principal, profile) in old.userProfiles.entries()) {
      newUserProfiles.add(principal, upgradeProfile(profile));
    };

    let newConversations = Map.empty<Nat, NewConversation>();
    for ((convId, conv) in old.conversations.entries()) {
      newConversations.add(convId, upgradeConversation(conv));
    };

    let newGroupMessages = Map.empty<Nat, [NewGroupMessage]>();
    for ((groupId, msgs) in old.groupMessages.entries()) {
      newGroupMessages.add(groupId, msgs.map(upgradeGroupMessage));
    };

    {
      accessControlState = old.accessControlState;
      userProfiles = newUserProfiles;
      followersMap = old.followersMap;
      followingMap = old.followingMap;
      blockListMap = old.blockListMap;
      blockRecords = old.blockRecords;
      nextStoryId = old.nextStoryId;
      stories = old.stories;
      userStories = old.userStories;
      pinnedStories = old.pinnedStories;
      nextGroupId = old.nextGroupId;
      nextGroupMessageId = old.nextGroupMessageId;
      groupChats = old.groupChats;
      groupMessages = newGroupMessages;
      userGroups = old.userGroups;
      nextMessageId = old.nextMessageId;
      nextConversationId = old.nextConversationId;
      conversations = newConversations;
      posts = old.posts;
      pinnedTrendingPostId = old.pinnedTrendingPostId;
      nextCommentId = old.nextCommentId;
      likesMap = old.likesMap;
      commentsMap = old.commentsMap;
      savesMap = old.savesMap;
      forwardsMap = old.forwardsMap;
      postRoseGiftsMap = old.postRoseGiftsMap;
      postViewersMap = old.postViewersMap;
      nextRoseTransactionId = old.nextRoseTransactionId;
      roseTransactions = old.roseTransactions;
      roseBalances = old.roseBalances;
      totalCirculatingRoses = old.totalCirculatingRoses;
      icpUsdExchangeRate = old.icpUsdExchangeRate;
      lastExchangeRateUpdate = old.lastExchangeRateUpdate;
      nextNotificationId = old.nextNotificationId;
      notificationsMap = old.notificationsMap;
      lastActiveMap = old.lastActiveMap;
    };
  };
};
