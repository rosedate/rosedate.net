import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Stripe "mo:caffeineai-stripe/stripe";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Storage "mo:caffeineai-object-storage/Storage";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import EmailClient "mo:caffeineai-email/emailClient";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:base/Time";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Float "mo:base/Float";
import Int "mo:core/Int";
import Buffer "mo:base/Buffer";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";



actor {
  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinObjectStorage();

  // User Profiles
  public type EmailPreferences = {
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

  public type UserProfile = {
    name : Text;
    username : Text;
    country : Text;
    gender : ?Text;
    birthYear : ?Nat;
    bio : ?Text;
    profilePicture : ?Storage.ExternalBlob;
    email : ?Text;
    emailPreferences : ?EmailPreferences;
  };

  var userProfiles = Map.empty<Principal, UserProfile>();

  // Follow System
  var followersMap = Map.empty<Principal, [Principal]>();
  var followingMap = Map.empty<Principal, [Principal]>();

  // Block System
  public type BlockRecord = {
    blocker : Principal;
    blocked : Principal;
    timestamp : Time.Time;
  };

  var blockListMap = Map.empty<Principal, [Principal]>();
  var blockRecords : [BlockRecord] = [];

  // Helper function to check if user1 has blocked user2
  func isBlocked(blocker : Principal, blocked : Principal) : Bool {
    switch (blockListMap.get(blocker)) {
      case (?blockedList) {
        blockedList.find(func(p : Principal) : Bool { p == blocked }) != null
      };
      case null false;
    };
  };

  // Helper function to check if there's any blocking relationship between two users
  func hasBlockingRelationship(user1 : Principal, user2 : Principal) : Bool {
    isBlocked(user1, user2) or isBlocked(user2, user1)
  };

  public shared ({ caller }) func blockUser(userToBlock : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can block others");
    };

    if (caller == userToBlock) {
      Runtime.trap("Cannot block yourself");
    };

    switch (userProfiles.get(userToBlock)) {
      case null {
        Runtime.trap("User to block not found");
      };
      case (?_) {};
    };

    // Check if already blocked
    if (isBlocked(caller, userToBlock)) {
      Runtime.trap("User is already blocked");
    };

    // Add to block list
    switch (blockListMap.get(caller)) {
      case (?blockedList) {
        blockListMap.add(caller, blockedList.concat([userToBlock]));
      };
      case null {
        blockListMap.add(caller, [userToBlock]);
      };
    };

    // Add block record
    let record : BlockRecord = {
      blocker = caller;
      blocked = userToBlock;
      timestamp = Time.now();
    };
    blockRecords := blockRecords.concat([record]);

    // Automatically unfollow each other
    switch (followingMap.get(caller)) {
      case (?followingList) {
        followingMap.add(caller, followingList.filter(func(p : Principal) : Bool { p != userToBlock }));
      };
      case null {};
    };
    switch (followersMap.get(userToBlock)) {
      case (?followersList) {
        followersMap.add(userToBlock, followersList.filter(func(p : Principal) : Bool { p != caller }));
      };
      case null {};
    };
    switch (followingMap.get(userToBlock)) {
      case (?followingList) {
        followingMap.add(userToBlock, followingList.filter(func(p : Principal) : Bool { p != caller }));
      };
      case null {};
    };
    switch (followersMap.get(caller)) {
      case (?followersList) {
        followersMap.add(caller, followersList.filter(func(p : Principal) : Bool { p != userToBlock }));
      };
      case null {};
    };
  };

  public shared ({ caller }) func unblockUser(userToUnblock : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unblock others");
    };

    if (caller == userToUnblock) {
      Runtime.trap("Cannot unblock yourself");
    };

    // Check if actually blocked
    if (not isBlocked(caller, userToUnblock)) {
      Runtime.trap("User is not blocked");
    };

    // Remove from block list
    switch (blockListMap.get(caller)) {
      case (?blockedList) {
        blockListMap.add(caller, blockedList.filter(func(p : Principal) : Bool { p != userToUnblock }));
      };
      case null {};
    };
  };

  public query ({ caller }) func getBlockedUsers() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their block list");
    };

    switch (blockListMap.get(caller)) {
      case (?blockedList) blockedList;
      case null [];
    };
  };

  public query ({ caller }) func isUserBlocked(user : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check block status");
    };

    isBlocked(caller, user);
  };

  public query ({ caller }) func getAllBlockRecords() : async [BlockRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all block records");
    };

    blockRecords;
  };

  // Helper function to check if username is admin
  func isAdminUsername(username : Text) : Bool {
    Text.equal(username, "rosalia");
  };

  // Helper function to verify admin by username
  func verifyAdminByUsername(caller : Principal) : Bool {
    switch (userProfiles.get(caller)) {
      case (?profile) {
        isAdminUsername(profile.username) and AccessControl.isAdmin(accessControlState, caller);
      };
      case null { false };
    };
  };

  // Function to get admin principal by username
  func getAdminPrincipal(username : Text) : ?Principal {
    for ((principal, profile) in userProfiles.entries()) {
      if (profile.username == username and AccessControl.isAdmin(accessControlState, principal)) {
        return ?principal;
      };
    };
    null;
  };

  // Resolve any username to its Principal — used by the QR code scan flow.
  // Returns null if no profile with that username exists.
  public query func getUserByUsername(username : Text) : async ?Principal {
    let lower = username.toLower();
    for ((principal, profile) in userProfiles.entries()) {
      if (profile.username.toLower() == lower) {
        return ?principal;
      };
    };
    null;
  };

  public query ({ caller }) func getCallerUserProfile() : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) profile;
      case null {
        Runtime.trap("Profile for caller " # caller.toText() # " not found");
      };
    };
  };

  public query ({ caller }) func getUserProfile({ profileId : Principal }) : async UserProfile {
    // Require authentication to view profiles
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };

    // Authenticated users cannot view blocked profiles
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (hasBlockingRelationship(caller, profileId)) {
        Runtime.trap("Cannot view profile: blocking relationship exists");
      };
    };

    switch (userProfiles.get(profileId)) {
      case (?actualProfile) actualProfile;
      case null {
        Runtime.trap("Profile for principal " # profileId.toText() # " not found");
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    // Prevent non-admins from using admin username
    if (isAdminUsername(profile.username) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Username 'rosalia' is reserved for admin");
    };

    userProfiles.add(caller, profile);

    // Initialize follow lists if not exists
    switch (followersMap.get(caller)) {
      case null {
        followersMap.add(caller, []);
      };
      case (?_) {};
    };

    switch (followingMap.get(caller)) {
      case null {
        followingMap.add(caller, []);
      };
      case (?_) {};
    };

    // Initialize block list if not exists
    switch (blockListMap.get(caller)) {
      case null {
        blockListMap.add(caller, []);
      };
      case (?_) {};
    };
  };

  public shared ({ caller }) func deleteCallerProfile() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete profiles");
    };

    if (AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin cannot delete their profile");
    };

    userProfiles.remove(caller);
    followersMap.remove(caller);
    followingMap.remove(caller);
    blockListMap.remove(caller);
  };

  // Email Preferences
  public query ({ caller }) func getCallerEmailPreferences() : async { email : ?Text; preferences : ?EmailPreferences } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view email preferences");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) { { email = profile.email; preferences = profile.emailPreferences } };
      case null { { email = null; preferences = null } };
    };
  };

  public shared ({ caller }) func saveCallerEmailPreferences(email : ?Text, preferences : EmailPreferences) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save email preferences");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) {
        let updated = { profile with email; emailPreferences = ?preferences };
        userProfiles.add(caller, updated);
      };
      case null {
        Runtime.trap("Profile not found");
      };
    };
  };

  public query ({ caller }) func isFollowing(targetUser : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check following status");
    };

    switch (followingMap.get(caller)) {
      case (?followingList) {
        switch (followingList.find(func(p : Principal) : Bool { p == targetUser })) {
          case null { false };
          case (?_) { true };
        };
      };
      case null false;
    };
  };

  public shared ({ caller }) func followUser(targetUser : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };

    if (caller == targetUser) {
      Runtime.trap("Cannot follow yourself");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, targetUser)) {
      Runtime.trap("Cannot follow: blocking relationship exists");
    };

    switch (userProfiles.get(targetUser)) {
      case null {
        Runtime.trap("Target user profile not found");
      };
      case (?_) {};
    };

    switch (followingMap.get(caller)) {
      case (?followingList) {
        switch (followingList.find(func(p : Principal) : Bool { p == targetUser })) {
          case null {
            followingMap.add(caller, followingList.concat([targetUser]));
          };
          case (?_) {
            return; // Already following
          };
        };
      };
      case null {
        followingMap.add(caller, [targetUser]);
      };
    };

    switch (followersMap.get(targetUser)) {
      case (?followersList) {
        switch (followersList.find(func(p : Principal) : Bool { p == caller })) {
          case null {
            followersMap.add(targetUser, followersList.concat([caller]));
          };
          case (?_) {};
        };
      };
      case null {
        followersMap.add(targetUser, [caller]);
      };
    };

    // Send follow notification
    ignore createFollowNotification(caller, targetUser);
  };

  public shared ({ caller }) func unfollowUser(targetUser : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };

    switch (followingMap.get(caller)) {
      case (?followingList) {
        followingMap.add(caller, followingList.filter(func(p : Principal) : Bool { p != targetUser }));
      };
      case null {};
    };
    switch (followersMap.get(targetUser)) {
      case (?followersList) {
        followersMap.add(targetUser, followersList.filter(func(p : Principal) : Bool { p != caller }));
      };
      case null {};
    };
  };

  public query ({ caller }) func getFollowerCount(targetUser : Principal) : async Nat {
    // Require authentication to view follower counts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view follower counts");
    };

    switch (followersMap.get(targetUser)) {
      case (?followersList) followersList.size();
      case null 0;
    };
  };

  public query ({ caller }) func getFollowingCount(targetUser : Principal) : async Nat {
    // Require authentication to view following counts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view following counts");
    };

    switch (followingMap.get(targetUser)) {
      case (?followingList) followingList.size();
      case null 0;
    };
  };

  // New function to get posts from followed users
  public query ({ caller }) func getPostsFromFollowedUsers() : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view followed posts");
    };

    switch (followingMap.get(caller)) {
      case (?followingList) {
        let buffer = Buffer.Buffer<Post>(0);
        for ((__id, post) in posts.entries()) {
          // Filter out posts from blocked users
          if (not hasBlockingRelationship(caller, post.author)) {
            if (followingList.find(func(p : Principal) : Bool { p == post.author }) != null) {
              buffer.add(post);
            };
          };
        };
        Buffer.toArray(buffer);
      };
      case null {
        Runtime.trap("No following list found for user");
      };
    };
  };

  // Story System

  // StoryV1 – stable type from previous deployment (no viewCount)
  type StoryV1 = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time.Time;
    expiresAt : Time.Time;
    viewedBy : [Principal];
  };

  // StoryV2 – type before caption and reactions were added
  type StoryV2 = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time.Time;
    expiresAt : Time.Time;
    viewedBy : [Principal];
    viewCount : Nat;
  };

  public type Story = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time.Time;
    expiresAt : Time.Time;
    viewedBy : [Principal];
    viewCount : Nat;
    caption : ?Text;
    reactions : [(Text, [Principal])];
  };

  public type RoseGiftOnStory = {
    storyId : Nat;
    gifter : Principal;
    amount : Float;
    timestamp : Time.Time;
  };

  var nextStoryId = 0;
  var stories = Map.empty<Nat, Story>();
  var userStories = Map.empty<Principal, [Nat]>();
  // Pinned/highlighted stories per user: storyId stays permanently until unpinned
  var pinnedStories = Map.empty<Principal, [Nat]>();
  // Story gifts tracking
  var storyGiftsMap = Map.empty<Nat, [RoseGiftOnStory]>();

  let storyDuration : Int = 72 * 60 * 60 * 1_000_000_000; // 72 hours in nanoseconds

  public shared ({ caller }) func createStory(content : MessageType, caption : ?Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create stories");
    };

    // Validate content type - only image, video, and media allowed
    switch (content) {
      case (#image(_)) {};
      case (#video(_)) {};
      case (#media(_)) {};
      case (_) {
        Runtime.trap("Invalid content type: Only image, video, and media messages can be transformed into stories");
      };
    };

    let storyId = nextStoryId;
    nextStoryId += 1;

    let now = Time.now();
    let story : Story = {
      id = storyId;
      author = caller;
      content;
      timestamp = now;
      expiresAt = now + storyDuration;
      viewedBy = [];
      viewCount = 0;
      caption;
      reactions = [];
    };

    stories.add(storyId, story);

    // Add to user's story list
    switch (userStories.get(caller)) {
      case (?storyList) {
        userStories.add(caller, storyList.concat([storyId]));
      };
      case null {
        userStories.add(caller, [storyId]);
      };
    };

    storyId;
  };

  public query ({ caller }) func getActiveStories() : async [Story] {
    // Require authentication to view stories
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view stories");
    };

    let now = Time.now();
    let buffer = Buffer.Buffer<Story>(0);

    for ((_storyId, story) in stories.entries()) {
      if (story.expiresAt > now) {
        // Filter out blocked users
        if (not hasBlockingRelationship(caller, story.author)) {
          buffer.add(story);
        };
      };
    };

    Buffer.toArray(buffer);
  };

  public query ({ caller }) func getUserStories(userId : Principal) : async [Story] {
    // Require authentication to view stories
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view stories");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, userId)) {
      Runtime.trap("Cannot view stories: blocking relationship exists");
    };

    let now = Time.now();
    let buffer = Buffer.Buffer<Story>(0);

    // Collect pinned story IDs for this user
    let userPinnedIds = switch (pinnedStories.get(userId)) {
      case (?ids) { ids };
      case null { [] };
    };

    switch (userStories.get(userId)) {
      case (?storyIds) {
        for (storyId in storyIds.vals()) {
          switch (stories.get(storyId)) {
            case (?story) {
              let isPinned = userPinnedIds.find(func(id : Nat) : Bool { id == storyId }) != null;
              // Show story if not expired, OR if it is pinned (permanently visible)
              if (story.expiresAt > now or isPinned) {
                buffer.add(story);
              };
            };
            case null {};
          };
        };
      };
      case null {};
    };

    Buffer.toArray(buffer);
  };

  public shared ({ caller }) func markStoryAsViewed(storyId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };

    switch (stories.get(storyId)) {
      case (?story) {
        // Check blocking relationship
        if (hasBlockingRelationship(caller, story.author)) {
          Runtime.trap("Cannot view story: blocking relationship exists");
        };

        // Check if story is expired — pinned stories are permanently visible
        let isAuthorPinned = switch (pinnedStories.get(story.author)) {
          case (?ids) { ids.find(func(id : Nat) : Bool { id == storyId }) != null };
          case null { false };
        };
        if (story.expiresAt <= Time.now() and not isAuthorPinned) {
          Runtime.trap("Story has expired");
        };

        // Verify caller has a valid user profile
        switch (userProfiles.get(caller)) {
          case null {
            Runtime.trap("User profile not found");
          };
          case (?_) {};
        };

        // Check if already viewed
        let alreadyViewed = story.viewedBy.find(func(p : Principal) : Bool { p == caller });
        switch (alreadyViewed) {
          case null {
            let updatedStory : Story = {
              story with
              viewedBy = story.viewedBy.concat([caller]);
              viewCount = story.viewCount + 1;
            };
            stories.add(storyId, updatedStory);

            // Send story view notification to author if viewer is not the author
            if (story.author != caller) {
              ignore createStoryViewNotification(caller, story.author, storyId);
            };
          };
          case (?_) {};
        };
      };
      case null {
        Runtime.trap("Story not found");
      };
    };
  };

  // System maintenance function - restricted to admin only for security
  public shared ({ caller }) func cleanupExpiredStories() : async Nat {
    // Restrict to admin only for security
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can trigger story cleanup");
    };

    let now = Time.now();
    var cleanedCount = 0;

    // Collect all pinned story IDs across all users
    let pinnedSet = Map.empty<Nat, Bool>();
    for ((_userId, storyIds) in pinnedStories.entries()) {
      for (storyId in storyIds.vals()) {
        pinnedSet.add(storyId, true);
      };
    };

    let storyBuffer = Buffer.Buffer<(Nat, Story)>(0);
    for ((storyId, story) in stories.entries()) {
      // Keep story if not expired OR if it is pinned by its author
      let isPinned = pinnedSet.containsKey(storyId);
      if (story.expiresAt <= now and not isPinned) {
        cleanedCount += 1;
      } else {
        storyBuffer.add((storyId, story));
      };
    };

    // Rebuild stories map without expired stories
    let newStories = Map.empty<Nat, Story>();
    for ((storyId, story) in storyBuffer.vals()) {
      newStories.add(storyId, story);
    };
    stories := newStories;

    // Clean up user story lists
    for ((userId, storyIds) in userStories.entries()) {
      let activeStoryIds = storyIds.filter(func(storyId : Nat) : Bool {
        switch (stories.get(storyId)) {
          case (?_) true;
          case null false;
        };
      });
      userStories.add(userId, activeStoryIds);
    };

    cleanedCount;
  };

  // Story Highlights — pin a story permanently to the author's profile
  public shared ({ caller }) func pinStory(storyId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can pin stories");
    };

    switch (stories.get(storyId)) {
      case null { return #err("Story not found") };
      case (?story) {
        if (story.author != caller) {
          return #err("Unauthorized: You can only pin your own stories");
        };

        // Check if already pinned
        switch (pinnedStories.get(caller)) {
          case (?ids) {
            if (ids.find(func(id : Nat) : Bool { id == storyId }) != null) {
              return #err("Story is already pinned");
            };
            pinnedStories.add(caller, ids.concat([storyId]));
          };
          case null {
            pinnedStories.add(caller, [storyId]);
          };
        };

        #ok;
      };
    };
  };

  public shared ({ caller }) func unpinStory(storyId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can unpin stories");
    };

    switch (pinnedStories.get(caller)) {
      case null { return #err("No pinned stories found") };
      case (?ids) {
        let found = ids.find(func(id : Nat) : Bool { id == storyId });
        switch (found) {
          case null { return #err("Story is not pinned") };
          case (?_) {
            pinnedStories.add(caller, ids.filter(func(id : Nat) : Bool { id != storyId }));
            #ok;
          };
        };
      };
    };
  };

  public query ({ caller }) func getPinnedStories(userId : Principal) : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view pinned stories");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, userId)) {
      Runtime.trap("Cannot view pinned stories: blocking relationship exists");
    };

    switch (pinnedStories.get(userId)) {
      case null { [] };
      case (?ids) {
        let buffer = Buffer.Buffer<Story>(0);
        for (storyId in ids.vals()) {
          switch (stories.get(storyId)) {
            case (?story) { buffer.add(story) };
            case null {}; // story was deleted — skip silently
          };
        };
        Buffer.toArray(buffer);
      };
    };
  };

  // Story Reactions
  public shared ({ caller }) func reactToStory(storyId : Nat, emoji : Text) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can react to stories");
    };

    switch (stories.get(storyId)) {
      case null { return #err("Story not found") };
      case (?story) {
        // Check blocking relationship
        if (hasBlockingRelationship(caller, story.author)) {
          return #err("Cannot react to story: blocking relationship exists");
        };

        // Build updated reactions array
        var found = false;
        let updatedReactions = story.reactions.map(func(e, principals) {
          if (e == emoji) {
            found := true;
            // Add caller if not already reacted
            if (principals.find(func(p : Principal) : Bool { p == caller }) == null) {
              (e, principals.concat([caller]))
            } else {
              (e, principals)
            }
          } else {
            (e, principals)
          }
        });

        let finalReactions = if (found) {
          updatedReactions
        } else {
          updatedReactions.concat([(emoji, [caller])])
        };

        let updatedStory : Story = { story with reactions = finalReactions };
        stories.add(storyId, updatedStory);

        // Notify the story author if the reactor is not the author
        if (story.author != caller) {
          ignore createStoryReactionNotification(caller, story.author, storyId, emoji);
        };

        #ok
      };
    };
  };

  public shared ({ caller }) func unreactToStory(storyId : Nat, emoji : Text) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can remove story reactions");
    };

    switch (stories.get(storyId)) {
      case null { return #err("Story not found") };
      case (?story) {
        let updatedReactions = story.reactions.map(func(e, principals) {
          if (e == emoji) {
            (e, principals.filter(func(p : Principal) : Bool { p != caller }))
          } else {
            (e, principals)
          }
        });

        // Remove entries with empty principal lists
        let cleanedReactions = updatedReactions.filter(func(entry : (Text, [Principal])) : Bool {
          entry.1.size() > 0
        });

        let updatedStory : Story = { story with reactions = cleanedReactions };
        stories.add(storyId, updatedStory);
        #ok
      };
    };
  };

  public query ({ caller }) func getStoryReactions(storyId : Nat) : async [(Text, [Principal])] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view story reactions");
    };

    switch (stories.get(storyId)) {
      case null { [] };
      case (?story) { story.reactions };
    };
  };

  // Story Gifting
  public shared ({ caller }) func giftRosesOnStory(storyId : Nat, amount : Float) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can gift Roses on stories");
    };

    if (amount < 0.01) {
      return #err("Minimum gift amount is 0.01 Rose");
    };

    switch (stories.get(storyId)) {
      case null { return #err("Story not found") };
      case (?story) {
        if (story.author == caller) {
          return #err("Cannot gift Roses to your own story");
        };

        // Check blocking relationship
        if (hasBlockingRelationship(caller, story.author)) {
          return #err("Cannot gift Roses: blocking relationship exists");
        };

        let senderBalance = switch (roseBalances.get(caller)) {
          case null { 0.0 };
          case (?balance) { balance };
        };
        if (senderBalance < amount) {
          return #err("Insufficient balance to gift " # Float.toText(amount) # " Roses");
        };

        let fee = giftRosesInternal(caller, story.author, amount);

        let receipt = createReceiptMessage(caller, story.author, amount, fee, "GIFT");
        sendReceiptMessage(caller, story.author, receipt);

        let gift : RoseGiftOnStory = {
          storyId;
          gifter = caller;
          amount;
          timestamp = Time.now();
        };

        switch (storyGiftsMap.get(storyId)) {
          case (?gifts) {
            storyGiftsMap.add(storyId, gifts.concat([gift]));
          };
          case null {
            storyGiftsMap.add(storyId, [gift]);
          };
        };

        // Send gift notification to story author
        ignore createPostGiftNotification(caller, story.author, storyId.toText(), amount);
        #ok
      };
    };
  };

  // Group Chat System
  public type GroupChat = {
    id : Nat;
    name : Text;
    creator : Principal;
    admins : [Principal];
    participants : [Principal];
    avatar : ?Storage.ExternalBlob;
    createdAt : Time.Time;
  };

  public type GroupMessage = {
    id : Nat;
    groupId : Nat;
    sender : Principal;
    content : MessageType;
    timestamp : Time.Time;
    senderProfile : ?UserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  var nextGroupId = 0;
  var nextGroupMessageId = 0;
  var groupChats = Map.empty<Nat, GroupChat>();
  var groupMessages = Map.empty<Nat, [GroupMessage]>();
  var userGroups = Map.empty<Principal, [Nat]>();

  public shared ({ caller }) func createGroupChat(name : Text, initialParticipants : [Principal], avatar : ?Storage.ExternalBlob) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create group chats");
    };

    if (name.size() == 0) {
      Runtime.trap("Group name cannot be empty");
    };

    // Verify all participants exist and check blocking
    for (participant in initialParticipants.vals()) {
      switch (userProfiles.get(participant)) {
        case null {
          Runtime.trap("Participant " # participant.toText() # " not found");
        };
        case (?_) {};
      };

      // Check if creator has blocking relationship with any participant
      if (hasBlockingRelationship(caller, participant)) {
        Runtime.trap("Cannot create group: blocking relationship exists with " # participant.toText());
      };
    };

    let groupId = nextGroupId;
    nextGroupId += 1;

    // Creator is automatically included and is admin
    let allParticipants = if (initialParticipants.find(func(p : Principal) : Bool { p == caller }) == null) {
      [caller].concat(initialParticipants)
    } else {
      initialParticipants
    };

    let group : GroupChat = {
      id = groupId;
      name;
      creator = caller;
      admins = [caller];
      participants = allParticipants;
      avatar;
      createdAt = Time.now();
    };

    groupChats.add(groupId, group);
    groupMessages.add(groupId, []);

    // Add group to all participants' group lists
    for (participant in allParticipants.vals()) {
      switch (userGroups.get(participant)) {
        case (?groups) {
          userGroups.add(participant, groups.concat([groupId]));
        };
        case null {
          userGroups.add(participant, [groupId]);
        };
      };
    };

    groupId;
  };

  func isGroupAdmin(groupId : Nat, user : Principal) : Bool {
    switch (groupChats.get(groupId)) {
      case (?group) {
        group.admins.find(func(p : Principal) : Bool { p == user }) != null
      };
      case null false;
    };
  };

  func isGroupParticipant(groupId : Nat, user : Principal) : Bool {
    switch (groupChats.get(groupId)) {
      case (?group) {
        group.participants.find(func(p : Principal) : Bool { p == user }) != null
      };
      case null false;
    };
  };

  public shared ({ caller }) func addGroupParticipant(groupId : Nat, newParticipant : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add participants");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can add participants");
    };

    // Verify caller is still a participant
    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: You are no longer a participant of this group");
    };

    // Check blocking relationship between caller and new participant
    if (hasBlockingRelationship(caller, newParticipant)) {
      Runtime.trap("Cannot add participant: blocking relationship exists");
    };

    switch (userProfiles.get(newParticipant)) {
      case null {
        Runtime.trap("User not found");
      };
      case (?_) {};
    };

    switch (groupChats.get(groupId)) {
      case (?group) {
        // Check if already a participant
        if (group.participants.find(func(p : Principal) : Bool { p == newParticipant }) != null) {
          Runtime.trap("User is already a participant");
        };

        // Check blocking relationship with any existing participant
        for (participant in group.participants.vals()) {
          if (hasBlockingRelationship(participant, newParticipant)) {
            Runtime.trap("Cannot add participant: blocking relationship exists with existing member");
          };
        };

        let updatedGroup = {
          group with
          participants = group.participants.concat([newParticipant]);
        };
        groupChats.add(groupId, updatedGroup);

        // Add group to participant's group list
        switch (userGroups.get(newParticipant)) {
          case (?groups) {
            userGroups.add(newParticipant, groups.concat([groupId]));
          };
          case null {
            userGroups.add(newParticipant, [groupId]);
          };
        };

        // Send notification to new participant
        ignore createGroupAddNotification(caller, newParticipant, groupId, group.name);
      };
      case null {
        Runtime.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func removeGroupParticipant(groupId : Nat, participant : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove participants");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can remove participants");
    };

    // Verify caller is still a participant
    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: You are no longer a participant of this group");
    };

    switch (groupChats.get(groupId)) {
      case (?group) {
        // Cannot remove creator
        if (participant == group.creator) {
          Runtime.trap("Cannot remove group creator");
        };

        // Verify participant is actually in the group
        if (not isGroupParticipant(groupId, participant)) {
          Runtime.trap("User is not a participant of this group");
        };

        let updatedParticipants = group.participants.filter(func(p : Principal) : Bool { p != participant });
        let updatedAdmins = group.admins.filter(func(p : Principal) : Bool { p != participant });

        let updatedGroup = {
          group with
          participants = updatedParticipants;
          admins = updatedAdmins;
        };
        groupChats.add(groupId, updatedGroup);

        // Remove group from participant's group list
        switch (userGroups.get(participant)) {
          case (?groups) {
            userGroups.add(participant, groups.filter(func(g : Nat) : Bool { g != groupId }));
          };
          case null {};
        };
      };
      case null {
        Runtime.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func leaveGroup(groupId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can leave groups");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("You are not a participant of this group");
    };

    switch (groupChats.get(groupId)) {
      case (?group) {
        // Creator cannot leave their own group
        if (caller == group.creator) {
          Runtime.trap("Group creator cannot leave the group. Transfer ownership or delete the group instead.");
        };

        let updatedParticipants = group.participants.filter(func(p : Principal) : Bool { p != caller });
        let updatedAdmins = group.admins.filter(func(p : Principal) : Bool { p != caller });

        let updatedGroup = {
          group with
          participants = updatedParticipants;
          admins = updatedAdmins;
        };
        groupChats.add(groupId, updatedGroup);

        // Remove group from caller's group list
        switch (userGroups.get(caller)) {
          case (?groups) {
            userGroups.add(caller, groups.filter(func(g : Nat) : Bool { g != groupId }));
          };
          case null {};
        };
      };
      case null {
        Runtime.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func updateGroupName(groupId : Nat, newName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update group name");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can update group name");
    };

    // Verify caller is still a participant
    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: You are no longer a participant of this group");
    };

    if (newName.size() == 0) {
      Runtime.trap("Group name cannot be empty");
    };

    switch (groupChats.get(groupId)) {
      case (?group) {
        let updatedGroup = {
          group with
          name = newName;
        };
        groupChats.add(groupId, updatedGroup);
      };
      case null {
        Runtime.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func updateGroupAvatar(groupId : Nat, newAvatar : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update group avatar");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group admins can update group avatar");
    };

    // Verify caller is still a participant
    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: You are no longer a participant of this group");
    };

    switch (groupChats.get(groupId)) {
      case (?group) {
        let updatedGroup = {
          group with
          avatar = newAvatar;
        };
        groupChats.add(groupId, updatedGroup);
      };
      case null {
        Runtime.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func sendGroupMessage(groupId : Nat, content : MessageType, replyToId : ?Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send group messages");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group participants can send messages");
    };

    switch (groupChats.get(groupId)) {
      case (?group) {
        // Check if sender has blocking relationship with any participant
        for (participant in group.participants.vals()) {
          if (participant != caller and hasBlockingRelationship(caller, participant)) {
            Runtime.trap("Cannot send message: blocking relationship exists with group member");
          };
        };

        // Handle Rose gifting in groups
        switch (content) {
          case (#rose(_amount)) {
            Runtime.trap("Rose gifting in groups is not supported. Please gift individually.");
          };
          case (_) {};
        };

        let messageId = nextGroupMessageId;
        nextGroupMessageId += 1;

        let senderProfile = userProfiles.get(caller);

        let message : GroupMessage = {
          id = messageId;
          groupId;
          sender = caller;
          content;
          timestamp = Time.now();
          senderProfile;
          isEdited = false;
          isDeleted = false;
          reactions = [];
          readBy = [];
          replyToId;
        };

        switch (groupMessages.get(groupId)) {
          case (?messages) {
            groupMessages.add(groupId, messages.concat([message]));
          };
          case null {
            groupMessages.add(groupId, [message]);
          };
        };

        // Send notifications to all participants except sender
        let contentPreview = switch (content) {
          case (#text(t)) t;
          case (#image(_)) "Image";
          case (#video(_)) "Video";
          case (#voice(_)) "Voice message";
          case (#media(_)) "Media";
          case (_) "New message";
        };

        for (participant in group.participants.vals()) {
          if (participant != caller) {
            ignore createGroupMessageNotification(caller, participant, groupId, group.name, contentPreview);
          };
        };
      };
      case null {
        Runtime.trap("Group not found");
      };
    };
  };

  public query ({ caller }) func getGroupChats() : async [GroupChat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view group chats");
    };

    let buffer = Buffer.Buffer<GroupChat>(0);
    switch (userGroups.get(caller)) {
      case (?groupIds) {
        for (groupId in groupIds.vals()) {
          switch (groupChats.get(groupId)) {
            case (?group) buffer.add(group);
            case null {};
          };
        };
      };
      case null {};
    };

    Buffer.toArray(buffer);
  };

  public query ({ caller }) func getGroupMessages(groupId : Nat) : async [GroupMessage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view group messages");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group participants can view messages");
    };

    switch (groupMessages.get(groupId)) {
      case (?messages) messages;
      case null [];
    };
  };

  public query ({ caller }) func getGroupDetails(groupId : Nat) : async GroupChat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view group details");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group participants can view group details");
    };

    switch (groupChats.get(groupId)) {
      case (?group) group;
      case null {
        Runtime.trap("Group not found");
      };
    };
  };

  // Messaging System
  public type MessageType = {
    #text : Text;
    #image : Storage.ExternalBlob;
    #video : Storage.ExternalBlob;
    #voice : Storage.ExternalBlob;
    #media : Storage.ExternalBlob;
    #rose : Float;
    #receipt : ReceiptMessage;
    #tradeRequest : TradeRequestMessage;
    #forwardedPost : {
      postId : Text;
      author : Principal;
      contentSnippet : Text;
      timestamp : Time.Time;
      image : ?Storage.ExternalBlob;
    };
  };

  public type ReceiptMessage = {
    sender : Principal;
    receiver : Principal;
    amount : Float;
    fee : Float;
    timestamp : Time.Time;
    summary : Text;
  };

  public type TradeRequestMessage = {
    requester : Principal;
    amount : Float;
    requestType : Text; // "BUY" or "SELL"
    timestamp : Time.Time;
    summary : Text;
  };

  public type Message = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : MessageType;
    timestamp : Time.Time;
    senderProfile : ?UserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  public type Conversation = {
    id : Nat;
    participants : [Principal];
    messages : [Message];
    otherParticipantProfile : ?UserProfile;
  };

  var nextMessageId = 0;
  var nextConversationId = 0;
  var conversations = Map.empty<Nat, Conversation>();

  // Pinned messages: conversationId -> pinnedMessageId
  var conversationPinnedMessages = Map.empty<Nat, Nat>();
  // Pinned group messages: groupId -> pinnedGroupMessageId
  var groupPinnedMessages = Map.empty<Nat, Nat>();

  func createTradeRequestMessage(requester : Principal, amount : Float, requestType : Text) : TradeRequestMessage {
    {
      requester;
      amount;
      requestType;
      timestamp = Time.now();
      summary = requestType # " " # Float.toText(amount) # " ROSES";
    };
  };

  func createReceiptMessage(sender : Principal, receiver : Principal, amount : Float, fee : Float, transactionType : Text) : ReceiptMessage {
    {
      sender;
      receiver;
      amount;
      fee;
      timestamp = Time.now();
      summary = transactionType # " " # Float.toText(amount) # " ROSES";
    };
  };

  public shared ({ caller }) func sendMessage(receiver : Principal, content : MessageType, replyToId : ?Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    if (caller == receiver) {
      Runtime.trap("Cannot send messages to yourself");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, receiver)) {
      Runtime.trap("Cannot send message: blocking relationship exists");
    };

    switch (userProfiles.get(receiver)) {
      case null {
        Runtime.trap("Receiver profile not found");
      };
      case (?_) {};
    };

    switch (content) {
      case (#rose(amount)) {
        if (amount < 0.01) {
          Runtime.trap("Minimum gift amount is 0.01 Rose");
        };
        let senderBalance = switch (roseBalances.get(caller)) {
          case null { 0.0 };
          case (?balance) { balance };
        };
        if (senderBalance < amount) {
          Runtime.trap("Insufficient balance to gift " # Float.toText(amount) # " Roses");
        };
        let fee = giftRosesInternal(caller, receiver, amount);

        let receipt = createReceiptMessage(caller, receiver, amount, fee, "GIFT");
        sendReceiptMessage(caller, receiver, receipt);

        // Send notification to receiver
        ignore createRoseGiftNotification(caller, receiver, amount, nextRoseTransactionId - 1);
      };
      case (#forwardedPost(postDetails)) {
        // Verify post exists
        switch (posts.get(postDetails.postId)) {
          case null {
            Runtime.trap("Post not found");
          };
          case (?_) {};
        };

        let senderProfile = userProfiles.get(caller);
        let messageId = nextMessageId;
        nextMessageId += 1;
        let message : Message = {
          id = messageId;
          sender = caller;
          receiver;
          content = #forwardedPost(postDetails);
          timestamp = Time.now();
          senderProfile;
          isEdited = false;
          isDeleted = false;
          reactions = [];
          readBy = [];
          replyToId = null;
        };

        func findConversation() : ?(Nat, Conversation) {
          for ((id, conv) in conversations.entries()) {
            if (conv.participants.size() == 2) {
              let p1 = conv.participants[0];
              let p2 = conv.participants[1];
              if (
                (p1 == caller and p2 == receiver) or
                (p1 == receiver and p2 == caller)
              ) {
                return ?(id, conv);
              };
            };
          };
          null;
        };

        let otherParticipantProfile = userProfiles.get(receiver);

        switch (findConversation()) {
          case (?foundConv) {
            let (convId, conv) = foundConv;
            let updatedConv = {
              id = convId;
              participants = conv.participants;
              messages = conv.messages.concat([message]);
              otherParticipantProfile;
            };
            conversations.add(convId, updatedConv);
          };
          case null {
            let convId = nextConversationId;
            nextConversationId += 1;
            let newConv = {
              id = convId;
              participants = [caller, receiver];
              messages = [message];
              otherParticipantProfile;
            };
            conversations.add(convId, newConv);
          };
        };

        // Send message notification
        ignore createMessageNotification(caller, receiver, "Forwarded a post", nextConversationId - 1);
        return;
      };
      case (_) {};
    };

    let messageId = nextMessageId;
    nextMessageId += 1;

    let senderProfile = userProfiles.get(caller);

    let message : Message = {
      id = messageId;
      sender = caller;
      receiver;
      content;
      timestamp = Time.now();
      senderProfile;
      isEdited = false;
      isDeleted = false;
      reactions = [];
      readBy = [];
      replyToId;
    };

    func findConversation() : ?(Nat, Conversation) {
      for ((id, conv) in conversations.entries()) {
        if (conv.participants.size() == 2) {
          let p1 = conv.participants[0];
          let p2 = conv.participants[1];
          if (
            (p1 == caller and p2 == receiver) or
            (p1 == receiver and p2 == caller)
          ) {
            return ?(id, conv);
          };
        };
      };
      null;
    };

    let otherParticipantProfile = userProfiles.get(receiver);

    switch (findConversation()) {
      case (?foundConv) {
        let (convId, conv) = foundConv;
        let updatedConv = {
          id = convId;
          participants = conv.participants;
          messages = conv.messages.concat([message]);
          otherParticipantProfile;
        };
        conversations.add(convId, updatedConv);

        // Send message notification
        let contentPreview = switch (content) {
          case (#text(t)) t;
          case (#image(_)) "Image";
          case (#video(_)) "Video";
          case (#voice(_)) "Voice message";
          case (#media(_)) "Media";
          case (_) "New message";
        };
        ignore createMessageNotification(caller, receiver, contentPreview, convId);
      };
      case null {
        let convId = nextConversationId;
        nextConversationId += 1;
        let newConv = {
          id = convId;
          participants = [caller, receiver];
          messages = [message];
          otherParticipantProfile;
        };
        conversations.add(convId, newConv);

        // Send message notification
        let contentPreview = switch (content) {
          case (#text(t)) t;
          case (#image(_)) "Image";
          case (#video(_)) "Video";
          case (#voice(_)) "Voice message";
          case (#media(_)) "Media";
          case (_) "New message";
        };
        ignore createMessageNotification(caller, receiver, contentPreview, convId);
      };
    };
  };

  public shared ({ caller }) func leaveConversation(conversationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can leave conversations");
    };

    switch (conversations.get(conversationId)) {
      case (?conv) {
        // Verify caller is participant
        if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
          Runtime.trap("You are not a participant of this conversation");
        };

        // Remove caller from participants
        let updatedParticipants = conv.participants.filter(func(p : Principal) : Bool { p != caller });

        // If no participants left, delete conversation
        if (updatedParticipants.size() == 0) {
          conversations.remove(conversationId);
        } else {
          let updatedConv = {
            conv with
            participants = updatedParticipants;
          };
          conversations.add(conversationId, updatedConv);
        };
      };
      case null {
        Runtime.trap("Conversation not found");
      };
    };
  };

  public shared ({ caller }) func editMessage(conversationId : Nat, messageId : Nat, newText : Text) : async { #ok : Message; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can edit messages");
    };

    switch (conversations.get(conversationId)) {
      case (?conv) {
        if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
          return #err("Unauthorized: Only conversation participants can edit messages");
        };

        var updatedMsg : ?Message = null;
        let updatedMessages = conv.messages.map(func(msg : Message) : Message {
          if (msg.id == messageId) {
            if (msg.sender != caller) {
              Runtime.trap("Unauthorized: Only message sender can edit this message");
            };
            if (msg.isDeleted) {
              Runtime.trap("Cannot edit a deleted message");
            };
            switch (msg.content) {
              case (#text(_)) {};
              case (_) {
                Runtime.trap("Only text messages can be edited");
              };
            };
            let edited = { msg with content = #text(newText); isEdited = true };
            updatedMsg := ?edited;
            edited
          } else {
            msg
          }
        });

        switch (updatedMsg) {
          case null { return #err("Message not found") };
          case (?editedMsg) {
            let updatedConv = { conv with messages = updatedMessages };
            conversations.add(conversationId, updatedConv);
            #ok(editedMsg)
          };
        };
      };
      case null { #err("Conversation not found") };
    };
  };

  public shared ({ caller }) func deleteMessage(conversationId : Nat, messageId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can delete messages");
    };

    switch (conversations.get(conversationId)) {
      case (?conv) {
        if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
          return #err("Unauthorized: Only conversation participants can delete messages");
        };

        let messageToDelete = conv.messages.find(func(msg : Message) : Bool { msg.id == messageId });
        switch (messageToDelete) {
          case null { return #err("Message not found") };
          case (?msg) {
            if (msg.sender != caller and not AccessControl.isAdmin(accessControlState, caller)) {
              return #err("Unauthorized: Only message sender or admin can delete this message");
            };
          };
        };

        let updatedMessages = conv.messages.map(func(msg : Message) : Message {
          if (msg.id == messageId) {
            { msg with content = #text("[Message deleted]"); isDeleted = true }
          } else {
            msg
          }
        });

        let updatedConv = { conv with messages = updatedMessages };
        conversations.add(conversationId, updatedConv);
        #ok;
      };
      case null { #err("Conversation not found") };
    };
  };

  public shared ({ caller }) func forwardMessage(sourceConversationId : Nat, messageId : Nat, targetConversationId : Nat) : async { #ok : Message; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can forward messages");
    };

    // Find source message
    let sourceMsg = switch (conversations.get(sourceConversationId)) {
      case null { return #err("Source conversation not found") };
      case (?conv) {
        if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
          return #err("Unauthorized: You are not a participant of the source conversation");
        };
        switch (conv.messages.find(func(msg : Message) : Bool { msg.id == messageId })) {
          case null { return #err("Message not found") };
          case (?msg) {
            if (msg.isDeleted) { return #err("Cannot forward a deleted message") };
            msg
          };
        };
      };
    };

    // Find target conversation and get the receiver
    switch (conversations.get(targetConversationId)) {
      case null { return #err("Target conversation not found") };
      case (?targetConv) {
        if (targetConv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
          return #err("Unauthorized: You are not a participant of the target conversation");
        };

        let receiver = switch (targetConv.participants.find(func(p : Principal) : Bool { p != caller })) {
          case null { return #err("Could not determine receiver") };
          case (?r) r;
        };

        let newMsgId = nextMessageId;
        nextMessageId += 1;

        let senderProfile = userProfiles.get(caller);
        let forwarded : Message = {
          id = newMsgId;
          sender = caller;
          receiver;
          content = sourceMsg.content;
          timestamp = Time.now();
          senderProfile;
          isEdited = false;
          isDeleted = false;
          reactions = [];
          readBy = [];
          replyToId = null;
        };

        let updatedMessages = targetConv.messages.concat([forwarded]);
        let updatedConv = { targetConv with messages = updatedMessages };
        conversations.add(targetConversationId, updatedConv);

        let contentPreview = switch (sourceMsg.content) {
          case (#text(t)) t;
          case (#image(_)) "Image";
          case (#video(_)) "Video";
          case (#voice(_)) "Voice message";
          case (#media(_)) "Media";
          case (_) "Forwarded message";
        };
        ignore createMessageNotification(caller, receiver, contentPreview, targetConversationId);
        #ok(forwarded)
      };
    };
  };

  public shared ({ caller }) func editGroupMessage(groupId : Nat, messageId : Nat, newText : Text) : async { #ok : GroupMessage; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can edit group messages");
    };

    if (not isGroupParticipant(groupId, caller)) {
      return #err("Unauthorized: Only group participants can edit messages");
    };

    switch (groupMessages.get(groupId)) {
      case null { return #err("Group not found or no messages") };
      case (?messages) {
        var updatedMsg : ?GroupMessage = null;
        let updatedMessages = messages.map(func(msg : GroupMessage) : GroupMessage {
          if (msg.id == messageId) {
            if (msg.sender != caller) {
              Runtime.trap("Unauthorized: Only message sender can edit this message");
            };
            if (msg.isDeleted) {
              Runtime.trap("Cannot edit a deleted message");
            };
            switch (msg.content) {
              case (#text(_)) {};
              case (_) {
                Runtime.trap("Only text messages can be edited");
              };
            };
            let edited = { msg with content = #text(newText); isEdited = true };
            updatedMsg := ?edited;
            edited
          } else {
            msg
          }
        });

        switch (updatedMsg) {
          case null { return #err("Message not found") };
          case (?editedMsg) {
            groupMessages.add(groupId, updatedMessages);
            #ok(editedMsg)
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteGroupMessage(groupId : Nat, messageId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can delete group messages");
    };

    if (not isGroupParticipant(groupId, caller)) {
      return #err("Unauthorized: Only group participants can delete messages");
    };

    switch (groupMessages.get(groupId)) {
      case null { return #err("Group not found or no messages") };
      case (?messages) {
        let msgToDelete = messages.find(func(msg : GroupMessage) : Bool { msg.id == messageId });
        switch (msgToDelete) {
          case null { return #err("Message not found") };
          case (?msg) {
            if (msg.sender != caller and not isGroupAdmin(groupId, caller)) {
              return #err("Unauthorized: Only message sender or group admin can delete this message");
            };
          };
        };

        let updatedMessages = messages.map(func(msg : GroupMessage) : GroupMessage {
          if (msg.id == messageId) {
            { msg with content = #text("[Message deleted]"); isDeleted = true }
          } else {
            msg
          }
        });

        groupMessages.add(groupId, updatedMessages);
        #ok;
      };
    };
  };

  public shared ({ caller }) func forwardMessageToGroup(sourceConversationId : Nat, messageId : Nat, targetGroupId : Nat) : async { #ok : GroupMessage; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can forward messages");
    };

    // Find source message
    let sourceMsg = switch (conversations.get(sourceConversationId)) {
      case null { return #err("Source conversation not found") };
      case (?conv) {
        if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
          return #err("Unauthorized: You are not a participant of the source conversation");
        };
        switch (conv.messages.find(func(msg : Message) : Bool { msg.id == messageId })) {
          case null { return #err("Message not found") };
          case (?msg) {
            if (msg.isDeleted) { return #err("Cannot forward a deleted message") };
            msg
          };
        };
      };
    };

    if (not isGroupParticipant(targetGroupId, caller)) {
      return #err("Unauthorized: You are not a participant of the target group");
    };

    let targetGroup = switch (groupChats.get(targetGroupId)) {
      case null { return #err("Target group not found") };
      case (?g) g;
    };

    let newMsgId = nextGroupMessageId;
    nextGroupMessageId += 1;

    let senderProfile = userProfiles.get(caller);
    let forwarded : GroupMessage = {
      id = newMsgId;
      groupId = targetGroupId;
      sender = caller;
      content = sourceMsg.content;
      timestamp = Time.now();
      senderProfile;
      isEdited = false;
      isDeleted = false;
      reactions = [];
      readBy = [];
      replyToId = null;
    };

    switch (groupMessages.get(targetGroupId)) {
      case (?msgs) { groupMessages.add(targetGroupId, msgs.concat([forwarded])) };
      case null { groupMessages.add(targetGroupId, [forwarded]) };
    };

    let contentPreview = switch (sourceMsg.content) {
      case (#text(t)) t;
      case (#image(_)) "Image";
      case (#video(_)) "Video";
      case (#voice(_)) "Voice message";
      case (#media(_)) "Media";
      case (_) "Forwarded message";
    };
    for (participant in targetGroup.participants.vals()) {
      if (participant != caller) {
        ignore createGroupMessageNotification(caller, participant, targetGroupId, targetGroup.name, contentPreview);
      };
    };
    #ok(forwarded)
  };

  public shared ({ caller }) func forwardGroupMessageToConversation(sourceGroupId : Nat, messageId : Nat, targetConversationId : Nat) : async { #ok : Message; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized: Only users can forward messages");
    };

    if (not isGroupParticipant(sourceGroupId, caller)) {
      return #err("Unauthorized: You are not a participant of the source group");
    };

    // Find source message
    let sourceMsg = switch (groupMessages.get(sourceGroupId)) {
      case null { return #err("Source group has no messages") };
      case (?msgs) {
        switch (msgs.find(func(msg : GroupMessage) : Bool { msg.id == messageId })) {
          case null { return #err("Message not found") };
          case (?msg) {
            if (msg.isDeleted) { return #err("Cannot forward a deleted message") };
            msg
          };
        };
      };
    };

    // Find target conversation
    switch (conversations.get(targetConversationId)) {
      case null { return #err("Target conversation not found") };
      case (?targetConv) {
        if (targetConv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
          return #err("Unauthorized: You are not a participant of the target conversation");
        };

        let receiver = switch (targetConv.participants.find(func(p : Principal) : Bool { p != caller })) {
          case null { return #err("Could not determine receiver") };
          case (?r) r;
        };

        let newMsgId = nextMessageId;
        nextMessageId += 1;

        let senderProfile = userProfiles.get(caller);
        let forwarded : Message = {
          id = newMsgId;
          sender = caller;
          receiver;
          content = sourceMsg.content;
          timestamp = Time.now();
          senderProfile;
          isEdited = false;
          isDeleted = false;
          reactions = [];
          readBy = [];
          replyToId = null;
        };

        let updatedMessages = targetConv.messages.concat([forwarded]);
        let updatedConv = { targetConv with messages = updatedMessages };
        conversations.add(targetConversationId, updatedConv);

        let contentPreview = switch (sourceMsg.content) {
          case (#text(t)) t;
          case (#image(_)) "Image";
          case (#video(_)) "Video";
          case (#voice(_)) "Voice message";
          case (#media(_)) "Media";
          case (_) "Forwarded message";
        };
        ignore createMessageNotification(caller, receiver, contentPreview, targetConversationId);
        #ok(forwarded)
      };
    };
  };

  func sendReceiptMessage(sender : Principal, receiver : Principal, receipt : ReceiptMessage) {
    let messageId = nextMessageId;
    nextMessageId += 1;

    let senderProfile = userProfiles.get(sender);

    let message : Message = {
      id = messageId;
      sender;
      receiver;
      content = #receipt(receipt);
      timestamp = Time.now();
      senderProfile;
      isEdited = false;
      isDeleted = false;
      reactions = [];
      readBy = [];
      replyToId = null;
    };

    func findConversation() : ?(Nat, Conversation) {
      for ((id, conv) in conversations.entries()) {
        if (conv.participants.size() == 2) {
          let p1 = conv.participants[0];
          let p2 = conv.participants[1];
          if (
            (p1 == sender and p2 == receiver) or
            (p1 == receiver and p2 == sender)
          ) {
            return ?(id, conv);
          };
        };
      };
      null;
    };

    let otherParticipantProfile = userProfiles.get(receiver);

    switch (findConversation()) {
      case (?foundConv) {
        let (convId, conv) = foundConv;
        let updatedConv = {
          id = convId;
          participants = conv.participants;
          messages = conv.messages.concat([message]);
          otherParticipantProfile;
        };
        conversations.add(convId, updatedConv);
      };
      case null {
        let convId = nextConversationId;
        nextConversationId += 1;
        let newConv = {
          id = convId;
          participants = [sender, receiver];
          messages = [message];
          otherParticipantProfile;
        };
        conversations.add(convId, newConv);
      };
    };
  };

  func sendTradeRequestMessage(requester : Principal, admin : Principal, tradeRequest : TradeRequestMessage) {
    let messageId = nextMessageId;
    nextMessageId += 1;

    let senderProfile = userProfiles.get(requester);

    let message : Message = {
      id = messageId;
      sender = requester;
      receiver = admin;
      content = #tradeRequest(tradeRequest);
      timestamp = Time.now();
      senderProfile;
      isEdited = false;
      isDeleted = false;
      reactions = [];
      readBy = [];
      replyToId = null;
    };

    func findConversation() : ?(Nat, Conversation) {
      for ((id, conv) in conversations.entries()) {
        if (conv.participants.size() == 2) {
          let p1 = conv.participants[0];
          let p2 = conv.participants[1];
          if (
            (p1 == requester and p2 == admin) or
            (p1 == admin and p2 == requester)
          ) {
            return ?(id, conv);
          };
        };
      };
      null;
    };

    let otherParticipantProfile = userProfiles.get(admin);

    switch (findConversation()) {
      case (?foundConv) {
        let (convId, conv) = foundConv;
        let updatedConv = {
          id = convId;
          participants = conv.participants;
          messages = conv.messages.concat([message]);
          otherParticipantProfile;
        };
        conversations.add(convId, updatedConv);
      };
      case null {
        let convId = nextConversationId;
        nextConversationId += 1;
        let newConv = {
          id = convId;
          participants = [requester, admin];
          messages = [message];
          otherParticipantProfile;
        };
        conversations.add(convId, newConv);
      };
    };

    // Send trade request notification to admin
    // (notification is sent by the callers - requestBuyRoses / requestSellRoses)
  };

  public query ({ caller }) func getConversations() : async [Conversation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };

    let buffer = Buffer.Buffer<Conversation>(0);
    for ((__id, conv) in conversations.entries()) {
      let isParticipant = conv.participants.find(func(p) { p == caller });
      switch (isParticipant) {
        case (?_) {
          let otherParticipant = conv.participants.find(
            func(p) { p != caller },
          );

          let convWithProfile = {
            conv with
            otherParticipantProfile = switch (otherParticipant) {
              case (null) null;
              case (?id) userProfiles.get(id);
            };
          };
          buffer.add(convWithProfile);
        };
        case null {};
      };
    };
    Buffer.toArray(buffer);
  };

  // Social Features

  // Legacy post type (before embed and viewCount were added) – used for stable migration
  type PostV1 = {
    id : Text;
    author : Principal;
    content : Text;
    timestamp : Time.Time;
    image : ?Storage.ExternalBlob;
  };

  public type Post = {
    id : Text;
    author : Principal;
    content : Text;
    timestamp : Time.Time;
    image : ?Storage.ExternalBlob;
    embed : ?Text;
    viewCount : Nat;
  };

  var posts = Map.empty<Text, Post>();

  // Pinned Trending Post
  // Only one post can be pinned at a time; stored as an optional post ID.
  var pinnedTrendingPostId : ?Text = null;

  // Pin a post to the top of the Trending tab. Admin-only action.
  public shared ({ caller }) func pinPostToTrending(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can pin posts to trending");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?_) {};
    };

    pinnedTrendingPostId := ?postId;
  };

  // Unpin the currently pinned trending post. Admin-only action.
  public shared ({ caller }) func unpinTrendingPost() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can unpin trending posts");
    };

    pinnedTrendingPostId := null;
  };

  // Get the currently pinned trending post. Any authenticated user can read.
  public query ({ caller }) func getPinnedTrendingPost() : async ?Post {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view the pinned trending post");
    };

    switch (pinnedTrendingPostId) {
      case null { null };
      case (?postId) {
        switch (posts.get(postId)) {
          case null {
            // Post was deleted after being pinned; return null gracefully
            null
          };
          case (?post) {
            // Filter out if caller has a blocking relationship with the post author
            if (hasBlockingRelationship(caller, post.author)) {
              null
            } else {
              ?post
            };
          };
        };
      };
    };
  };

  // Post Interactions
  public type LikeInteraction = {
    postId : Text;
    user : Principal;
    timestamp : Time.Time;
  };

  public type CommentInteraction = {
    id : Nat;
    postId : Text;
    user : Principal;
    comment : Text;
    timestamp : Time.Time;
    parentCommentId : ?Nat;
  };

  public type SaveInteraction = {
    postId : Text;
    user : Principal;
    timestamp : Time.Time;
  };

  public type ForwardInteraction = {
    postId : Text;
    user : Principal;
    conversationId : Nat;
    timestamp : Time.Time;
  };

  public type RoseGiftOnPost = {
    postId : Text;
    gifter : Principal;
    amount : Float;
    timestamp : Time.Time;
  };

  var nextCommentId = 0;

  var likesMap = Map.empty<Text, [LikeInteraction]>();
  var commentsMap = Map.empty<Text, [CommentInteraction]>();
  var savesMap = Map.empty<Text, [SaveInteraction]>();
  var forwardsMap = Map.empty<Text, [ForwardInteraction]>();
  var postRoseGiftsMap = Map.empty<Text, [RoseGiftOnPost]>();
  // Tracks which principals have viewed each post (for unique view counting)
  var postViewersMap = Map.empty<Text, [Principal]>();

  public shared ({ caller }) func createPost(content : Text, image : ?Storage.ExternalBlob, embed : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };

    let post : Post = {
      id = caller.toText() # "-" # debug_show (Time.now());
      author = caller;
      content;
      timestamp = Time.now();
      image;
      embed;
      viewCount = 0;
    };

    posts.add(post.id, post);
  };

  public shared ({ caller }) func editPost(postId : Text, content : Text, image : ?Storage.ExternalBlob, embed : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit posts");
    };

    switch (posts.get(postId)) {
      case (?post) {
        if (post.author != caller) {
          Runtime.trap("Unauthorized: Only the post author can edit this post");
        };
        let updatedPost = {
          post with
          content;
          image;
          embed;
        };
        posts.add(postId, updatedPost);
      };
      case null {
        Runtime.trap("Post not found");
      };
    };
  };

  public shared ({ caller }) func deletePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };

    switch (posts.get(postId)) {
      case (?post) {
        if (post.author != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the post author or admin can delete this post");
        };
        posts.remove(postId);
        likesMap.remove(postId);
        commentsMap.remove(postId);
        savesMap.remove(postId);
        forwardsMap.remove(postId);
        postRoseGiftsMap.remove(postId);
        postViewersMap.remove(postId);
        // Clear pin if the deleted post was pinned
        switch (pinnedTrendingPostId) {
          case (?pinnedId) {
            if (pinnedId == postId) {
              pinnedTrendingPostId := null;
            };
          };
          case null {};
        };
      };
      case null {
        Runtime.trap("Post not found");
      };
    };
  };

  // Record a post view and increment viewCount (each caller counted only once per post).
  public shared ({ caller }) func recordPostView(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record post views");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?post) {
        // Only increment once per caller (use postViewersMap to track)
        let alreadyViewed = switch (postViewersMap.get(postId)) {
          case null { false };
          case (?viewers) {
            viewers.find(func(p : Principal) : Bool { p == caller }) != null
          };
        };
        if (not alreadyViewed) {
          // Track this viewer
          switch (postViewersMap.get(postId)) {
            case null { postViewersMap.add(postId, [caller]) };
            case (?viewers) { postViewersMap.add(postId, viewers.concat([caller])) };
          };
          // Increment viewCount on the post
          let updatedPost = { post with viewCount = post.viewCount + 1 };
          posts.add(postId, updatedPost);
        };
      };
    };
  };

  // Return the view count for a post.
  public query ({ caller }) func getPostViewCount(postId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view post counts");
    };

    switch (posts.get(postId)) {
      case null { 0 };
      case (?post) { post.viewCount };
    };
  };

  public shared ({ caller }) func likePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?post) {
        // Check blocking relationship
        if (hasBlockingRelationship(caller, post.author)) {
          Runtime.trap("Cannot like post: blocking relationship exists");
        };

        let like : LikeInteraction = {
          postId;
          user = caller;
          timestamp = Time.now();
        };

        switch (likesMap.get(postId)) {
          case (?likes) {
            let alreadyLiked = likes.find(func(l : LikeInteraction) : Bool { l.user == caller });
            switch (alreadyLiked) {
              case null {
                likesMap.add(postId, likes.concat([like]));
                // Send like notification to post author
                if (post.author != caller) {
                  ignore createLikeNotification(caller, post.author, postId, post.content);
                };
              };
              case (?_) {};
            };
          };
          case null {
            likesMap.add(postId, [like]);
            // Send like notification to post author
            if (post.author != caller) {
              ignore createLikeNotification(caller, post.author, postId, post.content);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike posts");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?_) {
        switch (likesMap.get(postId)) {
          case (?likes) {
            likesMap.add(postId, likes.filter(func(l : LikeInteraction) : Bool { l.user != caller }));
          };
          case null {};
        };
      };
    };
  };

  public shared ({ caller }) func commentOnPost(postId : Text, comment : Text, parentCommentId : ?Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment on posts");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?post) {
        // Check blocking relationship
        if (hasBlockingRelationship(caller, post.author)) {
          Runtime.trap("Cannot comment on post: blocking relationship exists");
        };

        let commentId = nextCommentId;
        nextCommentId += 1;

        let commentInteraction : CommentInteraction = {
          id = commentId;
          postId;
          user = caller;
          comment;
          timestamp = Time.now();
          parentCommentId;
        };

        switch (commentsMap.get(postId)) {
          case (?comments) {
            commentsMap.add(postId, comments.concat([commentInteraction]));
          };
          case null {
            commentsMap.add(postId, [commentInteraction]);
          };
        };

        // Send comment notification to post author
        if (post.author != caller) {
          ignore createCommentNotification(caller, post.author, postId, comment);
        };
      };
    };
  };

  public shared ({ caller }) func deleteComment(postId : Text, commentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete comments");
    };

    switch (commentsMap.get(postId)) {
      case (?comments) {
        let commentToDelete = comments.find(func(c : CommentInteraction) : Bool { c.id == commentId });
        switch (commentToDelete) {
          case (?comment) {
            if (comment.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: Only the comment author or admin can delete this comment");
            };
            let updatedComments = comments.filter(func(c : CommentInteraction) : Bool { c.id != commentId });
            commentsMap.add(postId, updatedComments);
          };
          case null {
            Runtime.trap("Comment not found");
          };
        };
      };
      case null {
        Runtime.trap("No comments found for this post");
      };
    };
  };

  public query ({ caller }) func getPostComments(postId : Text) : async [CommentInteraction] {
    // Require authentication to view comments
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view comments");
    };

    switch (commentsMap.get(postId)) {
      case (?comments) comments;
      case null [];
    };
  };

  public shared ({ caller }) func savePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save posts");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?_) {
        let save : SaveInteraction = {
          postId;
          user = caller;
          timestamp = Time.now();
        };

        switch (savesMap.get(postId)) {
          case (?saves) {
            let alreadySaved = saves.find(func(s : SaveInteraction) : Bool { s.user == caller });
            switch (alreadySaved) {
              case null {
                savesMap.add(postId, saves.concat([save]));
              };
              case (?_) {};
            };
          };
          case null {
            savesMap.add(postId, [save]);
          };
        };
      };
    };
  };

  public shared ({ caller }) func unsavePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unsave posts");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?_) {
        switch (savesMap.get(postId)) {
          case (?saves) {
            savesMap.add(postId, saves.filter(func(s : SaveInteraction) : Bool { s.user != caller }));
          };
          case null {};
        };
      };
    };
  };

  public query ({ caller }) func getSavedPosts(limit : Nat, offset : Nat) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view saved posts");
    };

    let buffer = Buffer.Buffer<Post>(0);
    for ((postId, saves) in savesMap.entries()) {
      let userSaved = saves.find(func(s : SaveInteraction) : Bool { s.user == caller });
      switch (userSaved) {
        case (?_) {
          switch (posts.get(postId)) {
            case (?post) buffer.add(post);
            case null {};
          };
        };
        case null {};
      };
    };
    let all = Buffer.toArray(buffer);
    let total = all.size();
    if (offset >= total) { return [] };
    let end = if (offset + limit > total) { total } else { offset + limit };
    all.sliceToArray(offset.toInt(), end.toInt());
  };

  public shared ({ caller }) func forwardPostToConversation(postId : Text, conversationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can forward posts");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?post) {
        switch (conversations.get(conversationId)) {
          case null {
            Runtime.trap("Conversation not found");
          };
          case (?conv) {
            let isParticipant = conv.participants.find(func(p : Principal) : Bool { p == caller });
            switch (isParticipant) {
              case null {
                Runtime.trap("Unauthorized: Only conversation participants can forward posts to it");
              };
              case (?_) {
                let postDetails = {
                  postId = post.id;
                  author = post.author;
                  contentSnippet = if (post.content.size() > 50) {
                    post.content.trim(#char ' ')
                  } else {
                    post.content
                  };
                  timestamp = post.timestamp;
                  image = post.image;
                };

                // Send the post as a message in the conversation
                let receiver = if (conv.participants[0] == caller) {
                  conv.participants[1]
                } else {
                  conv.participants[0]
                };

                await sendMessage(receiver, #forwardedPost(postDetails), null);
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func giftRosesOnPost(postId : Text, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can gift Roses on posts");
    };

    if (amount < 0.01) {
      Runtime.trap("Minimum gift amount is 0.01 Rose");
    };

    switch (posts.get(postId)) {
      case null {
        Runtime.trap("Post not found");
      };
      case (?post) {
        if (post.author == caller) {
          Runtime.trap("Cannot gift Roses to your own post");
        };

        // Check blocking relationship
        if (hasBlockingRelationship(caller, post.author)) {
          Runtime.trap("Cannot gift Roses: blocking relationship exists");
        };

        let fee = giftRosesInternal(caller, post.author, amount);

        let receipt = createReceiptMessage(caller, post.author, amount, fee, "GIFT");
        sendReceiptMessage(caller, post.author, receipt);

        let gift : RoseGiftOnPost = {
          postId;
          gifter = caller;
          amount;
          timestamp = Time.now();
        };

        switch (postRoseGiftsMap.get(postId)) {
          case (?gifts) {
            postRoseGiftsMap.add(postId, gifts.concat([gift]));
          };
          case null {
            postRoseGiftsMap.add(postId, [gift]);
          };
        };

        // Send post gift notification to post author
        ignore createPostGiftNotification(caller, post.author, postId, amount);
      };
    };
  };

  public query ({ caller }) func getPostInteractions(postId : Text) : async {
    likes : Nat;
    comments : Nat;
    saves : Nat;
    forwards : Nat;
    roseGifts : Nat;
    totalRosesGifted : Float;
  } {
    // Require authentication to view post interactions
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view post interactions");
    };

    let likesCount = switch (likesMap.get(postId)) {
      case (?likes) likes.size();
      case null 0;
    };

    let commentsCount = switch (commentsMap.get(postId)) {
      case (?comments) comments.size();
      case null 0;
    };

    let savesCount = switch (savesMap.get(postId)) {
      case (?saves) saves.size();
      case null 0;
    };

    let forwardsCount = switch (forwardsMap.get(postId)) {
      case (?forwards) forwards.size();
      case null 0;
    };

    let (roseGiftsCount, totalRoses) = switch (postRoseGiftsMap.get(postId)) {
      case (?gifts) {
        var total = 0.0;
        for (gift in gifts.vals()) {
          total += gift.amount;
        };
        (gifts.size(), total);
      };
      case null (0, 0.0);
    };

    {
      likes = likesCount;
      comments = commentsCount;
      saves = savesCount;
      forwards = forwardsCount;
      roseGifts = roseGiftsCount;
      totalRosesGifted = totalRoses;
    };
  };

  public query ({ caller }) func getPosts(limit : Nat, offset : Nat) : async [Post] {
    // Require authentication to view posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view posts");
    };

    let buffer = Buffer.Buffer<Post>(0);
    for ((_postId, post) in posts.entries()) {
      if (not hasBlockingRelationship(caller, post.author)) {
        buffer.add(post);
      };
    };
    // Sort by timestamp descending so newest posts appear first on page 1
    let sorted = Buffer.toArray(buffer).sort(func(a : Post, b : Post) : { #less; #equal; #greater } {
      Int.compare(b.timestamp, a.timestamp)
    });
    let total = sorted.size();
    if (offset >= total) { return [] };
    let end = if (offset + limit > total) { total } else { offset + limit };
    sorted.sliceToArray(offset.toInt(), end.toInt());
  };

  public query ({ caller }) func getCallerPosts(limit : Nat, offset : Nat) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their own posts");
    };

    let buffer = Buffer.Buffer<Post>(0);
    for ((__id, post) in posts.entries()) {
      if (post.author == caller) {
        buffer.add(post);
      };
    };
    // Sort by timestamp descending so newest posts appear first
    let sorted = Buffer.toArray(buffer).sort(func(a : Post, b : Post) : { #less; #equal; #greater } {
      Int.compare(b.timestamp, a.timestamp)
    });
    let total = sorted.size();
    if (offset >= total) { return [] };
    let end = if (offset + limit > total) { total } else { offset + limit };
    sorted.sliceToArray(offset.toInt(), end.toInt());
  };

  public query ({ caller }) func getUserPosts(userId : Principal, limit : Nat, offset : Nat) : async [Post] {
    // Require authentication to view user posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view user posts");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, userId)) {
      Runtime.trap("Cannot view posts: blocking relationship exists");
    };

    let buffer = Buffer.Buffer<Post>(0);
    for ((__id, post) in posts.entries()) {
      if (post.author == userId) {
        buffer.add(post);
      };
    };
    // Sort by timestamp descending so newest posts appear first
    let sorted = Buffer.toArray(buffer).sort(func(a : Post, b : Post) : { #less; #equal; #greater } {
      Int.compare(b.timestamp, a.timestamp)
    });
    let total = sorted.size();
    if (offset >= total) { return [] };
    let end = if (offset + limit > total) { total } else { offset + limit };
    sorted.sliceToArray(offset.toInt(), end.toInt());
  };

  // Rose Currency System
  // Returns the total number of posts authored by a user.
  // Used by the frontend to determine whether to show the "View More" button
  // on profile pages without over-fetching full post objects.
  public query ({ caller }) func getPostCountByUser(userId : Principal) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view post counts");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, userId)) {
      Runtime.trap("Cannot view post count: blocking relationship exists");
    };

    var count = 0;
    for ((__id, post) in posts.entries()) {
      if (post.author == userId) {
        count += 1;
      };
    };
    count;
  };


  public type RoseTransactionType = {
    #gift;
    #buy;
    #sell;
    #transfer;
    #fee;
    #mint;
    #charityDonate;
    #charityClaim;
  };

  public type RoseTransaction = {
    id : Nat;
    sender : ?Principal;
    receiver : ?Principal;
    amount : Float;
    transactionType : RoseTransactionType;
    timestamp : Time.Time;
    feeDistributed : Float;
  };

  var nextRoseTransactionId = 0;
  var roseTransactions : [RoseTransaction] = [];
  var roseBalances = Map.empty<Principal, Float>();
  var totalCirculatingRoses : Float = 0.0;
  // Charity Pool
  var charityPool : Float = 0.0;
  var charityLastClaimMap = Map.empty<Principal, Int>();

  let totalRoseSupply : Float = 9_999_999.0;
  let adminUsername : Text = "rosalia";

  // Internal function for Rose gifting (used by both chat and post gifting)
  func giftRosesInternal(sender : Principal, receiver : Principal, amount : Float) : Float {
    let senderBalance = switch (roseBalances.get(sender)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (senderBalance < amount) {
      Runtime.trap("Insufficient balance to gift " # Float.toText(amount) # " Roses");
    };

    let fee = amount * 0.05;
    let amountAfterFee = amount - fee;

    let receiverBalance = switch (roseBalances.get(receiver)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    roseBalances.add(sender, senderBalance - amount);
    roseBalances.add(receiver, receiverBalance + amountAfterFee);

    // Distribute fee among all holders
    if (totalCirculatingRoses > 0.0) {
      let buffer = Buffer.Buffer<(Principal, Float)>(0);
      for ((principal, balance) in roseBalances.entries()) {
        buffer.add((principal, balance));
      };

      let holders = Buffer.toArray(buffer);

      for ((principal, balance) in holders.vals()) {
        if (balance > 0.0) {
          let share = (balance / totalCirculatingRoses) * fee;
          let current = switch (roseBalances.get(principal)) {
            case null { 0.0 };
            case (?b) { b };
          };
          roseBalances.add(principal, current + share);
        };
      };
    };

    let transaction : RoseTransaction = {
      id = nextRoseTransactionId;
      sender = ?sender;
      receiver = ?receiver;
      amount = amountAfterFee;
      transactionType = #gift;
      timestamp = Time.now();
      feeDistributed = fee;
    };

    roseTransactions := roseTransactions.concat([transaction]);
    nextRoseTransactionId += 1;

    fee;
  };

  public shared ({ caller }) func giftRoses(receiver : Principal, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can gift Roses");
    };

    if (amount < 0.01) {
      Runtime.trap("Minimum gift amount is 0.01 Rose");
    };

    switch (userProfiles.get(receiver)) {
      case null {
        Runtime.trap("Receiver profile not found");
      };
      case (?_) {};
    };

    if (caller == receiver) {
      Runtime.trap("Cannot gift Roses to yourself");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, receiver)) {
      Runtime.trap("Cannot gift Roses: blocking relationship exists");
    };

    let fee = giftRosesInternal(caller, receiver, amount);

    let receipt = createReceiptMessage(caller, receiver, amount, fee, "GIFT");
    sendReceiptMessage(caller, receiver, receipt);

    // Send notification
    ignore createRoseGiftNotification(caller, receiver, amount, nextRoseTransactionId - 1);
  };

  public shared ({ caller }) func claimAllRoses() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can claim all Roses");
    };

    if (not verifyAdminByUsername(caller)) {
      Runtime.trap("Unauthorized: Only admin with username 'rosalia' can claim Roses");
    };

    let currentAdminBalance = switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (currentAdminBalance >= totalRoseSupply) {
      Runtime.trap("Roses have already been claimed");
    };

    roseBalances.add(caller, totalRoseSupply);
    totalCirculatingRoses := totalRoseSupply;

    let transaction : RoseTransaction = {
      id = nextRoseTransactionId;
      sender = null;
      receiver = ?caller;
      amount = totalRoseSupply;
      transactionType = #mint;
      timestamp = Time.now();
      feeDistributed = 0.0;
    };

    roseTransactions := roseTransactions.concat([transaction]);
    nextRoseTransactionId += 1;
  };

  public shared ({ caller }) func sellRosesToUser(buyer : Principal, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can sell Roses");
    };

    if (not verifyAdminByUsername(caller)) {
      Runtime.trap("Unauthorized: Only admin with username 'rosalia' can sell Roses");
    };

    if (amount < 0.01) {
      Runtime.trap("Minimum sell amount is 0.01 Rose");
    };

    switch (userProfiles.get(buyer)) {
      case null {
        Runtime.trap("Buyer profile not found");
      };
      case (?_) {};
    };

    let adminBalance = switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (adminBalance < amount) {
      Runtime.trap("Admin does not have enough Roses to sell");
    };

    let buyerBalance = switch (roseBalances.get(buyer)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    roseBalances.add(caller, adminBalance - amount);
    roseBalances.add(buyer, buyerBalance + amount);

    let transaction : RoseTransaction = {
      id = nextRoseTransactionId;
      sender = ?caller;
      receiver = ?buyer;
      amount;
      transactionType = #sell;
      timestamp = Time.now();
      feeDistributed = 0.0;
    };

    roseTransactions := roseTransactions.concat([transaction]);
    nextRoseTransactionId += 1;
  };

  public shared ({ caller }) func buyRosesFromUser(seller : Principal, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can buy Roses");
    };

    if (not verifyAdminByUsername(caller)) {
      Runtime.trap("Unauthorized: Only admin with username 'rosalia' can buy Roses");
    };

    if (amount < 0.01) {
      Runtime.trap("Minimum buy amount is 0.01 Rose");
    };

    switch (userProfiles.get(seller)) {
      case null {
        Runtime.trap("Seller profile not found");
      };
      case (?_) {};
    };

    let sellerBalance = switch (roseBalances.get(seller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (sellerBalance < amount) {
      Runtime.trap("Seller does not have enough Roses to sell");
    };

    let adminBalance = switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    roseBalances.add(seller, sellerBalance - amount);
    roseBalances.add(caller, adminBalance + amount);

    let transaction : RoseTransaction = {
      id = nextRoseTransactionId;
      sender = ?seller;
      receiver = ?caller;
      amount;
      transactionType = #buy;
      timestamp = Time.now();
      feeDistributed = 0.0;
    };

    roseTransactions := roseTransactions.concat([transaction]);
    nextRoseTransactionId += 1;
  };

  public shared ({ caller }) func requestBuyRoses(amount : Float) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can request to buy Roses");
    };

    if (amount < 0.01) {
      Runtime.trap("Minimum purchase amount is 0.01 Rose");
    };

    switch (getAdminPrincipal(adminUsername)) {
      case null {
        Runtime.trap("Admin 'rosalia' not found. Please contact customer support.");
      };
      case (?adminPrincipal) {
        let tradeRequest = createTradeRequestMessage(caller, amount, "BUY");
        sendTradeRequestMessage(caller, adminPrincipal, tradeRequest);
        ignore createTradeRequestNotification(caller, adminPrincipal, amount, "BUY");

        "Buy request submitted for " # Float.toText(amount) # " Roses. A trade request message has been sent to admin 'rosalia'.";
      };
    };
  };

  public shared ({ caller }) func requestSellRoses(amount : Float) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can request to sell Roses");
    };

    if (amount < 0.01) {
      Runtime.trap("Minimum sell amount is 0.01 Rose");
    };

    let userBalance = switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (userBalance < amount) {
      Runtime.trap("Insufficient balance to sell " # Float.toText(amount) # " Roses");
    };

    switch (getAdminPrincipal(adminUsername)) {
      case null {
        Runtime.trap("Admin 'rosalia' not found. Please contact customer support.");
      };
      case (?adminPrincipal) {
        let tradeRequest = createTradeRequestMessage(caller, amount, "SELL");
        sendTradeRequestMessage(caller, adminPrincipal, tradeRequest);
        ignore createTradeRequestNotification(caller, adminPrincipal, amount, "SELL");

        "Sell request submitted for " # Float.toText(amount) # " Roses. A trade request message has been sent to admin 'rosalia'.";
      };
    };
  };

  public query ({ caller }) func getRoseBalance() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check Rose balance");
    };

    switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };
  };

  public query ({ caller }) func getTotalCirculatingRoses() : async Float {
    // Require authentication to view total circulating Roses
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view total circulating Roses");
    };

    totalCirculatingRoses;
  };

  public query ({ caller }) func getRoseTransactionHistory() : async [RoseTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transaction history");
    };

    roseTransactions.filter(
      func(tx : RoseTransaction) : Bool {
        switch (tx.sender, tx.receiver) {
          case (?sender, ?receiver) {
            sender == caller or receiver == caller
          };
          case (?sender, null) { sender == caller };
          case (null, ?receiver) { receiver == caller };
          case (null, null) { false };
        };
      },
    );
  };

  public query ({ caller }) func getUserRoseBalance(user : Principal) : async Float {
    // Require authentication to view user balances
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view user balances");
    };

    switch (roseBalances.get(user)) {
      case null { 0.0 };
      case (?balance) { balance };
    };
  };

  public query ({ caller }) func getRoseSummary() : async {
    userBalance : Float;
    totalCirculating : Float;
    feeRewards : Float;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view summary");
    };

    let userBalance = switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    var feeRewards = 0.0;
    for (transaction in roseTransactions.vals()) {
      if (transaction.feeDistributed > 0.0) {
        switch (transaction.receiver) {
          case (?receiver) {
            if (receiver == caller) {
              let userBalanceAtTime = switch (roseBalances.get(caller)) {
                case null { 0.0 };
                case (?balance) { balance };
              };
              if (totalCirculatingRoses > 0.0) {
                feeRewards += (userBalanceAtTime / totalCirculatingRoses) * transaction.feeDistributed;
              };
            };
          };
          case null {};
        };
      };
    };

    {
      userBalance;
      totalCirculating = totalCirculatingRoses;
      feeRewards;
    };
  };

  // ── Charity Pool ──────────────────────────────────────────────────────────

  /// Donate `amount` Roses to the charity pool.
  /// The standard 5% platform fee is applied: fee is distributed pro-rata to
  /// all holders, and the net (amount * 0.95) goes into charityPool.
  public shared ({ caller }) func donateToCharity(amount : Float) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can donate to charity");
    };

    if (amount < 0.01) {
      Runtime.trap("Minimum donation is 0.01 Rose");
    };

    let senderBalance = switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?b) { b };
    };

    if (senderBalance < amount) {
      Runtime.trap("Insufficient balance to donate " # Float.toText(amount) # " Roses");
    };

    let fee = amount * 0.05;
    let netAmount = amount - fee;

    // Deduct full amount from donor
    roseBalances.add(caller, senderBalance - amount);

    // Add net amount to charity pool
    charityPool += netAmount;

    // Distribute fee pro-rata to all holders
    if (totalCirculatingRoses > 0.0) {
      let buffer = Buffer.Buffer<(Principal, Float)>(0);
      for ((p, bal) in roseBalances.entries()) {
        buffer.add((p, bal));
      };
      for ((p, bal) in buffer.vals()) {
        if (bal > 0.0) {
          let share = (bal / totalCirculatingRoses) * fee;
          let current = switch (roseBalances.get(p)) {
            case null { 0.0 };
            case (?b) { b };
          };
          roseBalances.add(p, current + share);
        };
      };
    };

    let tx : RoseTransaction = {
      id = nextRoseTransactionId;
      sender = ?caller;
      receiver = null;
      amount = netAmount;
      transactionType = #charityDonate;
      timestamp = Time.now();
      feeDistributed = fee;
    };
    roseTransactions := roseTransactions.concat([tx]);
    nextRoseTransactionId += 1;

    "Donated " # Float.toText(netAmount) # " Roses to the charity pool (" # Float.toText(fee) # " Rose fee applied)";
  };

  /// Claim 0.01 Rose from the charity pool once every 24 hours.
  /// The 5% fee is applied: caller receives 0.01 * 0.95 = 0.0095 Roses after fee.
  public shared ({ caller }) func claimDailyCharity() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can claim from charity");
    };

    let claimAmount : Float = 0.01;
    let fee = claimAmount * 0.05;
    let netClaim = claimAmount - fee;

    if (charityPool < claimAmount) {
      Runtime.trap("Charity pool is empty or has insufficient funds");
    };

    let now = Time.now();
    let oneDayNs : Int = 24 * 60 * 60 * 1_000_000_000;

    switch (charityLastClaimMap.get(caller)) {
      case (?lastClaim) {
        let elapsed = now - lastClaim;
        if (elapsed < oneDayNs) {
          let remainingSec = (oneDayNs - elapsed) / 1_000_000_000;
          Runtime.trap("Claim again in " # (remainingSec / 3600).toText() # "h " # ((remainingSec % 3600) / 60).toText() # "m");
        };
      };
      case null {};
    };

    // Deduct from charity pool
    charityPool -= claimAmount;

    // Credit net amount to caller
    let currentBalance = switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?b) { b };
    };
    roseBalances.add(caller, currentBalance + netClaim);

    // Distribute fee pro-rata to all holders
    if (totalCirculatingRoses > 0.0) {
      let buffer = Buffer.Buffer<(Principal, Float)>(0);
      for ((p, bal) in roseBalances.entries()) {
        buffer.add((p, bal));
      };
      for ((p, bal) in buffer.vals()) {
        if (bal > 0.0) {
          let share = (bal / totalCirculatingRoses) * fee;
          let current = switch (roseBalances.get(p)) {
            case null { 0.0 };
            case (?b) { b };
          };
          roseBalances.add(p, current + share);
        };
      };
    };

    // Record last claim time
    charityLastClaimMap.add(caller, now);

    let tx : RoseTransaction = {
      id = nextRoseTransactionId;
      sender = null;
      receiver = ?caller;
      amount = netClaim;
      transactionType = #charityClaim;
      timestamp = now;
      feeDistributed = fee;
    };
    roseTransactions := roseTransactions.concat([tx]);
    nextRoseTransactionId += 1;

    "Claimed " # Float.toText(netClaim) # " Roses from the charity pool";
  };

  /// Returns the current charity pool balance and the caller's last claim timestamp.
  public query ({ caller }) func getCharityInfo() : async { pool : Float; lastClaimTime : ?Int } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view charity info");
    };

    {
      pool = charityPool;
      lastClaimTime = charityLastClaimMap.get(caller);
    };
  };

  // Admin Analytics Dashboard Functions
  public type AnalyticsSummary = {
    totalUsers : Nat;
    activeUsers : Nat;
    totalPosts : Nat;
    totalMessages : Nat;
    totalRoseTransactions : Nat;
    totalRosesCirculating : Float;
    totalRoseGifts : Float;
    totalPlatformFees : Float;
  };

  public query ({ caller }) func getAnalyticsSummary() : async AnalyticsSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view analytics");
    };

    let totalUsers = userProfiles.size();

    // Count active users (users with at least one post or message)
    let activeUsersSet = Map.empty<Principal, Bool>();
    for ((_postId, post) in posts.entries()) {
      activeUsersSet.add(post.author, true);
    };
    for ((_convId, conv) in conversations.entries()) {
      for (msg in conv.messages.vals()) {
        activeUsersSet.add(msg.sender, true);
      };
    };
    let activeUsers = activeUsersSet.size();

    let totalPosts = posts.size();

    var totalMessages = 0;
    for ((_convId, conv) in conversations.entries()) {
      totalMessages += conv.messages.size();
    };

    let totalRoseTransactions = roseTransactions.size();

    var totalRoseGifts = 0.0;
    var totalPlatformFees = 0.0;
    for (tx in roseTransactions.vals()) {
      switch (tx.transactionType) {
        case (#gift) {
          totalRoseGifts += tx.amount;
        };
        case (_) {};
      };
      totalPlatformFees += tx.feeDistributed;
    };

    {
      totalUsers;
      activeUsers;
      totalPosts;
      totalMessages;
      totalRoseTransactions;
      totalRosesCirculating = totalCirculatingRoses;
      totalRoseGifts;
      totalPlatformFees;
    };
  };

  // Personal user analytics
  public type UserAnalytics = {
    postCount : Nat;
    messageCount : Nat;
    reactionsReceived : Nat;
    roseBalance : Float;
    giftsReceived : Nat;
  };

  public query ({ caller }) func getCallerUserAnalytics() : async { #ok : UserAnalytics; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Authentication required");
    };

    switch (userProfiles.get(caller)) {
      case null { return #err("Profile not found") };
      case (?_) {};
    };

    // Count posts created by caller
    var postCount = 0;
    for ((_postId, post) in posts.entries()) {
      if (post.author == caller) {
        postCount += 1;
      };
    };

    // Count direct messages sent by caller
    var messageCount = 0;
    for ((_convId, conv) in conversations.entries()) {
      for (msg in conv.messages.vals()) {
        if (msg.sender == caller) {
          messageCount += 1;
        };
      };
    };
    // Count group messages sent by caller
    for ((_groupId, msgs) in groupMessages.entries()) {
      for (msg in msgs.vals()) {
        if (msg.sender == caller) {
          messageCount += 1;
        };
      };
    };

    // Count reactions received on caller's posts (via likes/comments)
    var reactionsReceived = 0;
    // Likes on caller's posts
    for ((postId2, post) in posts.entries()) {
      if (post.author == caller) {
        switch (likesMap.get(postId2)) {
          case (?likes) { reactionsReceived += likes.size() };
          case null {};
        };
      };
    };
    // Reactions on caller's direct messages
    for ((_convId, conv) in conversations.entries()) {
      for (msg in conv.messages.vals()) {
        if (msg.sender == caller) {
          for ((_emoji, reactors) in msg.reactions.vals()) {
            reactionsReceived += reactors.size();
          };
        };
      };
    };
    // Reactions on caller's group messages
    for ((_groupId, msgs) in groupMessages.entries()) {
      for (msg in msgs.vals()) {
        if (msg.sender == caller) {
          for ((_emoji, reactors) in msg.reactions.vals()) {
            reactionsReceived += reactors.size();
          };
        };
      };
    };

    // Rose balance
    let roseBalance = switch (roseBalances.get(caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    // Count gifts received (rose transactions where caller is the receiver and type is #gift)
    var giftsReceived = 0;
    for (tx in roseTransactions.vals()) {
      switch (tx.receiver) {
        case (?receiver) {
          if (receiver == caller) {
            switch (tx.transactionType) {
              case (#gift) { giftsReceived += 1 };
              case (_) {};
            };
          };
        };
        case null {};
      };
    };

    #ok({
      postCount;
      messageCount;
      reactionsReceived;
      roseBalance;
      giftsReceived;
    });
  };

  public query ({ caller }) func getAllRoseTransactions() : async [RoseTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all transactions");
    };

    // Additional verification for admin username
    if (not verifyAdminByUsername(caller)) {
      Runtime.trap("Unauthorized: Only admin with username 'rosalia' can view all transactions");
    };

    roseTransactions;
  };

  public query ({ caller }) func getAllUserProfiles() : async [(Principal, UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all user profiles");
    };

    // Additional verification for admin username
    if (not verifyAdminByUsername(caller)) {
      Runtime.trap("Unauthorized: Only admin with username 'rosalia' can view all user profiles");
    };

    let buffer = Buffer.Buffer<(Principal, UserProfile)>(0);
    for ((principal, profile) in userProfiles.entries()) {
      buffer.add((principal, profile));
    };
    Buffer.toArray(buffer);
  };

  // Payment System
  var stripeConfig : ?Stripe.StripeConfiguration = null;

  public query func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfig := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case null Runtime.trap("Stripe needs to be first configured");
      case (?value) value;
    };
  };

  public shared func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create checkout sessions");
    };
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  // HTTP Outcalls
  var icpUsdExchangeRate : ?Float = ?8.0;
  var lastExchangeRateUpdate : ?Time.Time = null;
  let exchangeRateUpdateInterval : Int = 3_600_000_000_000;

  func shouldUpdateExchangeRate() : Bool {
    switch (lastExchangeRateUpdate) {
      case null { true };
      case (?lastUpdate) {
        let currentTime = Time.now();
        currentTime - lastUpdate > exchangeRateUpdateInterval;
      };
    };
  };

  public shared ({ caller }) func getIcpUsdExchangeRate() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch exchange rates");
    };

    let updateNeeded = shouldUpdateExchangeRate();

    if (not updateNeeded) {
      switch (icpUsdExchangeRate) {
        case (?rate) { return rate };
        case null {};
      };
    };

    let response = await OutCall.httpGetRequest("https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd", [], transform);

    // Parse the JSON response: {"internet-computer":{"usd":8.45}}
    // Strategy: split on "\"usd\":" to get the text after it, then extract
    // the integer part and fractional part to build a Float.
    let parsedRate : Float = label parseBlock : Float {
      let marker = "\"usd\":";
      if (not response.contains(#text marker)) {
        break parseBlock 8.0;
      };
      // Get the portion after the marker
      var afterMarker : ?Text = null;
      var count = 0;
      label splitLoop for (part in response.split(#text marker)) {
        count += 1;
        if (count == 2) {
          afterMarker := ?part;
          break splitLoop;
        };
      };
      let numStr = switch (afterMarker) {
        case null { break parseBlock 8.0 };
        case (?s) { s };
      };
      // Collect digit/dot characters into intPart and fracPart strings
      var intChars = "";
      var fracChars = "";
      var seenDot = false;
      var foundDigit = false;
      label charLoop for (c in numStr.chars()) {
        if (c >= '0' and c <= '9') {
          foundDigit := true;
          if (seenDot) { fracChars #= Text.fromChar(c) }
          else { intChars #= Text.fromChar(c) };
        } else if (c == '.' and foundDigit and not seenDot) {
          seenDot := true;
        } else if (foundDigit) {
          break charLoop;
        };
      };
      if (not foundDigit or intChars == "") {
        break parseBlock 8.0;
      };
      // Convert integer part
      let intVal : Float = switch (Int.fromText(intChars)) {
        case null { break parseBlock 8.0 };
        case (?n) { Float.fromInt(n) };
      };
      // Convert fractional part (e.g. "45" -> 0.45)
      let fracVal : Float = if (fracChars == "") {
        0.0;
      } else {
        switch (Int.fromText(fracChars)) {
          case null { 0.0 };
          case (?n) {
            var divisor : Float = 1.0;
            for (_ in fracChars.chars()) { divisor *= 10.0 };
            Float.fromInt(n) / divisor;
          };
        };
      };
      intVal + fracVal;
    };

    icpUsdExchangeRate := ?parsedRate;
    lastExchangeRateUpdate := ?Time.now();

    parsedRate;
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Profile Filtering
  public type ProfileFilter = {
    country : ?Text;
    minAge : ?Nat;
    maxAge : ?Nat;
    gender : ?Text;
    minBalance : ?Float;
    onlineOnly : ?Bool;
  };

  public type ProfileWithPrincipal = {
    principal : Principal;
    profile : UserProfile;
    balance : Float;
  };

  public query ({ caller }) func filterProfiles(filter : ProfileFilter, limit : Nat, offset : Nat) : async [ProfileWithPrincipal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can filter profiles");
    };

    let currentYear = 2024;
    let buffer = Buffer.Buffer<ProfileWithPrincipal>(0);

    for ((principal, profile) in userProfiles.entries()) {
      if (principal != caller) {
        // Filter out blocked users
        if (hasBlockingRelationship(caller, principal)) {
          // Skip this profile
        } else {
          let countryMatch = switch (filter.country) {
            case null { true };
            case (?country) { profile.country.contains(#text country) };
          };

          let ageMatch = switch (filter.minAge, filter.maxAge, profile.birthYear) {
            case (null, null, _) { true };
            case (_, _, null) { true };
            case (min, max, ?birthYear) {
              let age = if (currentYear >= birthYear) { currentYear - birthYear } else { 0 };
              switch (min, max) {
                case (?minAge, ?maxAge) {
                  age >= minAge and age <= maxAge
                };
                case (?minAge, null) { age >= minAge };
                case (null, ?maxAge) { age <= maxAge };
                case (null, null) { true };
              };
            };
          };

          let genderMatch = switch (filter.gender) {
            case null { true };
            case (?gender) {
              switch (profile.gender) {
                case null { true };
                case (?profileGender) {
                  Text.equal(profileGender.toLower(), gender.toLower());
                };
              };
            };
          };

          let profileBalance = switch (roseBalances.get(principal)) {
            case (?balance) { balance };
            case null { 0.0 };
          };

          let balanceMatch = switch (filter.minBalance) {
            case null { true };
            case (?minBalance) { profileBalance >= minBalance };
          };

          let onlineMatch = switch (filter.onlineOnly) {
            case (?true) {
              switch (lastActiveMap.get(principal)) {
                case null { false };
                case (?lastActive) { Time.now() - lastActive <= onlineThreshold };
              };
            };
            case _ { true };
          };

          if (countryMatch and ageMatch and genderMatch and balanceMatch and onlineMatch) {
            buffer.add({
              principal;
              profile;
              balance = profileBalance;
            });
          };
        };
      };
    };

    let all = Buffer.toArray(buffer);
    let total = all.size();
    if (offset >= total) { return [] };
    let end = if (offset + limit > total) { total } else { offset + limit };
    all.sliceToArray(offset.toInt(), end.toInt());
  };

  public shared ({ caller }) func convertBalanceToUsd(amount : Float) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can convert balances");
    };

    let exchangeRate = switch (shouldUpdateExchangeRate()) {
      case true {
        await getIcpUsdExchangeRate();
      };
      case false {
        switch (icpUsdExchangeRate) {
          case (?rate) rate;
          case null { 8.0 };
        };
      };
    };

    amount * exchangeRate;
  };

  public query ({ caller }) func convertBalanceToUsdQuery(amount : Float) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can convert balances");
    };

    switch (icpUsdExchangeRate) {
      case (?rate) { amount * rate };
      case null { amount * 8.0 };
    };
  };

  // Universal Search Implementation
  public type SearchResult = {
    #userResult : {
      principal : Principal;
      profile : UserProfile;
      balance : Float;
      searchType : Text;
    };
    #messageResult : {
      conversationId : Nat;
      messageId : Nat;
      contentSnippet : Text;
      sender : Principal;
      receiver : Principal;
      timestamp : Time.Time;
      senderProfile : ?UserProfile;
      searchType : Text;
    };
    #postResult : {
      postId : Text;
      author : Principal;
      contentSnippet : Text;
      timestamp : Time.Time;
      image : ?Storage.ExternalBlob;
      searchType : Text;
    };
  };

  public query ({ caller }) func universalSearch(searchTerm : Text, maxResults : ?Nat) : async [SearchResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can perform search");
    };

    if (searchTerm.size() == 0) {
      return [];
    };

    let lowerSearchTerm = searchTerm.toLower();

    let max = switch (maxResults) {
      case (?m) { m };
      case null { 20 };
    };

    let userBuffer = Buffer.Buffer<SearchResult>(0);
    for ((principal, profile) in userProfiles.entries()) {
      if (principal != caller) {
        // Filter out blocked users
        if (not hasBlockingRelationship(caller, principal)) {
          let nameMatch = profile.name.toLower().contains(#text lowerSearchTerm);
          let usernameMatch = profile.username.toLower().contains(#text lowerSearchTerm);

          if (nameMatch or usernameMatch) {
            let balance = switch (roseBalances.get(principal)) {
              case (?b) { b };
              case null { 0.0 };
            };

            userBuffer.add(#userResult({
              principal;
              profile;
              balance;
              searchType = "userSearch-" # searchTerm;
            }));

            if (userBuffer.size() >= max) {};
          };
        };
      };
    };

    let messageBuffer = Buffer.Buffer<SearchResult>(0);
    for ((conversationId, conversation) in conversations.entries()) {
      let isParticipant = conversation.participants.find(func(p : Principal) : Bool { p == caller });
      switch (isParticipant) {
        case null {};
        case (?_) {
          for (message in conversation.messages.vals()) {
            let contentSnippet = switch (message.content) {
              case (#text(t)) t;
              case (#image(_)) "Image";
              case (#video(_)) "Video";
              case (#voice(_)) "Voice";
              case (#media(_)) "Media";
              case (#rose(_)) "Rose Gift";
              case (#receipt(_)) "Transaction Receipt";
              case (#tradeRequest(_)) "Trade Request";
              case (#forwardedPost(_)) "Forwarded Post";
            };

            let contentMatch = contentSnippet.toLower().contains(#text lowerSearchTerm);

            let senderUsernameMatch = switch (userProfiles.get(message.sender)) {
              case (?profile) { profile.username.toLower().contains(#text lowerSearchTerm) };
              case null false;
            };

            let receiverUsernameMatch = switch (userProfiles.get(message.receiver)) {
              case (?profile) { profile.username.toLower().contains(#text lowerSearchTerm) };
              case null false;
            };

            if (contentMatch or senderUsernameMatch or receiverUsernameMatch) {
              let snippet = if (contentSnippet.size() > 50) {
                contentSnippet.trim(#char ' ')
              } else {
                contentSnippet
              };

              messageBuffer.add(#messageResult({
                conversationId;
                messageId = message.id;
                contentSnippet = snippet;
                sender = message.sender;
                receiver = message.receiver;
                timestamp = message.timestamp;
                senderProfile = message.senderProfile;
                searchType = "messageSearch-" # searchTerm;
              }));

              if (messageBuffer.size() >= max) {};
            };
          };
          if (messageBuffer.size() >= max) {};
        };
      };
    };

    let postBuffer = Buffer.Buffer<SearchResult>(0);
    for ((_postId, post) in posts.entries()) {
      // Filter out posts from blocked users
      if (not hasBlockingRelationship(caller, post.author)) {
        let contentMatch = post.content.toLower().contains(#text lowerSearchTerm);

        let authorUsernameMatch = switch (userProfiles.get(post.author)) {
          case (?profile) { profile.username.toLower().contains(#text lowerSearchTerm) };
          case null false;
        };

        if (contentMatch or authorUsernameMatch) {
          let snippet = if (post.content.size() > 50) {
            post.content.trim(#char ' ')
          } else {
            post.content
          };

          postBuffer.add(#postResult({
            postId = post.id;
            author = post.author;
            contentSnippet = snippet;
            timestamp = post.timestamp;
            image = post.image;
            searchType = "postSearch-" # searchTerm;
          }));

          if (postBuffer.size() >= max) {};
        };
      };
    };

    let results = Buffer.Buffer<SearchResult>(0);

    for (res in userBuffer.vals()) {
      if (results.size() < max) results.add(res);
    };

    for (res in messageBuffer.vals()) {
      if (results.size() < max) results.add(res);
    };

    for (res in postBuffer.vals()) {
      if (results.size() < max) results.add(res);
    };

    Buffer.toArray(results);
  };

  // Notification System
  public type Notification = {
    id : Nat;
    userId : Principal;
    notificationType : NotificationType;
    content : Text;
    timestamp : Time.Time;
    isRead : Bool;
    linkedId : ?Text;
    linkedType : ?Text;
  };

  public type NotificationType = {
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
    #storyReaction;
    #groupMessage;
    #groupAdd;
  };

  var nextNotificationId = 0;
  var notificationsMap = Map.empty<Principal, [Notification]>();

  func createNotification(userId : Principal, notificationType : NotificationType, content : Text, linkedId : ?Text, linkedType : ?Text) : Notification {
    {
      id = nextNotificationId;
      userId;
      notificationType;
      content;
      timestamp = Time.now();
      isRead = false;
      linkedId;
      linkedType;
    };
  };

  func addNotification(notification : Notification) {
    switch (notificationsMap.get(notification.userId)) {
      case (?existingList) {
        notificationsMap.add(notification.userId, existingList.concat([notification]));
      };
      case null {
        notificationsMap.add(notification.userId, [notification]);
      };
    };
    nextNotificationId += 1;
  };

  public query ({ caller }) func getNotifications(limit : Nat, offset : Nat) : async {
    notifications : [Notification];
    total : Nat;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch notifications");
    };

    let effectiveLimit = if (limit == 0) { 6 } else { limit };

    switch (notificationsMap.get(caller)) {
      case null { { notifications = []; total = 0 } };
      case (?notifs) {
        let sorted = notifs.sort(func(a : Notification, b : Notification) : { #less; #equal; #greater } {
          if (a.timestamp > b.timestamp) #less
          else if (a.timestamp < b.timestamp) #greater
          else #equal
        });
        let total = sorted.size();
        let slice = if (offset >= total) {
          []
        } else {
          let end = if (offset + effectiveLimit > total) { total } else { offset + effectiveLimit };
          sorted.sliceToArray(offset.toInt(), end.toInt())
        };
        { notifications = slice; total }
      };
    };
  };

  public query ({ caller }) func getUnreadNotificationCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch notification count");
    };

    switch (notificationsMap.get(caller)) {
      case (?notifs) {
        var count = 0;
        for (notif in notifs.vals()) {
          if (not notif.isRead) {
            count += 1;
          };
        };
        count;
      };
      case null 0;
    };
  };

  public shared ({ caller }) func markNotificationAsRead(notificationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };

    switch (notificationsMap.get(caller)) {
      case (?notifs) {
        let updatedNotifs = notifs.map(
          func(n : Notification) : Notification {
            if (n.id == notificationId) {
              { n with isRead = true };
            } else {
              n;
            };
          },
        );
        notificationsMap.add(caller, updatedNotifs);
      };
      case null {};
    };
  };

  public shared ({ caller }) func markAllNotificationsAsRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark all notifications as read");
    };

    switch (notificationsMap.get(caller)) {
      case (?notifs) {
        let updatedNotifs = notifs.map(func(n : Notification) : Notification { { n with isRead = true } });
        notificationsMap.add(caller, updatedNotifs);
      };
      case null {};
    };
  };

  public shared ({ caller }) func deleteNotification(notificationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete notifications");
    };

    switch (notificationsMap.get(caller)) {
      case (?notifs) {
        let updatedNotifs = notifs.filter(func(n : Notification) : Bool { n.id != notificationId });
        notificationsMap.add(caller, updatedNotifs);
      };
      case null {};
    };
  };

  public shared ({ caller }) func clearAllNotifications() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear all notifications");
    };

    notificationsMap.remove(caller);
  };

  public type NotificationCount = {
    unreadCount : Nat;
    totalCount : Nat;
    messageCount : Nat;
    roseGiftCount : Nat;
    likeCount : Nat;
    commentCount : Nat;
    followCount : Nat;
    tradeRequestCount : Nat;
    systemCount : Nat;
    postGiftCount : Nat;
    roseReceiptCount : Nat;
    storyViewCount : Nat;
    storyReactionCount : Nat;
    groupMessageCount : Nat;
    groupAddCount : Nat;
  };

  public query ({ caller }) func getNotificationCountByType() : async NotificationCount {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch notification count");
    };

    var unreadCount = 0;
    var totalCount = 0;
    var messageCount = 0;
    var roseGiftCount = 0;
    var likeCount = 0;
    var commentCount = 0;
    var followCount = 0;
    var tradeRequestCount = 0;
    var systemCount = 0;
    var postGiftCount = 0;
    var roseReceiptCount = 0;
    var storyViewCount = 0;
    var storyReactionCount = 0;
    var groupMessageCount = 0;
    var groupAddCount = 0;

    switch (notificationsMap.get(caller)) {
      case (?notifs) {
        for (notif in notifs.vals()) {
          totalCount += 1;
          if (not notif.isRead) {
            unreadCount += 1;
          };
          switch (notif.notificationType) {
            case (#message) messageCount += 1;
            case (#roseGift) roseGiftCount += 1;
            case (#like) likeCount += 1;
            case (#comment) commentCount += 1;
            case (#follow) followCount += 1;
            case (#tradeRequest) tradeRequestCount += 1;
            case (#systemNotice) systemCount += 1;
            case (#postGift) postGiftCount += 1;
            case (#roseReceipt) roseReceiptCount += 1;
            case (#storyView) storyViewCount += 1;
            case (#storyReaction) storyReactionCount += 1;
            case (#groupMessage) groupMessageCount += 1;
            case (#groupAdd) groupAddCount += 1;
          };
        };
      };
      case null {};
    };

    {
      unreadCount;
      totalCount;
      messageCount;
      roseGiftCount;
      likeCount;
      commentCount;
      followCount;
      tradeRequestCount;
      systemCount;
      postGiftCount;
      roseReceiptCount;
      storyViewCount;
      storyReactionCount;
      groupMessageCount;
      groupAddCount;
    };
  };

  // Email notification helper
  // Fire-and-forget: sends an email if the recipient has an email address and
  // has the given notification type enabled in their EmailPreferences.
  func shouldSendEmail(recipient : Principal, check : EmailPreferences -> Bool) : ?(Text) {
    switch (userProfiles.get(recipient)) {
      case null null;
      case (?profile) {
        switch (profile.email, profile.emailPreferences) {
          case (?email, ?prefs) {
            if (check(prefs)) { ?email } else null
          };
          case _ null;
        };
      };
    };
  };

  // Notification Helper Functions
  func createMessageNotification(sender : Principal, receiver : Principal, messageContent : Text, conversationId : Nat) : async () {
    let preview = if (messageContent.size() > 30) {
      messageContent.trim(#char ' ')
    } else {
      messageContent
    };

    let content = "New message from " # getUsername(sender) # ": " # preview;
    let notification = createNotification(receiver, #message, content, ?conversationId.toText(), ?"conversation");
    addNotification(notification);
    switch (shouldSendEmail(receiver, func(p) { p.message })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "New message on Rose Dating",
          "You have a new message from " # getUsername(sender) # ".\n\n" # content # "\n\nView it at https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func getUsername(principal : Principal) : Text {
    switch (userProfiles.get(principal)) {
      case (?profile) { profile.username };
      case null { "Unknown User" };
    };
  };

  func createRoseGiftNotification(sender : Principal, receiver : Principal, amount : Float, transactionId : Nat) : async () {
    let senderUsername = getUsername(sender);
    let content = senderUsername # " sent you " # Float.toText(amount) # " ROSES!";
    let notification = createNotification(receiver, #roseGift, content, ?transactionId.toText(), ?"transaction");
    addNotification(notification);
    switch (shouldSendEmail(receiver, func(p) { p.roseGift })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "You received Roses on Rose Dating",
          content # "\n\nView your balance at https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func createLikeNotification(liker : Principal, postAuthor : Principal, postId : Text, postContent : Text) : async () {
    let likerUsername = getUsername(liker);
    let preview = if (postContent.size() > 30) {
      postContent.trim(#char ' ')
    } else {
      postContent
    };

    let content = likerUsername # " liked your post: " # preview;
    let notification = createNotification(postAuthor, #like, content, ?postId, ?"post");
    addNotification(notification);
    switch (shouldSendEmail(postAuthor, func(p) { p.like })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "Someone liked your post on Rose Dating",
          content # "\n\nView your post at https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func createCommentNotification(commenter : Principal, postAuthor : Principal, postId : Text, comment : Text) : async () {
    let commenterUsername = getUsername(commenter);
    let preview = if (comment.size() > 30) {
      comment.trim(#char ' ')
    } else {
      comment
    };

    let content = commenterUsername # " commented: " # preview;
    let notification = createNotification(postAuthor, #comment, content, ?postId, ?"post");
    addNotification(notification);
    switch (shouldSendEmail(postAuthor, func(p) { p.comment })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "New comment on your post on Rose Dating",
          content # "\n\nView your post at https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func createFollowNotification(follower : Principal, followedUser : Principal) : async () {
    let content = getUsername(follower) # " started following you";
    let notification = createNotification(followedUser, #follow, content, null, null);
    addNotification(notification);
    switch (shouldSendEmail(followedUser, func(p) { p.follow })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "New follower on Rose Dating",
          content # "\n\nVisit https://rosedate.net to see your profile",
        );
      };
      case null {};
    };
  };

  func createTradeRequestNotification(requester : Principal, admin : Principal, amount : Float, requestType : Text) : async () {
    let content = getUsername(requester) # " requested to " # requestType # " " # Float.toText(amount) # " ROSES.";
    let notification = createNotification(admin, #tradeRequest, content, null, null);
    addNotification(notification);
    switch (shouldSendEmail(admin, func(p) { p.tradeRequest })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "New trade request on Rose Dating",
          content # "\n\nManage trades at https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func createPostGiftNotification(gifter : Principal, postAuthor : Principal, postId : Text, amount : Float) : async () {
    let gifterUsername = getUsername(gifter);
    let content = gifterUsername # " gifted " # Float.toText(amount) # " ROSES on your post!";
    let notification = createNotification(postAuthor, #postGift, content, ?postId, ?"post");
    addNotification(notification);
    switch (shouldSendEmail(postAuthor, func(p) { p.postGift })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "You received a Rose gift on your post",
          content # "\n\nView your post at https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func createStoryViewNotification(viewer : Principal, storyAuthor : Principal, storyId : Nat) : async () {
    let viewerUsername = getUsername(viewer);
    let content = viewerUsername # " viewed your story";
    let notification = createNotification(storyAuthor, #storyView, content, ?storyId.toText(), ?"story");
    addNotification(notification);
    switch (shouldSendEmail(storyAuthor, func(p) { p.storyView })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "Someone viewed your story on Rose Dating",
          content # "\n\nVisit https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func createStoryReactionNotification(reactor : Principal, storyAuthor : Principal, storyId : Nat, emoji : Text) : async () {
    let reactorUsername = getUsername(reactor);
    let content = reactorUsername # " reacted " # emoji # " to your story";
    let notification = createNotification(storyAuthor, #storyReaction, content, ?storyId.toText(), ?"story");
    addNotification(notification);
    switch (shouldSendEmail(storyAuthor, func(p) { p.storyReaction })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "Someone reacted to your story on Rose Dating",
          content # "\n\nVisit https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func createGroupMessageNotification(sender : Principal, receiver : Principal, groupId : Nat, groupName : Text, messageContent : Text) : async () {
    let preview = if (messageContent.size() > 30) {
      messageContent.trim(#char ' ')
    } else {
      messageContent
    };

    let content = getUsername(sender) # " in " # groupName # ": " # preview;
    let notification = createNotification(receiver, #groupMessage, content, ?groupId.toText(), ?"group");
    addNotification(notification);
    switch (shouldSendEmail(receiver, func(p) { p.groupMessage })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "New group message on Rose Dating",
          content # "\n\nView the group at https://rosedate.net",
        );
      };
      case null {};
    };
  };

  func createGroupAddNotification(adder : Principal, addedUser : Principal, groupId : Nat, groupName : Text) : async () {
    let content = getUsername(adder) # " added you to " # groupName;
    let notification = createNotification(addedUser, #groupAdd, content, ?groupId.toText(), ?"group");
    addNotification(notification);
    switch (shouldSendEmail(addedUser, func(p) { p.groupAdd })) {
      case (?email) {
        ignore await EmailClient.sendServiceEmail(
          "rosedate",
          [email],
          "You were added to a group on Rose Dating",
          content # "\n\nView the group at https://rosedate.net",
        );
      };
      case null {};
    };
  };

  // ── Message Reactions ────────────────────────────────────────────────────────

  // Toggle an emoji reaction on a direct message. Adds if not present, removes if already reacted.
  public shared ({ caller }) func reactToMessage(receiver : Principal, messageId : Nat, emoji : Text) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    // Find conversation between caller and receiver
    var targetConvId : ?Nat = null;
    for ((convId, conv) in conversations.entries()) {
      if (conv.participants.size() == 2) {
        let p1 = conv.participants[0];
        let p2 = conv.participants[1];
        if ((p1 == caller and p2 == receiver) or (p1 == receiver and p2 == caller)) {
          targetConvId := ?convId;
        };
      };
    };

    let convId = switch (targetConvId) {
      case null { return #err("Conversation not found") };
      case (?id) id;
    };

    let conv = switch (conversations.get(convId)) {
      case null { return #err("Conversation not found") };
      case (?c) c;
    };

    var found = false;
    let updatedMessages = conv.messages.map(func(msg : Message) : Message {
      if (msg.id == messageId) {
        found := true;
        // Toggle: find the emoji entry and add/remove caller
        var reactionExists = false;
        let updatedReactions = msg.reactions.map(func(entry) {
          let (e, principals) = entry;
          if (e == emoji) {
            reactionExists := true;
            let alreadyReacted = principals.find(func(p : Principal) : Bool { p == caller }) != null;
            if (alreadyReacted) {
              // Remove caller
              (e, principals.filter(func(p : Principal) : Bool { p != caller }))
            } else {
              // Add caller
              (e, principals.concat([caller]))
            }
          } else {
            entry
          }
        });
        // If emoji not found yet, append new entry
        let finalReactions = if (reactionExists) {
          // Filter out entries with empty principal arrays
          updatedReactions.filter(func(entry : (Text, [Principal])) : Bool {
            let (_, principals) = entry;
            principals.size() > 0
          })
        } else {
          updatedReactions.concat([(emoji, [caller])])
        };
        { msg with reactions = finalReactions }
      } else {
        msg
      }
    });

    if (not found) { return #err("Message not found") };

    conversations.add(convId, { conv with messages = updatedMessages });
    #ok
  };

  // Toggle an emoji reaction on a group message.
  public shared ({ caller }) func reactToGroupMessage(groupId : Nat, messageId : Nat, emoji : Text) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    if (not isGroupParticipant(groupId, caller)) {
      return #err("Unauthorized: Only group participants can react to messages");
    };

    let messages = switch (groupMessages.get(groupId)) {
      case null { return #err("Group not found or no messages") };
      case (?msgs) msgs;
    };

    var found = false;
    let updatedMessages = messages.map(func(msg : GroupMessage) : GroupMessage {
      if (msg.id == messageId) {
        found := true;
        var reactionExists = false;
        let updatedReactions = msg.reactions.map(func(entry) {
          let (e, principals) = entry;
          if (e == emoji) {
            reactionExists := true;
            let alreadyReacted = principals.find(func(p : Principal) : Bool { p == caller }) != null;
            if (alreadyReacted) {
              (e, principals.filter(func(p : Principal) : Bool { p != caller }))
            } else {
              (e, principals.concat([caller]))
            }
          } else {
            entry
          }
        });
        let finalReactions = if (reactionExists) {
          updatedReactions.filter(func(entry : (Text, [Principal])) : Bool {
            let (_, principals) = entry;
            principals.size() > 0
          })
        } else {
          updatedReactions.concat([(emoji, [caller])])
        };
        { msg with reactions = finalReactions }
      } else {
        msg
      }
    });

    if (not found) { return #err("Message not found") };

    groupMessages.add(groupId, updatedMessages);
    #ok
  };

  // ── Read Receipts ─────────────────────────────────────────────────────────────

  // Mark a direct message as read by the caller (adds caller to readBy if not already present).
  public shared ({ caller }) func markMessageRead(sender : Principal, messageId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    // Find the conversation between sender and caller
    var targetConvId : ?Nat = null;
    for ((convId, conv) in conversations.entries()) {
      if (conv.participants.size() == 2) {
        let p1 = conv.participants[0];
        let p2 = conv.participants[1];
        if ((p1 == caller and p2 == sender) or (p1 == sender and p2 == caller)) {
          targetConvId := ?convId;
        };
      };
    };

    let convId = switch (targetConvId) {
      case null { return #err("Conversation not found") };
      case (?id) id;
    };

    let conv = switch (conversations.get(convId)) {
      case null { return #err("Conversation not found") };
      case (?c) c;
    };

    var found = false;
    let updatedMessages = conv.messages.map(func(msg : Message) : Message {
      if (msg.id == messageId) {
        found := true;
        let alreadyRead = msg.readBy.find(func(p : Principal) : Bool { p == caller }) != null;
        if (alreadyRead) {
          msg
        } else {
          { msg with readBy = msg.readBy.concat([caller]) }
        }
      } else {
        msg
      }
    });

    if (not found) { return #err("Message not found") };

    conversations.add(convId, { conv with messages = updatedMessages });
    #ok
  };

  // Mark a group message as read by the caller.
  public shared ({ caller }) func markGroupMessageRead(groupId : Nat, messageId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    if (not isGroupParticipant(groupId, caller)) {
      return #err("Unauthorized: Only group participants can mark messages as read");
    };

    let messages = switch (groupMessages.get(groupId)) {
      case null { return #err("Group not found or no messages") };
      case (?msgs) msgs;
    };

    var found = false;
    let updatedMessages = messages.map(func(msg : GroupMessage) : GroupMessage {
      if (msg.id == messageId) {
        found := true;
        let alreadyRead = msg.readBy.find(func(p : Principal) : Bool { p == caller }) != null;
        if (alreadyRead) {
          msg
        } else {
          { msg with readBy = msg.readBy.concat([caller]) }
        }
      } else {
        msg
      }
    });

    if (not found) { return #err("Message not found") };

    groupMessages.add(groupId, updatedMessages);
    #ok
  };

  // ── Platform Statistics (public, no auth required) ───────────────────────

  public type PlatformStats = {
    totalUsers : Nat;
    totalMessages : Nat;
    totalPosts : Nat;
    totalInteractions : Nat;
  };

  public query func getPlatformStats() : async PlatformStats {
    let totalUsers = userProfiles.size();
    let totalPosts = posts.size();

    // Count all direct messages across all conversations
    var totalMessages = 0;
    for ((_convId, conv) in conversations.entries()) {
      totalMessages += conv.messages.size();
    };
    // Add group messages
    for ((_groupId, msgs) in groupMessages.entries()) {
      totalMessages += msgs.size();
    };

    // Count likes + comments (post interactions)
    var totalLikes = 0;
    for ((_postId, likes) in likesMap.entries()) {
      totalLikes += likes.size();
    };
    var totalComments = 0;
    for ((_postId, comments) in commentsMap.entries()) {
      totalComments += comments.size();
    };

    // Count message reactions across direct conversations
    var totalReactions = 0;
    for ((_convId, conv) in conversations.entries()) {
      for (msg in conv.messages.vals()) {
        for ((_emoji, reactors) in msg.reactions.vals()) {
          totalReactions += reactors.size();
        };
      };
    };
    // Count message reactions across group messages
    for ((_groupId, msgs) in groupMessages.entries()) {
      for (msg in msgs.vals()) {
        for ((_emoji, reactors) in msg.reactions.vals()) {
          totalReactions += reactors.size();
        };
      };
    };

    let totalInteractions = totalLikes + totalComments + totalReactions;

    { totalUsers; totalMessages; totalPosts; totalInteractions };
  };

  // ── Online Status ─────────────────────────────────────────────────────────
  // Tracks the last time each user was seen active (nanosecond timestamp).
  var lastActiveMap = Map.empty<Principal, Int>();

  // 5 minutes in nanoseconds
  let onlineThreshold : Int = 5 * 60 * 1_000_000_000;

  // Call this from the frontend every ~60 seconds to keep presence alive.
  public shared ({ caller }) func updateLastActive() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update presence");
    };
    lastActiveMap.add(caller, Time.now());
  };

  // Returns true if the given user was active within the last 5 minutes.
  public query ({ caller }) func isOnline(userId : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check online status");
    };
    switch (lastActiveMap.get(userId)) {
      case null { false };
      case (?lastActive) { Time.now() - lastActive <= onlineThreshold };
    };
  };

  // Returns all principals that were active within the last 5 minutes.
  public query ({ caller }) func getOnlineUsers() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view online users");
    };
    let now = Time.now();
    let buffer = Buffer.Buffer<Principal>(0);
    for ((principal, lastActive) in lastActiveMap.entries()) {
      if (now - lastActive <= onlineThreshold) {
        buffer.add(principal);
      };
    };
    Buffer.toArray(buffer);
  };

  // Returns the raw lastActive nanosecond timestamp for a given user, or null
  // if the user has never called updateLastActive.
  public query ({ caller }) func getLastSeen(userId : Principal) : async ?Int {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check last seen");
    };
    lastActiveMap.get(userId);
  };

  // ── Bulk Read Receipts ────────────────────────────────────────────────────

  // Mark ALL messages in a direct conversation as read by the caller.
  // This is called when the user opens a conversation — all messages become seen.
  public shared ({ caller }) func markConversationRead(conversationId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    let conv = switch (conversations.get(conversationId)) {
      case null { return #err("Conversation not found") };
      case (?c) c;
    };

    // Verify caller is a participant
    if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
      return #err("Unauthorized: Only conversation participants can mark messages as read");
    };

    let updatedMessages = conv.messages.map(func(msg : Message) : Message {
      // Only mark messages sent by others (not by the caller)
      if (msg.sender != caller) {
        let alreadyRead = msg.readBy.find(func(p : Principal) : Bool { p == caller }) != null;
        if (alreadyRead) {
          msg
        } else {
          { msg with readBy = msg.readBy.concat([caller]) }
        }
      } else {
        msg
      }
    });

    conversations.add(conversationId, { conv with messages = updatedMessages });
    #ok
  };

  // Mark ALL messages in a group chat as read by the caller.
  public shared ({ caller }) func markGroupChatRead(groupId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    if (not isGroupParticipant(groupId, caller)) {
      return #err("Unauthorized: Only group participants can mark messages as read");
    };

    let messages = switch (groupMessages.get(groupId)) {
      case null { return #ok }; // No messages yet — nothing to mark
      case (?msgs) msgs;
    };

    let updatedMessages = messages.map(func(msg : GroupMessage) : GroupMessage {
      if (msg.sender != caller) {
        let alreadyRead = msg.readBy.find(func(p : Principal) : Bool { p == caller }) != null;
        if (alreadyRead) {
          msg
        } else {
          { msg with readBy = msg.readBy.concat([caller]) }
        }
      } else {
        msg
      }
    });

    groupMessages.add(groupId, updatedMessages);
    #ok
  };

  // ── Unread Counts ─────────────────────────────────────────────────────────

  public type DirectUnreadCount = {
    conversationId : Nat;
    unreadCount : Nat;
  };

  public type GroupUnreadCount = {
    groupId : Nat;
    unreadCount : Nat;
  };

  public type UnreadCounts = {
    direct : [DirectUnreadCount];
    groups : [GroupUnreadCount];
  };

  // Returns unread message counts for all direct conversations and group chats.
  // Unread = message where sender != caller AND caller NOT in readBy.
  public query ({ caller }) func getUnreadCounts() : async UnreadCounts {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view unread counts");
    };

    let directBuffer = Buffer.Buffer<DirectUnreadCount>(0);
    for ((convId, conv) in conversations.entries()) {
      if (conv.participants.find(func(p : Principal) : Bool { p == caller }) != null) {
        var count = 0;
        for (msg in conv.messages.vals()) {
          if (msg.sender != caller) {
            let hasRead = msg.readBy.find(func(p : Principal) : Bool { p == caller }) != null;
            if (not hasRead) {
              count += 1;
            };
          };
        };
        if (count > 0) {
          directBuffer.add({ conversationId = convId; unreadCount = count });
        };
      };
    };

    let groupBuffer = Buffer.Buffer<GroupUnreadCount>(0);
    switch (userGroups.get(caller)) {
      case null {};
      case (?groupIds) {
        for (groupId in groupIds.vals()) {
          var count = 0;
          switch (groupMessages.get(groupId)) {
            case null {};
            case (?msgs) {
              for (msg in msgs.vals()) {
                if (msg.sender != caller) {
                  let hasRead = msg.readBy.find(func(p : Principal) : Bool { p == caller }) != null;
                  if (not hasRead) {
                    count += 1;
                  };
                };
              };
            };
          };
          if (count > 0) {
            groupBuffer.add({ groupId; unreadCount = count });
          };
        };
      };
    };

    {
      direct = Buffer.toArray(directBuffer);
      groups = Buffer.toArray(groupBuffer);
    };
  };

  // ── Typing Indicators ────────────────────────────────────────────────────

  // Stores typing state: conversationId -> [(principal, timestamp)]
  var typingMap = Map.empty<Nat, [(Principal, Int)]>();

  // Stores group typing state: groupId -> [(principal, timestamp)]
  var groupTypingMap = Map.empty<Nat, [(Principal, Int)]>();

  // 5 seconds in nanoseconds — typing state expires after this
  let typingExpiry : Int = 5 * 1_000_000_000;

  // Set or clear the caller's typing indicator in a direct conversation.
  public shared ({ caller }) func setTyping(conversationId : Nat, isTyping : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set typing indicators");
    };

    let conv = switch (conversations.get(conversationId)) {
      case null { Runtime.trap("Conversation not found") };
      case (?c) c;
    };

    if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
      Runtime.trap("Unauthorized: Only conversation participants can set typing");
    };

    let now = Time.now();
    let existing = switch (typingMap.get(conversationId)) {
      case null { [] };
      case (?entries) entries;
    };

    // Remove stale entries and the caller's existing entry
    let filtered = existing.filter(func((p, ts) : (Principal, Int)) : Bool {
      p != caller and (now - ts) <= typingExpiry
    });

    if (isTyping) {
      typingMap.add(conversationId, filtered.concat([(caller, now)]));
    } else {
      typingMap.add(conversationId, filtered);
    };
  };

  // Returns principals currently typing in a direct conversation (active within last 5 seconds).
  public query ({ caller }) func getTypingUsers(conversationId : Nat) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view typing indicators");
    };

    let now = Time.now();
    switch (typingMap.get(conversationId)) {
      case null { [] };
      case (?entries) {
        let buffer = Buffer.Buffer<Principal>(0);
        for ((p, ts) in entries.vals()) {
          if (p != caller and (now - ts) <= typingExpiry) {
            buffer.add(p);
          };
        };
        Buffer.toArray(buffer);
      };
    };
  };

  // Set or clear the caller's typing indicator in a group chat.
  public shared ({ caller }) func setGroupTyping(groupId : Nat, isTyping : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set typing indicators");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group participants can set typing");
    };

    let now = Time.now();
    let existing = switch (groupTypingMap.get(groupId)) {
      case null { [] };
      case (?entries) entries;
    };

    let filtered = existing.filter(func((p, ts) : (Principal, Int)) : Bool {
      p != caller and (now - ts) <= typingExpiry
    });

    if (isTyping) {
      groupTypingMap.add(groupId, filtered.concat([(caller, now)]));
    } else {
      groupTypingMap.add(groupId, filtered);
    };
  };

  // Returns principals currently typing in a group chat (active within last 5 seconds).
  public query ({ caller }) func getGroupTypingUsers(groupId : Nat) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view typing indicators");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Runtime.trap("Unauthorized: Only group participants can view typing indicators");
    };

    let now = Time.now();
    switch (groupTypingMap.get(groupId)) {
      case null { [] };
      case (?entries) {
        let buffer = Buffer.Buffer<Principal>(0);
        for ((p, ts) in entries.vals()) {
          if (p != caller and (now - ts) <= typingExpiry) {
            buffer.add(p);
          };
        };
        Buffer.toArray(buffer);
      };
    };
  };

  // ── Message Pinning ─────────────────────────────────────────────────────

  /// Find the conversation ID for a direct chat between caller and other.
  func findConversationIdByPair(a : Principal, b : Principal) : ?Nat {
    for ((id, conv) in conversations.entries()) {
      if (conv.participants.size() == 2) {
        let p0 = conv.participants[0];
        let p1 = conv.participants[1];
        if ((p0 == a and p1 == b) or (p0 == b and p1 == a)) {
          return ?id;
        };
      };
    };
    null;
  };

  /// Pin a message in a direct conversation. Any participant can pin.
  /// Replaces any previously pinned message.
  public shared ({ caller }) func pinConversationMessage(other : Principal, messageId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    let convId = switch (findConversationIdByPair(caller, other)) {
      case null { return #err("Conversation not found") };
      case (?id) id;
    };

    let conv = switch (conversations.get(convId)) {
      case null { return #err("Conversation not found") };
      case (?c) c;
    };

    // Verify caller is a participant
    if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
      return #err("Unauthorized: Only conversation participants can pin messages");
    };

    // Verify message exists in this conversation
    let msgExists = conv.messages.find(func(m : Message) : Bool { m.id == messageId }) != null;
    if (not msgExists) {
      return #err("Message not found in this conversation");
    };

    conversationPinnedMessages.add(convId, messageId);
    #ok;
  };

  /// Unpin the currently pinned message in a direct conversation. Any participant can unpin.
  public shared ({ caller }) func unpinConversationMessage(other : Principal) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    let convId = switch (findConversationIdByPair(caller, other)) {
      case null { return #err("Conversation not found") };
      case (?id) id;
    };

    let conv = switch (conversations.get(convId)) {
      case null { return #err("Conversation not found") };
      case (?c) c;
    };

    if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
      return #err("Unauthorized: Only conversation participants can unpin messages");
    };

    conversationPinnedMessages.remove(convId);
    #ok;
  };

  /// Returns the pinned message for a direct conversation, or null if none is pinned.
  public query ({ caller }) func getPinnedConversationMessage(other : Principal) : async ?Message {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };

    let convId = switch (findConversationIdByPair(caller, other)) {
      case null { return null };
      case (?id) id;
    };

    let conv = switch (conversations.get(convId)) {
      case null { return null };
      case (?c) c;
    };

    if (conv.participants.find(func(p : Principal) : Bool { p == caller }) == null) {
      return null;
    };

    let pinnedId = switch (conversationPinnedMessages.get(convId)) {
      case null { return null };
      case (?pid) pid;
    };

    conv.messages.find(func(m : Message) : Bool { m.id == pinnedId });
  };

  /// Pin a message in a group chat. Only group creator or admins can pin.
  /// Replaces any previously pinned message.
  public shared ({ caller }) func pinGroupMessage(groupId : Nat, messageId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    let group = switch (groupChats.get(groupId)) {
      case null { return #err("Group not found") };
      case (?g) g;
    };

    // Only creator or admins can pin
    let isAdmin = group.admins.find(func(p : Principal) : Bool { p == caller }) != null;
    if (not isAdmin) {
      return #err("Unauthorized: Only group admins can pin messages");
    };

    // Verify message exists in this group
    let msgs = switch (groupMessages.get(groupId)) {
      case null { return #err("No messages in this group") };
      case (?m) m;
    };

    let msgExists = msgs.find(func(m : GroupMessage) : Bool { m.id == messageId }) != null;
    if (not msgExists) {
      return #err("Message not found in this group");
    };

    groupPinnedMessages.add(groupId, messageId);
    #ok;
  };

  /// Unpin the currently pinned message in a group chat. Only group creator or admins can unpin.
  public shared ({ caller }) func unpinGroupMessage(groupId : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return #err("Unauthorized");
    };

    let group = switch (groupChats.get(groupId)) {
      case null { return #err("Group not found") };
      case (?g) g;
    };

    let isAdmin = group.admins.find(func(p : Principal) : Bool { p == caller }) != null;
    if (not isAdmin) {
      return #err("Unauthorized: Only group admins can unpin messages");
    };

    groupPinnedMessages.remove(groupId);
    #ok;
  };

  /// Returns the pinned group message, or null if none is pinned.
  public query ({ caller }) func getPinnedGroupMessage(groupId : Nat) : async ?GroupMessage {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };

    if (not isGroupParticipant(groupId, caller)) {
      return null;
    };

    let pinnedId = switch (groupPinnedMessages.get(groupId)) {
      case null { return null };
      case (?pid) pid;
    };

    let msgs = switch (groupMessages.get(groupId)) {
      case null { return null };
      case (?m) m;
    };

    msgs.find(func(m : GroupMessage) : Bool { m.id == pinnedId });
  };

};

