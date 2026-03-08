import AccessControl "authorization/access-control";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Float "mo:base/Float";

actor {
  // Authorization
  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // User Profiles
  public type UserProfile = {
    name : Text;
    username : Text;
    country : Text;
    gender : ?Text;
    birthYear : ?Nat;
    bio : ?Text;
    profilePicture : ?Storage.ExternalBlob;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var userProfiles = principalMap.empty<UserProfile>();

  // Follow System
  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  var followersMap = principalMap.empty<[Principal]>();
  var followingMap = principalMap.empty<[Principal]>();

  // Block System
  public type BlockRecord = {
    blocker : Principal;
    blocked : Principal;
    timestamp : Time.Time;
  };

  var blockListMap = principalMap.empty<[Principal]>();
  var blockRecords : [BlockRecord] = [];

  // Helper function to check if user1 has blocked user2
  func isBlocked(blocker : Principal, blocked : Principal) : Bool {
    switch (principalMap.get(blockListMap, blocker)) {
      case (?blockedList) {
        Array.find(blockedList, func(p : Principal) : Bool { p == blocked }) != null
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
      Debug.trap("Unauthorized: Only users can block others");
    };

    if (caller == userToBlock) {
      Debug.trap("Cannot block yourself");
    };

    switch (principalMap.get(userProfiles, userToBlock)) {
      case null {
        Debug.trap("User to block not found");
      };
      case (?_) {};
    };

    // Check if already blocked
    if (isBlocked(caller, userToBlock)) {
      Debug.trap("User is already blocked");
    };

    // Add to block list
    switch (principalMap.get(blockListMap, caller)) {
      case (?blockedList) {
        blockListMap := principalMap.put(blockListMap, caller, Array.append(blockedList, [userToBlock]));
      };
      case null {
        blockListMap := principalMap.put(blockListMap, caller, [userToBlock]);
      };
    };

    // Add block record
    let record : BlockRecord = {
      blocker = caller;
      blocked = userToBlock;
      timestamp = Time.now();
    };
    blockRecords := Array.append(blockRecords, [record]);

    // Automatically unfollow each other
    switch (principalMap.get(followingMap, caller)) {
      case (?followingList) {
        followingMap := principalMap.put(followingMap, caller, Array.filter(followingList, func(p : Principal) : Bool { p != userToBlock }));
      };
      case null {};
    };
    switch (principalMap.get(followersMap, userToBlock)) {
      case (?followersList) {
        followersMap := principalMap.put(followersMap, userToBlock, Array.filter(followersList, func(p : Principal) : Bool { p != caller }));
      };
      case null {};
    };
    switch (principalMap.get(followingMap, userToBlock)) {
      case (?followingList) {
        followingMap := principalMap.put(followingMap, userToBlock, Array.filter(followingList, func(p : Principal) : Bool { p != caller }));
      };
      case null {};
    };
    switch (principalMap.get(followersMap, caller)) {
      case (?followersList) {
        followersMap := principalMap.put(followersMap, caller, Array.filter(followersList, func(p : Principal) : Bool { p != userToBlock }));
      };
      case null {};
    };
  };

  public shared ({ caller }) func unblockUser(userToUnblock : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unblock others");
    };

    if (caller == userToUnblock) {
      Debug.trap("Cannot unblock yourself");
    };

    // Check if actually blocked
    if (not isBlocked(caller, userToUnblock)) {
      Debug.trap("User is not blocked");
    };

    // Remove from block list
    switch (principalMap.get(blockListMap, caller)) {
      case (?blockedList) {
        blockListMap := principalMap.put(blockListMap, caller, Array.filter(blockedList, func(p : Principal) : Bool { p != userToUnblock }));
      };
      case null {};
    };
  };

  public query ({ caller }) func getBlockedUsers() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their block list");
    };

    switch (principalMap.get(blockListMap, caller)) {
      case (?blockedList) blockedList;
      case null [];
    };
  };

  public query ({ caller }) func isUserBlocked(user : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can check block status");
    };

    isBlocked(caller, user);
  };

  public query ({ caller }) func getAllBlockRecords() : async [BlockRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view all block records");
    };

    blockRecords;
  };

  // Helper function to check if username is admin
  func isAdminUsername(username : Text) : Bool {
    Text.equal(username, "rosalia");
  };

  // Helper function to verify admin by username
  func verifyAdminByUsername(caller : Principal) : Bool {
    switch (principalMap.get(userProfiles, caller)) {
      case (?profile) {
        isAdminUsername(profile.username) and AccessControl.isAdmin(accessControlState, caller);
      };
      case null { false };
    };
  };

  // Function to get admin principle by username
  func getAdminPrincipal(username : Text) : ?Principal {
    for ((principal, profile) in principalMap.entries(userProfiles)) {
      if (profile.username == username and AccessControl.isAdmin(accessControlState, principal)) {
        return ?principal;
      };
    };
    null;
  };

  public query ({ caller }) func getCallerUserProfile() : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    switch (principalMap.get(userProfiles, caller)) {
      case (?profile) profile;
      case null {
        Debug.trap("Profile for caller " # Principal.toText(caller) # " not found");
      };
    };
  };

  public query ({ caller }) func getUserProfile({ profileId : Principal }) : async UserProfile {
    // Require authentication to view profiles
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view profiles");
    };

    // Authenticated users cannot view blocked profiles
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (hasBlockingRelationship(caller, profileId)) {
        Debug.trap("Cannot view profile: blocking relationship exists");
      };
    };

    switch (principalMap.get(userProfiles, profileId)) {
      case (?actualProfile) actualProfile;
      case null {
        Debug.trap("Profile for principal " # Principal.toText(profileId) # " not found");
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };

    // Prevent non-admins from using admin username
    if (isAdminUsername(profile.username) and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Username 'rosalia' is reserved for admin");
    };

    userProfiles := principalMap.put(userProfiles, caller, profile);

    // Initialize follow lists if not exists
    switch (principalMap.get(followersMap, caller)) {
      case null {
        followersMap := principalMap.put(followersMap, caller, []);
      };
      case (?_) {};
    };

    switch (principalMap.get(followingMap, caller)) {
      case null {
        followingMap := principalMap.put(followingMap, caller, []);
      };
      case (?_) {};
    };

    // Initialize block list if not exists
    switch (principalMap.get(blockListMap, caller)) {
      case null {
        blockListMap := principalMap.put(blockListMap, caller, []);
      };
      case (?_) {};
    };
  };

  public shared ({ caller }) func deleteCallerProfile() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete profiles");
    };

    if (AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Admin cannot delete their profile");
    };

    userProfiles := principalMap.delete(userProfiles, caller);
    followersMap := principalMap.delete(followersMap, caller);
    followingMap := principalMap.delete(followingMap, caller);
    blockListMap := principalMap.delete(blockListMap, caller);
  };

  public query ({ caller }) func isFollowing(targetUser : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can check following status");
    };

    switch (principalMap.get(followingMap, caller)) {
      case (?followingList) {
        switch (Array.find(followingList, func(p) { p == targetUser })) {
          case null { false };
          case (?_) { true };
        };
      };
      case null false;
    };
  };

  public shared ({ caller }) func followUser(targetUser : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can follow others");
    };

    if (caller == targetUser) {
      Debug.trap("Cannot follow yourself");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, targetUser)) {
      Debug.trap("Cannot follow: blocking relationship exists");
    };

    switch (principalMap.get(userProfiles, targetUser)) {
      case null {
        Debug.trap("Target user profile not found");
      };
      case (?_) {};
    };

    switch (principalMap.get(followingMap, caller)) {
      case (?followingList) {
        switch (Array.find(followingList, func(p) { p == targetUser })) {
          case null {
            followingMap := principalMap.put(followingMap, caller, Array.append(followingList, [targetUser]));
          };
          case (?_) {
            return; // Already following
          };
        };
      };
      case null {
        followingMap := principalMap.put(followingMap, caller, [targetUser]);
      };
    };
    
    switch (principalMap.get(followersMap, targetUser)) {
      case (?followersList) {
        switch (Array.find(followersList, func(p) { p == caller })) {
          case null {
            followersMap := principalMap.put(followersMap, targetUser, Array.append(followersList, [caller]));
          };
          case (?_) {};
        };
      };
      case null {
        followersMap := principalMap.put(followersMap, targetUser, [caller]);
      };
    };

    // Send follow notification
    createFollowNotification(caller, targetUser);
  };

  public shared ({ caller }) func unfollowUser(targetUser : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unfollow others");
    };

    switch (principalMap.get(followingMap, caller)) {
      case (?followingList) {
        followingMap := principalMap.put(followingMap, caller, Array.filter(followingList, func(p : Principal) : Bool { p != targetUser }));
      };
      case null {};
    };
    switch (principalMap.get(followersMap, targetUser)) {
      case (?followersList) {
        followersMap := principalMap.put(followersMap, targetUser, Array.filter(followersList, func(p : Principal) : Bool { p != caller }));
      };
      case null {};
    };
  };

  public query ({ caller }) func getFollowerCount(targetUser : Principal) : async Nat {
    // Require authentication to view follower counts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view follower counts");
    };

    switch (principalMap.get(followersMap, targetUser)) {
      case (?followersList) followersList.size();
      case null 0;
    };
  };

  public query ({ caller }) func getFollowingCount(targetUser : Principal) : async Nat {
    // Require authentication to view following counts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view following counts");
    };

    switch (principalMap.get(followingMap, targetUser)) {
      case (?followingList) followingList.size();
      case null 0;
    };
  };

  // New function to get posts from followed users
  public query ({ caller }) func getPostsFromFollowedUsers() : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view followed posts");
    };

    switch (principalMap.get(followingMap, caller)) {
      case (?followingList) {
        let buffer = Buffer.Buffer<Post>(0);
        for ((postId, post) in textMap.entries(posts)) {
          // Filter out posts from blocked users
          if (not hasBlockingRelationship(caller, post.author)) {
            if (Array.find(followingList, func(p : Principal) : Bool { p == post.author }) != null) {
              buffer.add(post);
            };
          };
        };
        Buffer.toArray(buffer);
      };
      case null {
        Debug.trap("No following list found for user");
      };
    };
  };

  // Story System
  public type Story = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time.Time;
    expiresAt : Time.Time;
    viewedBy : [Principal];
  };

  var nextStoryId = 0;
  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);
  var stories = natMap.empty<Story>();
  var userStories = principalMap.empty<[Nat]>();

  let storyDuration : Int = 72 * 60 * 60 * 1_000_000_000; // 72 hours in nanoseconds

  public shared ({ caller }) func createStory(content : MessageType) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create stories");
    };

    // Validate content type - only image, video, and media allowed
    switch (content) {
      case (#image(_)) {};
      case (#video(_)) {};
      case (#media(_)) {};
      case (_) {
        Debug.trap("Invalid content type: Only image, video, and media messages can be transformed into stories");
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
    };

    stories := natMap.put(stories, storyId, story);

    // Add to user's story list
    switch (principalMap.get(userStories, caller)) {
      case (?storyList) {
        userStories := principalMap.put(userStories, caller, Array.append(storyList, [storyId]));
      };
      case null {
        userStories := principalMap.put(userStories, caller, [storyId]);
      };
    };

    storyId;
  };

  public query ({ caller }) func getActiveStories() : async [Story] {
    // Require authentication to view stories
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view stories");
    };

    let now = Time.now();
    let buffer = Buffer.Buffer<Story>(0);

    for ((storyId, story) in natMap.entries(stories)) {
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
      Debug.trap("Unauthorized: Only authenticated users can view stories");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, userId)) {
      Debug.trap("Cannot view stories: blocking relationship exists");
    };

    let now = Time.now();
    let buffer = Buffer.Buffer<Story>(0);

    switch (principalMap.get(userStories, userId)) {
      case (?storyIds) {
        for (storyId in storyIds.vals()) {
          switch (natMap.get(stories, storyId)) {
            case (?story) {
              if (story.expiresAt > now) {
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
      Debug.trap("Unauthorized: Only users can view stories");
    };

    switch (natMap.get(stories, storyId)) {
      case (?story) {
        // Check blocking relationship
        if (hasBlockingRelationship(caller, story.author)) {
          Debug.trap("Cannot view story: blocking relationship exists");
        };

        // Check if story is expired
        if (story.expiresAt <= Time.now()) {
          Debug.trap("Story has expired");
        };

        // Verify caller has a valid user profile
        switch (principalMap.get(userProfiles, caller)) {
          case null {
            Debug.trap("User profile not found");
          };
          case (?_) {};
        };

        // Check if already viewed
        let alreadyViewed = Array.find(story.viewedBy, func(p : Principal) : Bool { p == caller });
        switch (alreadyViewed) {
          case null {
            let updatedStory = {
              story with
              viewedBy = Array.append(story.viewedBy, [caller]);
            };
            stories := natMap.put(stories, storyId, updatedStory);

            // Send story view notification to author if viewer is not the author
            if (story.author != caller) {
              createStoryViewNotification(caller, story.author, storyId);
            };
          };
          case (?_) {};
        };
      };
      case null {
        Debug.trap("Story not found");
      };
    };
  };

  // System maintenance function - restricted to admin only for security
  public shared ({ caller }) func cleanupExpiredStories() : async Nat {
    // Restrict to admin only for security
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can trigger story cleanup");
    };

    let now = Time.now();
    var cleanedCount = 0;

    let storyBuffer = Buffer.Buffer<(Nat, Story)>(0);
    for ((storyId, story) in natMap.entries(stories)) {
      if (story.expiresAt <= now) {
        cleanedCount += 1;
      } else {
        storyBuffer.add((storyId, story));
      };
    };

    // Rebuild stories map without expired stories
    var newStories = natMap.empty<Story>();
    for ((storyId, story) in storyBuffer.vals()) {
      newStories := natMap.put(newStories, storyId, story);
    };
    stories := newStories;

    // Clean up user story lists
    for ((userId, storyIds) in principalMap.entries(userStories)) {
      let activeStoryIds = Array.filter(storyIds, func(storyId : Nat) : Bool {
        switch (natMap.get(stories, storyId)) {
          case (?_) true;
          case null false;
        };
      });
      userStories := principalMap.put(userStories, userId, activeStoryIds);
    };

    cleanedCount;
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
  };

  var nextGroupId = 0;
  var nextGroupMessageId = 0;
  var groupChats = natMap.empty<GroupChat>();
  var groupMessages = natMap.empty<[GroupMessage]>();
  var userGroups = principalMap.empty<[Nat]>();

  public shared ({ caller }) func createGroupChat(name : Text, initialParticipants : [Principal], avatar : ?Storage.ExternalBlob) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create group chats");
    };

    if (name.size() == 0) {
      Debug.trap("Group name cannot be empty");
    };

    // Verify all participants exist and check blocking
    for (participant in initialParticipants.vals()) {
      switch (principalMap.get(userProfiles, participant)) {
        case null {
          Debug.trap("Participant " # Principal.toText(participant) # " not found");
        };
        case (?_) {};
      };

      // Check if creator has blocking relationship with any participant
      if (hasBlockingRelationship(caller, participant)) {
        Debug.trap("Cannot create group: blocking relationship exists with " # Principal.toText(participant));
      };
    };

    let groupId = nextGroupId;
    nextGroupId += 1;

    // Creator is automatically included and is admin
    let allParticipants = if (Array.find(initialParticipants, func(p : Principal) : Bool { p == caller }) == null) {
      Array.append([caller], initialParticipants)
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

    groupChats := natMap.put(groupChats, groupId, group);
    groupMessages := natMap.put(groupMessages, groupId, []);

    // Add group to all participants' group lists
    for (participant in allParticipants.vals()) {
      switch (principalMap.get(userGroups, participant)) {
        case (?groups) {
          userGroups := principalMap.put(userGroups, participant, Array.append(groups, [groupId]));
        };
        case null {
          userGroups := principalMap.put(userGroups, participant, [groupId]);
        };
      };
    };

    groupId;
  };

  func isGroupAdmin(groupId : Nat, user : Principal) : Bool {
    switch (natMap.get(groupChats, groupId)) {
      case (?group) {
        Array.find(group.admins, func(p : Principal) : Bool { p == user }) != null
      };
      case null false;
    };
  };

  func isGroupParticipant(groupId : Nat, user : Principal) : Bool {
    switch (natMap.get(groupChats, groupId)) {
      case (?group) {
        Array.find(group.participants, func(p : Principal) : Bool { p == user }) != null
      };
      case null false;
    };
  };

  public shared ({ caller }) func addGroupParticipant(groupId : Nat, newParticipant : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can add participants");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Debug.trap("Unauthorized: Only group admins can add participants");
    };

    // Verify caller is still a participant
    if (not isGroupParticipant(groupId, caller)) {
      Debug.trap("Unauthorized: You are no longer a participant of this group");
    };

    // Check blocking relationship between caller and new participant
    if (hasBlockingRelationship(caller, newParticipant)) {
      Debug.trap("Cannot add participant: blocking relationship exists");
    };

    switch (principalMap.get(userProfiles, newParticipant)) {
      case null {
        Debug.trap("User not found");
      };
      case (?_) {};
    };

    switch (natMap.get(groupChats, groupId)) {
      case (?group) {
        // Check if already a participant
        if (Array.find(group.participants, func(p : Principal) : Bool { p == newParticipant }) != null) {
          Debug.trap("User is already a participant");
        };

        // Check blocking relationship with any existing participant
        for (participant in group.participants.vals()) {
          if (hasBlockingRelationship(participant, newParticipant)) {
            Debug.trap("Cannot add participant: blocking relationship exists with existing member");
          };
        };

        let updatedGroup = {
          group with
          participants = Array.append(group.participants, [newParticipant]);
        };
        groupChats := natMap.put(groupChats, groupId, updatedGroup);

        // Add group to participant's group list
        switch (principalMap.get(userGroups, newParticipant)) {
          case (?groups) {
            userGroups := principalMap.put(userGroups, newParticipant, Array.append(groups, [groupId]));
          };
          case null {
            userGroups := principalMap.put(userGroups, newParticipant, [groupId]);
          };
        };

        // Send notification to new participant
        createGroupAddNotification(caller, newParticipant, groupId, group.name);
      };
      case null {
        Debug.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func removeGroupParticipant(groupId : Nat, participant : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can remove participants");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Debug.trap("Unauthorized: Only group admins can remove participants");
    };

    // Verify caller is still a participant
    if (not isGroupParticipant(groupId, caller)) {
      Debug.trap("Unauthorized: You are no longer a participant of this group");
    };

    switch (natMap.get(groupChats, groupId)) {
      case (?group) {
        // Cannot remove creator
        if (participant == group.creator) {
          Debug.trap("Cannot remove group creator");
        };

        // Verify participant is actually in the group
        if (not isGroupParticipant(groupId, participant)) {
          Debug.trap("User is not a participant of this group");
        };

        let updatedParticipants = Array.filter(group.participants, func(p : Principal) : Bool { p != participant });
        let updatedAdmins = Array.filter(group.admins, func(p : Principal) : Bool { p != participant });

        let updatedGroup = {
          group with
          participants = updatedParticipants;
          admins = updatedAdmins;
        };
        groupChats := natMap.put(groupChats, groupId, updatedGroup);

        // Remove group from participant's group list
        switch (principalMap.get(userGroups, participant)) {
          case (?groups) {
            userGroups := principalMap.put(userGroups, participant, Array.filter(groups, func(g : Nat) : Bool { g != groupId }));
          };
          case null {};
        };
      };
      case null {
        Debug.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func leaveGroup(groupId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can leave groups");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Debug.trap("You are not a participant of this group");
    };

    switch (natMap.get(groupChats, groupId)) {
      case (?group) {
        // Creator cannot leave their own group
        if (caller == group.creator) {
          Debug.trap("Group creator cannot leave the group. Transfer ownership or delete the group instead.");
        };

        let updatedParticipants = Array.filter(group.participants, func(p : Principal) : Bool { p != caller });
        let updatedAdmins = Array.filter(group.admins, func(p : Principal) : Bool { p != caller });

        let updatedGroup = {
          group with
          participants = updatedParticipants;
          admins = updatedAdmins;
        };
        groupChats := natMap.put(groupChats, groupId, updatedGroup);

        // Remove group from caller's group list
        switch (principalMap.get(userGroups, caller)) {
          case (?groups) {
            userGroups := principalMap.put(userGroups, caller, Array.filter(groups, func(g : Nat) : Bool { g != groupId }));
          };
          case null {};
        };
      };
      case null {
        Debug.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func updateGroupName(groupId : Nat, newName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update group name");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Debug.trap("Unauthorized: Only group admins can update group name");
    };

    // Verify caller is still a participant
    if (not isGroupParticipant(groupId, caller)) {
      Debug.trap("Unauthorized: You are no longer a participant of this group");
    };

    if (newName.size() == 0) {
      Debug.trap("Group name cannot be empty");
    };

    switch (natMap.get(groupChats, groupId)) {
      case (?group) {
        let updatedGroup = {
          group with
          name = newName;
        };
        groupChats := natMap.put(groupChats, groupId, updatedGroup);
      };
      case null {
        Debug.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func updateGroupAvatar(groupId : Nat, newAvatar : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update group avatar");
    };

    if (not isGroupAdmin(groupId, caller)) {
      Debug.trap("Unauthorized: Only group admins can update group avatar");
    };

    // Verify caller is still a participant
    if (not isGroupParticipant(groupId, caller)) {
      Debug.trap("Unauthorized: You are no longer a participant of this group");
    };

    switch (natMap.get(groupChats, groupId)) {
      case (?group) {
        let updatedGroup = {
          group with
          avatar = newAvatar;
        };
        groupChats := natMap.put(groupChats, groupId, updatedGroup);
      };
      case null {
        Debug.trap("Group not found");
      };
    };
  };

  public shared ({ caller }) func sendGroupMessage(groupId : Nat, content : MessageType) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can send group messages");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Debug.trap("Unauthorized: Only group participants can send messages");
    };

    switch (natMap.get(groupChats, groupId)) {
      case (?group) {
        // Check if sender has blocking relationship with any participant
        for (participant in group.participants.vals()) {
          if (participant != caller and hasBlockingRelationship(caller, participant)) {
            Debug.trap("Cannot send message: blocking relationship exists with group member");
          };
        };

        // Handle Rose gifting in groups
        switch (content) {
          case (#rose(amount)) {
            Debug.trap("Rose gifting in groups is not supported. Please gift individually.");
          };
          case (_) {};
        };

        let messageId = nextGroupMessageId;
        nextGroupMessageId += 1;

        let senderProfile = principalMap.get(userProfiles, caller);

        let message : GroupMessage = {
          id = messageId;
          groupId;
          sender = caller;
          content;
          timestamp = Time.now();
          senderProfile;
        };

        switch (natMap.get(groupMessages, groupId)) {
          case (?messages) {
            groupMessages := natMap.put(groupMessages, groupId, Array.append(messages, [message]));
          };
          case null {
            groupMessages := natMap.put(groupMessages, groupId, [message]);
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
            createGroupMessageNotification(caller, participant, groupId, group.name, contentPreview);
          };
        };
      };
      case null {
        Debug.trap("Group not found");
      };
    };
  };

  public query ({ caller }) func getGroupChats() : async [GroupChat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view group chats");
    };

    let buffer = Buffer.Buffer<GroupChat>(0);
    switch (principalMap.get(userGroups, caller)) {
      case (?groupIds) {
        for (groupId in groupIds.vals()) {
          switch (natMap.get(groupChats, groupId)) {
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
      Debug.trap("Unauthorized: Only users can view group messages");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Debug.trap("Unauthorized: Only group participants can view messages");
    };

    switch (natMap.get(groupMessages, groupId)) {
      case (?messages) messages;
      case null [];
    };
  };

  public query ({ caller }) func getGroupDetails(groupId : Nat) : async GroupChat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view group details");
    };

    if (not isGroupParticipant(groupId, caller)) {
      Debug.trap("Unauthorized: Only group participants can view group details");
    };

    switch (natMap.get(groupChats, groupId)) {
      case (?group) group;
      case null {
        Debug.trap("Group not found");
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
  };

  public type Conversation = {
    id : Nat;
    participants : [Principal];
    messages : [Message];
    otherParticipantProfile : ?UserProfile;
  };

  var nextMessageId = 0;
  var nextConversationId = 0;
  var conversations = natMap.empty<Conversation>();

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

  public shared ({ caller }) func sendMessage(receiver : Principal, content : MessageType) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can send messages");
    };

    if (caller == receiver) {
      Debug.trap("Cannot send messages to yourself");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, receiver)) {
      Debug.trap("Cannot send message: blocking relationship exists");
    };

    switch (principalMap.get(userProfiles, receiver)) {
      case null {
        Debug.trap("Receiver profile not found");
      };
      case (?_) {};
    };

    switch (content) {
      case (#rose(amount)) {
        if (amount < 0.01) {
          Debug.trap("Minimum gift amount is 0.01 Rose");
        };
        let senderBalance = switch (principalMap.get(roseBalances, caller)) {
          case null { 0.0 };
          case (?balance) { balance };
        };
        if (senderBalance < amount) {
          Debug.trap("Insufficient balance to gift " # Float.toText(amount) # " Roses");
        };
        let fee = giftRosesInternal(caller, receiver, amount);

        let receipt = createReceiptMessage(caller, receiver, amount, fee, "GIFT");
        sendReceiptMessage(caller, receiver, receipt);
        
        // Send notification to receiver
        createRoseGiftNotification(caller, receiver, amount, nextRoseTransactionId - 1);
      };
      case (#forwardedPost(postDetails)) {
        // Verify post exists
        switch (textMap.get(posts, postDetails.postId)) {
          case null {
            Debug.trap("Post not found");
          };
          case (?_) {};
        };

        let senderProfile = principalMap.get(userProfiles, caller);
        let messageId = nextMessageId;
        nextMessageId += 1;
        let message : Message = {
          id = messageId;
          sender = caller;
          receiver;
          content = #forwardedPost(postDetails);
          timestamp = Time.now();
          senderProfile;
        };

        func findConversation() : ?(Nat, Conversation) {
          for ((id, conv) in natMap.entries(conversations)) {
            if (Array.size(conv.participants) == 2) {
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

        let otherParticipantProfile = principalMap.get(userProfiles, receiver);

        switch (findConversation()) {
          case (?foundConv) {
            let (convId, conv) = foundConv;
            let updatedConv = {
              id = convId;
              participants = conv.participants;
              messages = Array.append(conv.messages, [message]);
              otherParticipantProfile;
            };
            conversations := natMap.put(conversations, convId, updatedConv);
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
            conversations := natMap.put(conversations, convId, newConv);
          };
        };
        
        // Send message notification
        createMessageNotification(caller, receiver, "Forwarded a post", nextConversationId - 1);
        return;
      };
      case (_) {};
    };

    let messageId = nextMessageId;
    nextMessageId += 1;

    let senderProfile = principalMap.get(userProfiles, caller);

    let message : Message = {
      id = messageId;
      sender = caller;
      receiver;
      content;
      timestamp = Time.now();
      senderProfile;
    };

    func findConversation() : ?(Nat, Conversation) {
      for ((id, conv) in natMap.entries(conversations)) {
        if (Array.size(conv.participants) == 2) {
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

    let otherParticipantProfile = principalMap.get(userProfiles, receiver);

    switch (findConversation()) {
      case (?foundConv) {
        let (convId, conv) = foundConv;
        let updatedConv = {
          id = convId;
          participants = conv.participants;
          messages = Array.append(conv.messages, [message]);
          otherParticipantProfile;
        };
        conversations := natMap.put(conversations, convId, updatedConv);
        
        // Send message notification
        let contentPreview = switch (content) {
          case (#text(t)) t;
          case (#image(_)) "Image";
          case (#video(_)) "Video";
          case (#voice(_)) "Voice message";
          case (#media(_)) "Media";
          case (_) "New message";
        };
        createMessageNotification(caller, receiver, contentPreview, convId);
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
        conversations := natMap.put(conversations, convId, newConv);
        
        // Send message notification
        let contentPreview = switch (content) {
          case (#text(t)) t;
          case (#image(_)) "Image";
          case (#video(_)) "Video";
          case (#voice(_)) "Voice message";
          case (#media(_)) "Media";
          case (_) "New message";
        };
        createMessageNotification(caller, receiver, contentPreview, convId);
      };
    };
  };

  public shared ({ caller }) func leaveConversation(conversationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can leave conversations");
    };

    switch (natMap.get(conversations, conversationId)) {
      case (?conv) {
        // Verify caller is participant
        if (Array.find(conv.participants, func(p : Principal) : Bool { p == caller }) == null) {
          Debug.trap("You are not a participant of this conversation");
        };

        // Remove caller from participants
        let updatedParticipants = Array.filter(conv.participants, func(p : Principal) : Bool { p != caller });

        // If no participants left, delete conversation
        if (updatedParticipants.size() == 0) {
          conversations := natMap.delete(conversations, conversationId);
        } else {
          let updatedConv = {
            conv with
            participants = updatedParticipants;
          };
          conversations := natMap.put(conversations, conversationId, updatedConv);
        };
      };
      case null {
        Debug.trap("Conversation not found");
      };
    };
  };

  public shared ({ caller }) func editMessage(conversationId : Nat, messageId : Nat, newContent : MessageType) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can edit messages");
    };

    switch (natMap.get(conversations, conversationId)) {
      case (?conv) {
        // Verify caller is participant
        if (Array.find(conv.participants, func(p : Principal) : Bool { p == caller }) == null) {
          Debug.trap("Unauthorized: Only conversation participants can edit messages");
        };

        let updatedMessages = Array.map(conv.messages, func(msg : Message) : Message {
          if (msg.id == messageId) {
            if (msg.sender != caller) {
              Debug.trap("Unauthorized: Only message sender can edit this message");
            };
            // Cannot edit system messages
            switch (msg.content) {
              case (#receipt(_)) {
                Debug.trap("Cannot edit receipt messages");
              };
              case (#tradeRequest(_)) {
                Debug.trap("Cannot edit trade request messages");
              };
              case (_) {};
            };
            { msg with content = newContent }
          } else {
            msg
          }
        });

        let updatedConv = {
          conv with
          messages = updatedMessages;
        };
        conversations := natMap.put(conversations, conversationId, updatedConv);
      };
      case null {
        Debug.trap("Conversation not found");
      };
    };
  };

  public shared ({ caller }) func deleteMessage(conversationId : Nat, messageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete messages");
    };

    switch (natMap.get(conversations, conversationId)) {
      case (?conv) {
        // Verify caller is participant
        if (Array.find(conv.participants, func(p : Principal) : Bool { p == caller }) == null) {
          Debug.trap("Unauthorized: Only conversation participants can delete messages");
        };

        // Find message and verify ownership
        let messageToDelete = Array.find(conv.messages, func(msg : Message) : Bool { msg.id == messageId });
        switch (messageToDelete) {
          case (?msg) {
            if (msg.sender != caller and not AccessControl.isAdmin(accessControlState, caller)) {
              Debug.trap("Unauthorized: Only message sender or admin can delete this message");
            };
          };
          case null {
            Debug.trap("Message not found");
          };
        };

        let updatedMessages = Array.filter(conv.messages, func(msg : Message) : Bool { msg.id != messageId });

        let updatedConv = {
          conv with
          messages = updatedMessages;
        };
        conversations := natMap.put(conversations, conversationId, updatedConv);
      };
      case null {
        Debug.trap("Conversation not found");
      };
    };
  };

  func sendReceiptMessage(sender : Principal, receiver : Principal, receipt : ReceiptMessage) {
    let messageId = nextMessageId;
    nextMessageId += 1;

    let senderProfile = principalMap.get(userProfiles, sender);

    let message : Message = {
      id = messageId;
      sender;
      receiver;
      content = #receipt(receipt);
      timestamp = Time.now();
      senderProfile;
    };

    func findConversation() : ?(Nat, Conversation) {
      for ((id, conv) in natMap.entries(conversations)) {
        if (Array.size(conv.participants) == 2) {
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

    let otherParticipantProfile = principalMap.get(userProfiles, receiver);

    switch (findConversation()) {
      case (?foundConv) {
        let (convId, conv) = foundConv;
        let updatedConv = {
          id = convId;
          participants = conv.participants;
          messages = Array.append(conv.messages, [message]);
          otherParticipantProfile;
        };
        conversations := natMap.put(conversations, convId, updatedConv);
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
        conversations := natMap.put(conversations, convId, newConv);
      };
    };
  };

  func sendTradeRequestMessage(requester : Principal, admin : Principal, tradeRequest : TradeRequestMessage) {
    let messageId = nextMessageId;
    nextMessageId += 1;

    let senderProfile = principalMap.get(userProfiles, requester);

    let message : Message = {
      id = messageId;
      sender = requester;
      receiver = admin;
      content = #tradeRequest(tradeRequest);
      timestamp = Time.now();
      senderProfile;
    };

    func findConversation() : ?(Nat, Conversation) {
      for ((id, conv) in natMap.entries(conversations)) {
        if (Array.size(conv.participants) == 2) {
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

    let otherParticipantProfile = principalMap.get(userProfiles, admin);

    switch (findConversation()) {
      case (?foundConv) {
        let (convId, conv) = foundConv;
        let updatedConv = {
          id = convId;
          participants = conv.participants;
          messages = Array.append(conv.messages, [message]);
          otherParticipantProfile;
        };
        conversations := natMap.put(conversations, convId, updatedConv);
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
        conversations := natMap.put(conversations, convId, newConv);
      };
    };
    
    // Send trade request notification to admin
    createTradeRequestNotification(requester, admin, tradeRequest.amount, tradeRequest.requestType);
  };

  public query ({ caller }) func getConversations() : async [Conversation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view conversations");
    };

    let buffer = Buffer.Buffer<Conversation>(0);
    for ((__id, conv) in natMap.entries(conversations)) {
      let isParticipant = Array.find<Principal>(conv.participants, func(p) { p == caller });
      switch (isParticipant) {
        case (?_) {
          let otherParticipant = Array.find<Principal>(
            conv.participants,
            func(p) { p != caller },
          );

          let convWithProfile = {
            conv with
            otherParticipantProfile = switch (otherParticipant) {
              case (null) null;
              case (?id) principalMap.get(userProfiles, id);
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
  public type Post = {
    id : Text;
    author : Principal;
    content : Text;
    timestamp : Time.Time;
    image : ?Storage.ExternalBlob;
  };

  var posts = textMap.empty<Post>();

  // Pinned Trending Post
  // Only one post can be pinned at a time; stored as an optional post ID.
  var pinnedTrendingPostId : ?Text = null;

  // Pin a post to the top of the Trending tab. Admin-only action.
  public shared ({ caller }) func pinPostToTrending(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can pin posts to trending");
    };

    switch (textMap.get(posts, postId)) {
      case null {
        Debug.trap("Post not found");
      };
      case (?_) {};
    };

    pinnedTrendingPostId := ?postId;
  };

  // Unpin the currently pinned trending post. Admin-only action.
  public shared ({ caller }) func unpinTrendingPost() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can unpin trending posts");
    };

    pinnedTrendingPostId := null;
  };

  // Get the currently pinned trending post. Any authenticated user can read.
  public query ({ caller }) func getPinnedTrendingPost() : async ?Post {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view the pinned trending post");
    };

    switch (pinnedTrendingPostId) {
      case null { null };
      case (?postId) {
        switch (textMap.get(posts, postId)) {
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

  var likesMap = textMap.empty<[LikeInteraction]>();
  var commentsMap = textMap.empty<[CommentInteraction]>();
  var savesMap = textMap.empty<[SaveInteraction]>();
  var forwardsMap = textMap.empty<[ForwardInteraction]>();
  var postRoseGiftsMap = textMap.empty<[RoseGiftOnPost]>();

  public shared ({ caller }) func createPost(content : Text, image : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create posts");
    };

    let post : Post = {
      id = Principal.toText(caller) # "-" # debug_show (Time.now());
      author = caller;
      content;
      timestamp = Time.now();
      image;
    };

    posts := textMap.put(posts, post.id, post);
  };

  public shared ({ caller }) func editPost(postId : Text, content : Text, image : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can edit posts");
    };

    switch (textMap.get(posts, postId)) {
      case (?post) {
        if (post.author != caller) {
          Debug.trap("Unauthorized: Only the post author can edit this post");
        };
        let updatedPost = {
          post with
          content;
          image;
        };
        posts := textMap.put(posts, postId, updatedPost);
      };
      case null {
        Debug.trap("Post not found");
      };
    };
  };

  public shared ({ caller }) func deletePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete posts");
    };

    switch (textMap.get(posts, postId)) {
      case (?post) {
        if (post.author != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only the post author or admin can delete this post");
        };
        posts := textMap.delete(posts, postId);
        likesMap := textMap.delete(likesMap, postId);
        commentsMap := textMap.delete(commentsMap, postId);
        savesMap := textMap.delete(savesMap, postId);
        forwardsMap := textMap.delete(forwardsMap, postId);
        postRoseGiftsMap := textMap.delete(postRoseGiftsMap, postId);
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
        Debug.trap("Post not found");
      };
    };
  };

  public shared ({ caller }) func likePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can like posts");
    };

    switch (textMap.get(posts, postId)) {
      case null {
        Debug.trap("Post not found");
      };
      case (?post) {
        // Check blocking relationship
        if (hasBlockingRelationship(caller, post.author)) {
          Debug.trap("Cannot like post: blocking relationship exists");
        };

        let like : LikeInteraction = {
          postId;
          user = caller;
          timestamp = Time.now();
        };

        switch (textMap.get(likesMap, postId)) {
          case (?likes) {
            let alreadyLiked = Array.find(likes, func(l : LikeInteraction) : Bool { l.user == caller });
            switch (alreadyLiked) {
              case null {
                likesMap := textMap.put(likesMap, postId, Array.append(likes, [like]));
                // Send like notification to post author
                if (post.author != caller) {
                  createLikeNotification(caller, post.author, postId, post.content);
                };
              };
              case (?_) {};
            };
          };
          case null {
            likesMap := textMap.put(likesMap, postId, [like]);
            // Send like notification to post author
            if (post.author != caller) {
              createLikeNotification(caller, post.author, postId, post.content);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unlike posts");
    };

    switch (textMap.get(posts, postId)) {
      case null {
        Debug.trap("Post not found");
      };
      case (?_) {
        switch (textMap.get(likesMap, postId)) {
          case (?likes) {
            likesMap := textMap.put(likesMap, postId, Array.filter(likes, func(l : LikeInteraction) : Bool { l.user != caller }));
          };
          case null {};
        };
      };
    };
  };

  public shared ({ caller }) func commentOnPost(postId : Text, comment : Text, parentCommentId : ?Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can comment on posts");
    };

    switch (textMap.get(posts, postId)) {
      case null {
        Debug.trap("Post not found");
      };
      case (?post) {
        // Check blocking relationship
        if (hasBlockingRelationship(caller, post.author)) {
          Debug.trap("Cannot comment on post: blocking relationship exists");
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

        switch (textMap.get(commentsMap, postId)) {
          case (?comments) {
            commentsMap := textMap.put(commentsMap, postId, Array.append(comments, [commentInteraction]));
          };
          case null {
            commentsMap := textMap.put(commentsMap, postId, [commentInteraction]);
          };
        };
        
        // Send comment notification to post author
        if (post.author != caller) {
          createCommentNotification(caller, post.author, postId, comment);
        };
      };
    };
  };

  public shared ({ caller }) func deleteComment(postId : Text, commentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete comments");
    };

    switch (textMap.get(commentsMap, postId)) {
      case (?comments) {
        let commentToDelete = Array.find(comments, func(c : CommentInteraction) : Bool { c.id == commentId });
        switch (commentToDelete) {
          case (?comment) {
            if (comment.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
              Debug.trap("Unauthorized: Only the comment author or admin can delete this comment");
            };
            let updatedComments = Array.filter(comments, func(c : CommentInteraction) : Bool { c.id != commentId });
            commentsMap := textMap.put(commentsMap, postId, updatedComments);
          };
          case null {
            Debug.trap("Comment not found");
          };
        };
      };
      case null {
        Debug.trap("No comments found for this post");
      };
    };
  };

  public query ({ caller }) func getPostComments(postId : Text) : async [CommentInteraction] {
    // Require authentication to view comments
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view comments");
    };

    switch (textMap.get(commentsMap, postId)) {
      case (?comments) comments;
      case null [];
    };
  };

  public shared ({ caller }) func savePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save posts");
    };

    switch (textMap.get(posts, postId)) {
      case null {
        Debug.trap("Post not found");
      };
      case (?_) {
        let save : SaveInteraction = {
          postId;
          user = caller;
          timestamp = Time.now();
        };

        switch (textMap.get(savesMap, postId)) {
          case (?saves) {
            let alreadySaved = Array.find(saves, func(s : SaveInteraction) : Bool { s.user == caller });
            switch (alreadySaved) {
              case null {
                savesMap := textMap.put(savesMap, postId, Array.append(saves, [save]));
              };
              case (?_) {};
            };
          };
          case null {
            savesMap := textMap.put(savesMap, postId, [save]);
          };
        };
      };
    };
  };

  public shared ({ caller }) func unsavePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unsave posts");
    };

    switch (textMap.get(posts, postId)) {
      case null {
        Debug.trap("Post not found");
      };
      case (?_) {
        switch (textMap.get(savesMap, postId)) {
          case (?saves) {
            savesMap := textMap.put(savesMap, postId, Array.filter(saves, func(s : SaveInteraction) : Bool { s.user != caller }));
          };
          case null {};
        };
      };
    };
  };

  public query ({ caller }) func getSavedPosts() : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view saved posts");
    };

    let buffer = Buffer.Buffer<Post>(0);
    for ((postId, saves) in textMap.entries(savesMap)) {
      let userSaved = Array.find(saves, func(s : SaveInteraction) : Bool { s.user == caller });
      switch (userSaved) {
        case (?_) {
          switch (textMap.get(posts, postId)) {
            case (?post) buffer.add(post);
            case null {};
          };
        };
        case null {};
      };
    };
    Buffer.toArray(buffer);
  };

  public shared ({ caller }) func forwardPostToConversation(postId : Text, conversationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can forward posts");
    };

    switch (textMap.get(posts, postId)) {
      case null {
        Debug.trap("Post not found");
      };
      case (?post) {
        switch (natMap.get(conversations, conversationId)) {
          case null {
            Debug.trap("Conversation not found");
          };
          case (?conv) {
            let isParticipant = Array.find(conv.participants, func(p : Principal) : Bool { p == caller });
            switch (isParticipant) {
              case null {
                Debug.trap("Unauthorized: Only conversation participants can forward posts to it");
              };
              case (?_) {
                let postDetails = {
                  postId = post.id;
                  author = post.author;
                  contentSnippet = if (post.content.size() > 50) {
                    Text.trim(post.content, #char ' ')
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
                
                await sendMessage(receiver, #forwardedPost(postDetails));
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func giftRosesOnPost(postId : Text, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can gift Roses on posts");
    };

    if (amount < 0.01) {
      Debug.trap("Minimum gift amount is 0.01 Rose");
    };

    switch (textMap.get(posts, postId)) {
      case null {
        Debug.trap("Post not found");
      };
      case (?post) {
        if (post.author == caller) {
          Debug.trap("Cannot gift Roses to your own post");
        };

        // Check blocking relationship
        if (hasBlockingRelationship(caller, post.author)) {
          Debug.trap("Cannot gift Roses: blocking relationship exists");
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

        switch (textMap.get(postRoseGiftsMap, postId)) {
          case (?gifts) {
            postRoseGiftsMap := textMap.put(postRoseGiftsMap, postId, Array.append(gifts, [gift]));
          };
          case null {
            postRoseGiftsMap := textMap.put(postRoseGiftsMap, postId, [gift]);
          };
        };
        
        // Send post gift notification to post author
        createPostGiftNotification(caller, post.author, postId, amount);
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
      Debug.trap("Unauthorized: Only authenticated users can view post interactions");
    };

    let likesCount = switch (textMap.get(likesMap, postId)) {
      case (?likes) likes.size();
      case null 0;
    };

    let commentsCount = switch (textMap.get(commentsMap, postId)) {
      case (?comments) comments.size();
      case null 0;
    };

    let savesCount = switch (textMap.get(savesMap, postId)) {
      case (?saves) saves.size();
      case null 0;
    };

    let forwardsCount = switch (textMap.get(forwardsMap, postId)) {
      case (?forwards) forwards.size();
      case null 0;
    };

    let (roseGiftsCount, totalRoses) = switch (textMap.get(postRoseGiftsMap, postId)) {
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

  public query ({ caller }) func getPosts() : async [Post] {
    // Require authentication to view posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view posts");
    };

    let buffer = Buffer.Buffer<Post>(0);
    for ((postId, post) in textMap.entries(posts)) {
      if (not hasBlockingRelationship(caller, post.author)) {
        buffer.add(post);
      };
    };
    Buffer.toArray(buffer);
  };

  public query ({ caller }) func getCallerPosts() : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their own posts");
    };

    let buffer = Buffer.Buffer<Post>(0);
    for ((__id, post) in textMap.entries(posts)) {
      if (post.author == caller) {
        buffer.add(post);
      };
    };
    Buffer.toArray(buffer);
  };

  public query ({ caller }) func getUserPosts(userId : Principal) : async [Post] {
    // Require authentication to view user posts
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view user posts");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, userId)) {
      Debug.trap("Cannot view posts: blocking relationship exists");
    };

    let buffer = Buffer.Buffer<Post>(0);
    for ((__id, post) in textMap.entries(posts)) {
      if (post.author == userId) {
        buffer.add(post);
      };
    };
    Buffer.toArray(buffer);
  };

  // Rose Currency System
  public type RoseTransactionType = {
    #gift;
    #buy;
    #sell;
    #transfer;
    #fee;
    #mint;
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
  var roseBalances = principalMap.empty<Float>();
  var totalCirculatingRoses : Float = 0.0;
  let totalRoseSupply : Float = 9_999_999.0;
  let adminUsername : Text = "rosalia";

  // Internal function for Rose gifting (used by both chat and post gifting)
  func giftRosesInternal(sender : Principal, receiver : Principal, amount : Float) : Float {
    let senderBalance = switch (principalMap.get(roseBalances, sender)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (senderBalance < amount) {
      Debug.trap("Insufficient balance to gift " # Float.toText(amount) # " Roses");
    };

    let fee = amount * 0.05;
    let amountAfterFee = amount - fee;

    let receiverBalance = switch (principalMap.get(roseBalances, receiver)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    roseBalances := principalMap.put(roseBalances, sender, senderBalance - amount);
    roseBalances := principalMap.put(roseBalances, receiver, receiverBalance + amountAfterFee);

    // Distribute fee among all holders
    if (totalCirculatingRoses > 0.0) {
      let buffer = Buffer.Buffer<(Principal, Float)>(0);
      for ((principal, balance) in principalMap.entries(roseBalances)) {
        buffer.add((principal, balance));
      };

      let holders = Buffer.toArray(buffer);

      for ((principal, balance) in holders.vals()) {
        if (balance > 0.0) {
          let share = (balance / totalCirculatingRoses) * fee;
          let current = switch (principalMap.get(roseBalances, principal)) {
            case null { 0.0 };
            case (?b) { b };
          };
          roseBalances := principalMap.put(roseBalances, principal, current + share);
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

    roseTransactions := Array.append(roseTransactions, [transaction]);
    nextRoseTransactionId += 1;

    fee;
  };

  public shared ({ caller }) func giftRoses(receiver : Principal, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can gift Roses");
    };

    if (amount < 0.01) {
      Debug.trap("Minimum gift amount is 0.01 Rose");
    };

    switch (principalMap.get(userProfiles, receiver)) {
      case null {
        Debug.trap("Receiver profile not found");
      };
      case (?_) {};
    };

    if (caller == receiver) {
      Debug.trap("Cannot gift Roses to yourself");
    };

    // Check blocking relationship
    if (hasBlockingRelationship(caller, receiver)) {
      Debug.trap("Cannot gift Roses: blocking relationship exists");
    };

    let fee = giftRosesInternal(caller, receiver, amount);

    let receipt = createReceiptMessage(caller, receiver, amount, fee, "GIFT");
    sendReceiptMessage(caller, receiver, receipt);
    
    // Send notification
    createRoseGiftNotification(caller, receiver, amount, nextRoseTransactionId - 1);
  };

  public shared ({ caller }) func claimAllRoses() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admin can claim all Roses");
    };

    if (not verifyAdminByUsername(caller)) {
      Debug.trap("Unauthorized: Only admin with username 'rosalia' can claim Roses");
    };

    let currentAdminBalance = switch (principalMap.get(roseBalances, caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (currentAdminBalance >= totalRoseSupply) {
      Debug.trap("Roses have already been claimed");
    };

    roseBalances := principalMap.put(roseBalances, caller, totalRoseSupply);
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

    roseTransactions := Array.append(roseTransactions, [transaction]);
    nextRoseTransactionId += 1;
  };

  public shared ({ caller }) func sellRosesToUser(buyer : Principal, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admin can sell Roses");
    };

    if (not verifyAdminByUsername(caller)) {
      Debug.trap("Unauthorized: Only admin with username 'rosalia' can sell Roses");
    };

    if (amount < 0.01) {
      Debug.trap("Minimum sell amount is 0.01 Rose");
    };

    switch (principalMap.get(userProfiles, buyer)) {
      case null {
        Debug.trap("Buyer profile not found");
      };
      case (?_) {};
    };

    let adminBalance = switch (principalMap.get(roseBalances, caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (adminBalance < amount) {
      Debug.trap("Admin does not have enough Roses to sell");
    };

    let buyerBalance = switch (principalMap.get(roseBalances, buyer)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    roseBalances := principalMap.put(roseBalances, caller, adminBalance - amount);
    roseBalances := principalMap.put(roseBalances, buyer, buyerBalance + amount);

    let transaction : RoseTransaction = {
      id = nextRoseTransactionId;
      sender = ?caller;
      receiver = ?buyer;
      amount;
      transactionType = #sell;
      timestamp = Time.now();
      feeDistributed = 0.0;
    };

    roseTransactions := Array.append(roseTransactions, [transaction]);
    nextRoseTransactionId += 1;
  };

  public shared ({ caller }) func buyRosesFromUser(seller : Principal, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admin can buy Roses");
    };

    if (not verifyAdminByUsername(caller)) {
      Debug.trap("Unauthorized: Only admin with username 'rosalia' can buy Roses");
    };

    if (amount < 0.01) {
      Debug.trap("Minimum buy amount is 0.01 Rose");
    };

    switch (principalMap.get(userProfiles, seller)) {
      case null {
        Debug.trap("Seller profile not found");
      };
      case (?_) {};
    };

    let sellerBalance = switch (principalMap.get(roseBalances, seller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (sellerBalance < amount) {
      Debug.trap("Seller does not have enough Roses to sell");
    };

    let adminBalance = switch (principalMap.get(roseBalances, caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    roseBalances := principalMap.put(roseBalances, seller, sellerBalance - amount);
    roseBalances := principalMap.put(roseBalances, caller, adminBalance + amount);

    let transaction : RoseTransaction = {
      id = nextRoseTransactionId;
      sender = ?seller;
      receiver = ?caller;
      amount;
      transactionType = #buy;
      timestamp = Time.now();
      feeDistributed = 0.0;
    };

    roseTransactions := Array.append(roseTransactions, [transaction]);
    nextRoseTransactionId += 1;
  };

  public shared ({ caller }) func requestBuyRoses(amount : Float) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can request to buy Roses");
    };

    if (amount < 0.01) {
      Debug.trap("Minimum purchase amount is 0.01 Rose");
    };

    switch (getAdminPrincipal(adminUsername)) {
      case null {
        Debug.trap("Admin 'rosalia' not found. Please contact customer support.");
      };
      case (?adminPrincipal) {
        let tradeRequest = createTradeRequestMessage(caller, amount, "BUY");
        sendTradeRequestMessage(caller, adminPrincipal, tradeRequest);

        "Buy request submitted for " # Float.toText(amount) # " Roses. A trade request message has been sent to admin 'rosalia'.";
      };
    };
  };

  public shared ({ caller }) func requestSellRoses(amount : Float) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can request to sell Roses");
    };

    if (amount < 0.01) {
      Debug.trap("Minimum sell amount is 0.01 Rose");
    };

    let userBalance = switch (principalMap.get(roseBalances, caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    if (userBalance < amount) {
      Debug.trap("Insufficient balance to sell " # Float.toText(amount) # " Roses");
    };

    switch (getAdminPrincipal(adminUsername)) {
      case null {
        Debug.trap("Admin 'rosalia' not found. Please contact customer support.");
      };
      case (?adminPrincipal) {
        let tradeRequest = createTradeRequestMessage(caller, amount, "SELL");
        sendTradeRequestMessage(caller, adminPrincipal, tradeRequest);

        "Sell request submitted for " # Float.toText(amount) # " Roses. A trade request message has been sent to admin 'rosalia'.";
      };
    };
  };

  public query ({ caller }) func getRoseBalance() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can check Rose balance");
    };

    switch (principalMap.get(roseBalances, caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };
  };

  public query ({ caller }) func getTotalCirculatingRoses() : async Float {
    // Require authentication to view total circulating Roses
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view total circulating Roses");
    };

    totalCirculatingRoses;
  };

  public query ({ caller }) func getRoseTransactionHistory() : async [RoseTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view transaction history");
    };

    Array.filter(
      roseTransactions,
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
      Debug.trap("Unauthorized: Only authenticated users can view user balances");
    };

    switch (principalMap.get(roseBalances, user)) {
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
      Debug.trap("Unauthorized: Only users can view summary");
    };

    let userBalance = switch (principalMap.get(roseBalances, caller)) {
      case null { 0.0 };
      case (?balance) { balance };
    };

    var feeRewards = 0.0;
    for (transaction in roseTransactions.vals()) {
      if (transaction.feeDistributed > 0.0) {
        switch (transaction.receiver) {
          case (?receiver) {
            if (receiver == caller) {
              let userBalanceAtTime = switch (principalMap.get(roseBalances, caller)) {
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view analytics");
    };

    // Additional verification for admin username
    if (not verifyAdminByUsername(caller)) {
      Debug.trap("Unauthorized: Only admin with username 'rosalia' can view analytics");
    };

    let totalUsers = principalMap.size(userProfiles);
    
    // Count active users (users with at least one post or message)
    var activeUsersSet = principalMap.empty<Bool>();
    for ((postId, post) in textMap.entries(posts)) {
      activeUsersSet := principalMap.put(activeUsersSet, post.author, true);
    };
    for ((convId, conv) in natMap.entries(conversations)) {
      for (msg in conv.messages.vals()) {
        activeUsersSet := principalMap.put(activeUsersSet, msg.sender, true);
      };
    };
    let activeUsers = principalMap.size(activeUsersSet);

    let totalPosts = textMap.size(posts);
    
    var totalMessages = 0;
    for ((convId, conv) in natMap.entries(conversations)) {
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

  public query ({ caller }) func getAllRoseTransactions() : async [RoseTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view all transactions");
    };

    // Additional verification for admin username
    if (not verifyAdminByUsername(caller)) {
      Debug.trap("Unauthorized: Only admin with username 'rosalia' can view all transactions");
    };

    roseTransactions;
  };

  public query ({ caller }) func getAllUserProfiles() : async [(Principal, UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view all user profiles");
    };

    // Additional verification for admin username
    if (not verifyAdminByUsername(caller)) {
      Debug.trap("Unauthorized: Only admin with username 'rosalia' can view all user profiles");
    };

    let buffer = Buffer.Buffer<(Principal, UserProfile)>(0);
    for ((principal, profile) in principalMap.entries(userProfiles)) {
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
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfig := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case null Debug.trap("Stripe needs to be first configured");
      case (?value) value;
    };
  };

  public shared func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create checkout sessions");
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
      Debug.trap("Unauthorized: Only users can fetch exchange rates");
    };

    let updateNeeded = shouldUpdateExchangeRate();

    if (not updateNeeded) {
      switch (icpUsdExchangeRate) {
        case (?rate) { return rate };
        case null {};
      };
    };

    let response = await OutCall.httpGetRequest("https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd", [], transform);
    let parsedRate : Float = 8.0;

    icpUsdExchangeRate := ?parsedRate;
    lastExchangeRateUpdate := ?Time.now();

    parsedRate;
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Blob Storage
  let storage = Storage.new();
  include MixinStorage(storage);

  // Profile Filtering
  public type ProfileFilter = {
    country : ?Text;
    minAge : ?Nat;
    maxAge : ?Nat;
    gender : ?Text;
    minBalance : ?Float;
  };

  public type ProfileWithPrincipal = {
    principal : Principal;
    profile : UserProfile;
    balance : Float;
  };

  public query ({ caller }) func filterProfiles(filter : ProfileFilter) : async [ProfileWithPrincipal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can filter profiles");
    };

    let currentYear = 2024;
    let buffer = Buffer.Buffer<ProfileWithPrincipal>(0);

    for ((principal, profile) in principalMap.entries(userProfiles)) {
      if (principal != caller) {
        // Filter out blocked users
        if (hasBlockingRelationship(caller, principal)) {
          // Skip this profile
        } else {
          let countryMatch = switch (filter.country) {
            case null { true };
            case (?country) { Text.contains(profile.country, #text country) };
          };

          let ageMatch = switch (filter.minAge, filter.maxAge, profile.birthYear) {
            case (null, null, _) { true };
            case (_, _, null) { true };
            case (min, max, ?birthYear) {
              let age = currentYear - birthYear;
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
                  Text.equal(Text.toLowercase(profileGender), Text.toLowercase(gender));
                };
              };
            };
          };

          let profileBalance = switch (principalMap.get(roseBalances, principal)) {
            case (?balance) { balance };
            case null { 0.0 };
          };

          let balanceMatch = switch (filter.minBalance) {
            case null { true };
            case (?minBalance) { profileBalance >= minBalance };
          };

          if (countryMatch and ageMatch and genderMatch and balanceMatch) {
            buffer.add({
              principal;
              profile;
              balance = profileBalance;
            });
          };
        };
      };
    };

    Buffer.toArray(buffer);
  };

  public shared ({ caller }) func convertBalanceToUsd(amount : Float) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can convert balances");
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
      Debug.trap("Unauthorized: Only users can convert balances");
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
      Debug.trap("Unauthorized: Only users can perform search");
    };

    if (searchTerm.size() == 0) {
      return [];
    };

    let lowerSearchTerm = Text.toLowercase(searchTerm);

    let max = switch (maxResults) {
      case (?m) { m };
      case null { 20 };
    };

    let userBuffer = Buffer.Buffer<SearchResult>(0);
    for ((principal, profile) in principalMap.entries(userProfiles)) {
      if (principal != caller) {
        // Filter out blocked users
        if (not hasBlockingRelationship(caller, principal)) {
          let nameMatch = Text.contains(Text.toLowercase(profile.name), #text lowerSearchTerm);
          let usernameMatch = Text.contains(Text.toLowercase(profile.username), #text lowerSearchTerm);

          if (nameMatch or usernameMatch) {
            let balance = switch (principalMap.get(roseBalances, principal)) {
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
    for ((conversationId, conversation) in natMap.entries(conversations)) {
      let isParticipant = Array.find(conversation.participants, func(p : Principal) : Bool { p == caller });
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

            let contentMatch = Text.contains(Text.toLowercase(contentSnippet), #text lowerSearchTerm);

            let senderUsernameMatch = switch (principalMap.get(userProfiles, message.sender)) {
              case (?profile) { Text.contains(Text.toLowercase(profile.username), #text lowerSearchTerm) };
              case null false;
            };

            let receiverUsernameMatch = switch (principalMap.get(userProfiles, message.receiver)) {
              case (?profile) { Text.contains(Text.toLowercase(profile.username), #text lowerSearchTerm) };
              case null false;
            };

            if (contentMatch or senderUsernameMatch or receiverUsernameMatch) {
              let snippet = if (contentSnippet.size() > 50) {
                Text.trim(contentSnippet, #char ' ')
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
    for ((postId, post) in textMap.entries(posts)) {
      // Filter out posts from blocked users
      if (not hasBlockingRelationship(caller, post.author)) {
        let contentMatch = Text.contains(Text.toLowercase(post.content), #text lowerSearchTerm);

        let authorUsernameMatch = switch (principalMap.get(userProfiles, post.author)) {
          case (?profile) { Text.contains(Text.toLowercase(profile.username), #text lowerSearchTerm) };
          case null false;
        };

        if (contentMatch or authorUsernameMatch) {
          let snippet = if (post.content.size() > 50) {
            Text.trim(post.content, #char ' ')
          } else {
            post.content
          };

          postBuffer.add(#postResult({
            postId;
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
    #groupMessage;
    #groupAdd;
  };

  var nextNotificationId = 0;
  var notificationsMap = principalMap.empty<[Notification]>();

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
    switch (principalMap.get(notificationsMap, notification.userId)) {
      case (?existingList) {
        notificationsMap := principalMap.put(notificationsMap, notification.userId, Array.append(existingList, [notification]));
      };
      case null {
        notificationsMap := principalMap.put(notificationsMap, notification.userId, [notification]);
      };
    };
    nextNotificationId += 1;
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can fetch notifications");
    };

    switch (principalMap.get(notificationsMap, caller)) {
      case (?notifs) { Array.sort(notifs, func(a : Notification, b : Notification) : { #less; #equal; #greater } { if (a.timestamp > b.timestamp) #less else if (a.timestamp < b.timestamp) #greater else #equal }) };
      case null { [] };
    };
  };

  public query ({ caller }) func getUnreadNotificationCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can fetch notification count");
    };

    switch (principalMap.get(notificationsMap, caller)) {
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
      Debug.trap("Unauthorized: Only users can mark notifications as read");
    };

    switch (principalMap.get(notificationsMap, caller)) {
      case (?notifs) {
        let updatedNotifs = Array.map(
          notifs,
          func(n : Notification) : Notification {
            if (n.id == notificationId) {
              { n with isRead = true };
            } else {
              n;
            };
          },
        );
        notificationsMap := principalMap.put(notificationsMap, caller, updatedNotifs);
      };
      case null {};
    };
  };

  public shared ({ caller }) func markAllNotificationsAsRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can mark all notifications as read");
    };

    switch (principalMap.get(notificationsMap, caller)) {
      case (?notifs) {
        let updatedNotifs = Array.map(notifs, func(n : Notification) : Notification { { n with isRead = true } });
        notificationsMap := principalMap.put(notificationsMap, caller, updatedNotifs);
      };
      case null {};
    };
  };

  public shared ({ caller }) func deleteNotification(notificationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete notifications");
    };

    switch (principalMap.get(notificationsMap, caller)) {
      case (?notifs) {
        let updatedNotifs = Array.filter(notifs, func(n : Notification) : Bool { n.id != notificationId });
        notificationsMap := principalMap.put(notificationsMap, caller, updatedNotifs);
      };
      case null {};
    };
  };

  public shared ({ caller }) func clearAllNotifications() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can clear all notifications");
    };

    notificationsMap := principalMap.delete(notificationsMap, caller);
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
    groupMessageCount : Nat;
    groupAddCount : Nat;
  };

  public query ({ caller }) func getNotificationCountByType() : async NotificationCount {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can fetch notification count");
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
    var groupMessageCount = 0;
    var groupAddCount = 0;

    switch (principalMap.get(notificationsMap, caller)) {
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
      groupMessageCount;
      groupAddCount;
    };
  };

  // Notification Helper Functions
  func createMessageNotification(sender : Principal, receiver : Principal, messageContent : Text, conversationId : Nat) {
    let preview = if (messageContent.size() > 30) {
      Text.trim(messageContent, #char ' ')
    } else {
      messageContent
    };

    let content = "New message from " # getUsername(sender) # ": " # preview;
    let notification = createNotification(receiver, #message, content, ?Nat.toText(conversationId), ?"conversation");
    addNotification(notification);
  };

  func getUsername(principal : Principal) : Text {
    switch (principalMap.get(userProfiles, principal)) {
      case (?profile) { profile.username };
      case null { "Unknown User" };
    };
  };

  func createRoseGiftNotification(sender : Principal, receiver : Principal, amount : Float, transactionId : Nat) {
    let senderUsername = getUsername(sender);
    let content = senderUsername # " sent you " # Float.toText(amount) # " ROSES!";
    let notification = createNotification(receiver, #roseGift, content, ?Nat.toText(transactionId), ?"transaction");
    addNotification(notification);
  };

  func createLikeNotification(liker : Principal, postAuthor : Principal, postId : Text, postContent : Text) {
    let likerUsername = getUsername(liker);
    let preview = if (postContent.size() > 30) {
      Text.trim(postContent, #char ' ')
    } else {
      postContent
    };

    let content = likerUsername # " liked your post: " # preview;
    let notification = createNotification(postAuthor, #like, content, ?postId, ?"post");
    addNotification(notification);
  };

  func createCommentNotification(commenter : Principal, postAuthor : Principal, postId : Text, comment : Text) {
    let commenterUsername = getUsername(commenter);
    let preview = if (comment.size() > 30) {
      Text.trim(comment, #char ' ')
    } else {
      comment
    };

    let content = commenterUsername # " commented: " # preview;
    let notification = createNotification(postAuthor, #comment, content, ?postId, ?"post");
    addNotification(notification);
  };

  func createFollowNotification(follower : Principal, followedUser : Principal) {
    let content = getUsername(follower) # " started following you";
    let notification = createNotification(followedUser, #follow, content, null, null);
    addNotification(notification);
  };

  func createTradeRequestNotification(requester : Principal, admin : Principal, amount : Float, requestType : Text) {
    let content = getUsername(requester) # " requested to " # requestType # " " # Float.toText(amount) # " ROSES.";
    let notification = createNotification(admin, #tradeRequest, content, null, null);
    addNotification(notification);
  };

  func createPostGiftNotification(gifter : Principal, postAuthor : Principal, postId : Text, amount : Float) {
    let gifterUsername = getUsername(gifter);
    let content = gifterUsername # " gifted " # Float.toText(amount) # " ROSES on your post!";
    let notification = createNotification(postAuthor, #postGift, content, ?postId, ?"post");
    addNotification(notification);
  };

  func createStoryViewNotification(viewer : Principal, storyAuthor : Principal, storyId : Nat) {
    let viewerUsername = getUsername(viewer);
    let content = viewerUsername # " viewed your story";
    let notification = createNotification(storyAuthor, #storyView, content, ?Nat.toText(storyId), ?"story");
    addNotification(notification);
  };

  func createGroupMessageNotification(sender : Principal, receiver : Principal, groupId : Nat, groupName : Text, messageContent : Text) {
    let preview = if (messageContent.size() > 30) {
      Text.trim(messageContent, #char ' ')
    } else {
      messageContent
    };

    let content = getUsername(sender) # " in " # groupName # ": " # preview;
    let notification = createNotification(receiver, #groupMessage, content, ?Nat.toText(groupId), ?"group");
    addNotification(notification);
  };

  func createGroupAddNotification(adder : Principal, addedUser : Principal, groupId : Nat, groupName : Text) {
    let content = getUsername(adder) # " added you to " # groupName;
    let notification = createNotification(addedUser, #groupAdd, content, ?Nat.toText(groupId), ?"group");
    addNotification(notification);
  };
};
