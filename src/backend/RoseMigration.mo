// RoseMigration.mo
// Explicit migration module for upgrading Post and Story stable variables.
// Handles the addition of embed (?Text) and viewCount (Nat) to Post,
// caption (?Text) and reactions ([(Text, [Principal])]) to Story.
import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Nat "mo:core/Nat";

module RoseMigration {
  // ── Shared primitive types ──────────────────────────────────────────────────
  type Time = Int;
  type ExternalBlob = Blob;

  // ── MessageType – must match actor definition exactly ──────────────────────
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

  // ── Old (V1) types ─────────────────────────────────────────────────────────
  public type PostV1 = {
    id : Text;
    author : Principal;
    content : Text;
    timestamp : Time;
    image : ?ExternalBlob;
  };

  public type StoryV1 = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time;
    expiresAt : Time;
    viewedBy : [Principal];
  };

  // ── New (V2) types ─────────────────────────────────────────────────────────
  public type Post = {
    id : Text;
    author : Principal;
    content : Text;
    timestamp : Time;
    image : ?ExternalBlob;
    embed : ?Text;
    viewCount : Nat;
  };

  // Story with viewCount only (V2 – no caption/reactions)
  public type StoryV2 = {
    id : Nat;
    author : Principal;
    content : MessageType;
    timestamp : Time;
    expiresAt : Time;
    viewedBy : [Principal];
    viewCount : Nat;
  };

  // Story with caption and reactions (V3 – current)
  public type Story = {
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

  // ── Migration function ─────────────────────────────────────────────────────
  // Input:  the OLD stable variables that are being replaced
  // Output: the NEW stable variables with migrated data

  // Migrate from StoryV1 (no viewCount) to Story (with caption/reactions)
  public func migrateStoryV1(old : StoryV1) : Story {
    {
      id = old.id;
      author = old.author;
      content = old.content;
      timestamp = old.timestamp;
      expiresAt = old.expiresAt;
      viewedBy = old.viewedBy;
      viewCount = 0;
      caption = null;
      reactions = [];
    }
  };

  // Migrate from StoryV2 (no caption/reactions) to Story
  public func migrateStoryV2(old : StoryV2) : Story {
    {
      id = old.id;
      author = old.author;
      content = old.content;
      timestamp = old.timestamp;
      expiresAt = old.expiresAt;
      viewedBy = old.viewedBy;
      viewCount = old.viewCount;
      caption = null;
      reactions = [];
    }
  };

  public func migration(
    old : {
      var posts : Map.Map<Text, PostV1>;
      var stories : Map.Map<Nat, StoryV1>;
    }
  ) : {
    var stablePostsV2 : [(Text, Post)];
    var stableStoriesV2 : [(Nat, Story)];
  } {
    // Migrate posts: add embed = null and viewCount = 0
    let migratedPosts = Array.map(
      old.posts.entries().toArray(),
      func kv : (Text, Post) {
        (kv.0, {
          id = kv.1.id;
          author = kv.1.author;
          content = kv.1.content;
          timestamp = kv.1.timestamp;
          image = kv.1.image;
          embed = null;
          viewCount = 0;
        })
      }
    );

    // Migrate stories: add viewCount = 0, caption = null, reactions = []
    let migratedStories = Array.map(
      old.stories.entries().toArray(),
      func kv : (Nat, Story) {
        (kv.0, migrateStoryV1(kv.1))
      }
    );

    {
      var stablePostsV2 = migratedPosts;
      var stableStoriesV2 = migratedStories;
    }
  };
}
