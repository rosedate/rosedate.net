import { a as createLucideIcon, r as reactExports, u as useGetPosts, b as useGetPostsFromFollowedUsers, d as useGetPinnedTrendingPost, e as useGetCallerUserProfile, j as jsxRuntimeExports, T as Tabs, f as TabsList, g as TabsTrigger, h as TabsContent, S as ShimmerSkeleton, i as useCreatePost, A as Avatar, k as AvatarImage, l as AvatarFallback, m as Textarea, X, I as Image, B as Button, L as LoaderCircle, n as useInternetIdentity, o as useDeletePost, p as usePinPostToTrending, q as useUnpinTrendingPost, s as useEditPost, P as Pin, t as PenLine, v as Trash2, C as ChevronDown, E as ExternalBlob, w as useGetUserProfile, x as useNavigate, y as useGetPostInteractions, z as useLikePost, D as useUnlikePost, F as useGiftRosesOnPost, G as useGetRoseBalance, H as Heart, M as MessageCircle, R as RoseGiftModal, J as useGetPostComments, K as useCommentOnPost, N as useDeleteComment, O as Dialog, Q as DialogContent, U as DialogHeader, V as DialogTitle, W as Input, Y as Send } from "./index-OIeMUJ41.js";
import { L as LazyImage } from "./LazyImage-86JFBcSQ.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "m18 16 4-4-4-4", key: "1inbqp" }],
  ["path", { d: "m6 8-4 4 4 4", key: "15zrgr" }],
  ["path", { d: "m14.5 4-5 16", key: "e7oirm" }]
];
const CodeXml = createLucideIcon("code-xml", __iconNode);
const PAGE_SIZE = 12;
const EMBED_PREFIX = "[embed:";
const EMBED_SUFFIX = "]";
function encodeEmbed(url) {
  return `${EMBED_PREFIX}${url}${EMBED_SUFFIX}`;
}
function parseEmbed(content) {
  const startIdx = content.indexOf(EMBED_PREFIX);
  if (startIdx === -1) return { text: content, embedUrl: null };
  const endIdx = content.indexOf(EMBED_SUFFIX, startIdx + EMBED_PREFIX.length);
  if (endIdx === -1) return { text: content, embedUrl: null };
  const embedUrl = content.slice(startIdx + EMBED_PREFIX.length, endIdx);
  const text = content.slice(0, startIdx).trim();
  return { text, embedUrl };
}
function extractEmbedSrcFromCode(embedCode) {
  const tiktokCiteMatch = embedCode.match(
    /cite=["'](https:\/\/www\.tiktok\.com\/@[^/]+\/video\/(\d+))[^"']*["']/i
  );
  if (tiktokCiteMatch) {
    const videoId = tiktokCiteMatch[2];
    return `https://www.tiktok.com/embed/v2/${videoId}`;
  }
  const twitterStatusMatch = embedCode.match(/twitter\.com\/[^/\s"']+\/status\/(\d+)/i) || embedCode.match(/x\.com\/[^/\s"']+\/status\/(\d+)/i);
  if (twitterStatusMatch) {
    const tweetId = twitterStatusMatch[1];
    return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=light&lang=en`;
  }
  const srcMatch = embedCode.match(/src=["']([^"']+)["']/i);
  if (srcMatch) return srcMatch[1];
  return null;
}
function detectEmbedType(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("youtube-nocookie.com"))
    return "youtube";
  if (url.includes("twitter.com") || url.includes("x.com") || url.includes("twttr.com") || url.includes("platform.twitter.com"))
    return "x";
  if (url.includes("tiktok.com")) return "tiktok";
  return "unknown";
}
function EmbedRenderer({ embedUrl }) {
  const type = detectEmbedType(embedUrl);
  if (type === "x") {
    let iframeSrc = null;
    let fallbackUrl = embedUrl;
    if (embedUrl.includes("platform.twitter.com/embed/Tweet.html")) {
      iframeSrc = embedUrl;
    } else {
      const tweetIdMatch = embedUrl.match(/twitter\.com\/[^/\s"']+\/status\/(\d+)/i) || embedUrl.match(/x\.com\/[^/\s"']+\/status\/(\d+)/i);
      if (tweetIdMatch) {
        iframeSrc = `https://platform.twitter.com/embed/Tweet.html?id=${tweetIdMatch[1]}&theme=light&lang=en`;
        fallbackUrl = embedUrl;
      }
    }
    if (iframeSrc) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "mt-2 mb-1 w-full",
          style: { borderRadius: "12px", overflow: "hidden" },
          "data-ocid": "post-embed-x",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "iframe",
            {
              src: iframeSrc,
              width: "100%",
              height: "500",
              style: { borderRadius: "12px", overflow: "hidden", border: "none" },
              scrolling: "no",
              allowFullScreen: true,
              loading: "lazy",
              title: "X (Twitter) post",
              sandbox: "allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"
            }
          )
        }
      );
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "a",
      {
        href: fallbackUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors mt-2 mb-1 group",
        "data-ocid": "post-embed-x",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "svg",
            {
              className: "w-4 h-4 text-white",
              viewBox: "0 0 24 24",
              fill: "currentColor",
              "aria-hidden": "true",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-foreground", children: "View on X (Twitter)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: fallbackUrl })
          ] })
        ]
      }
    );
  }
  const isTikTok = type === "tiktok";
  const height = isTikTok ? "700px" : "315px";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "mt-2 mb-1 rounded-xl overflow-hidden w-full",
      style: { height },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "iframe",
        {
          src: embedUrl,
          width: "100%",
          height,
          className: "rounded-xl border-0 w-full",
          allow: "autoplay; encrypted-media; fullscreen; picture-in-picture",
          allowFullScreen: true,
          loading: "lazy",
          title: "Embedded content",
          sandbox: "allow-scripts allow-same-origin allow-popups allow-presentation",
          "data-ocid": "post-embed-iframe"
        }
      )
    }
  );
}
function PostAuthorAvatar({ authorId }) {
  var _a, _b;
  const { data: profile } = useGetUserProfile(authorId);
  const navigate = useNavigate();
  const avatarUrl = (profile == null ? void 0 : profile.profilePicture) ? profile.profilePicture.getDirectURL() : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Avatar,
    {
      className: "w-9 h-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/60 transition-all",
      onClick: () => navigate({ to: "/users/$userId", params: { userId: authorId } }),
      children: [
        avatarUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: avatarUrl, alt: profile == null ? void 0 : profile.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: "bg-primary/10 text-primary text-xs font-semibold", children: ((_b = (_a = profile == null ? void 0 : profile.name) == null ? void 0 : _a.charAt(0)) == null ? void 0 : _b.toUpperCase()) ?? "?" })
      ]
    }
  );
}
function PostAuthorName({ authorId }) {
  const { data: profile } = useGetUserProfile(authorId);
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: "font-semibold text-sm text-foreground cursor-pointer hover:text-primary transition-colors",
      onClick: () => navigate({ to: "/users/$userId", params: { userId: authorId } }),
      children: (profile == null ? void 0 : profile.username) ?? (profile == null ? void 0 : profile.name) ?? "Unknown"
    }
  );
}
function CommentAuthorAvatar({ userId }) {
  var _a, _b;
  const { data: profile } = useGetUserProfile(userId);
  const navigate = useNavigate();
  const avatarUrl = (profile == null ? void 0 : profile.profilePicture) ? profile.profilePicture.getDirectURL() : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Avatar,
    {
      className: "w-7 h-7 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all",
      onClick: () => navigate({ to: "/users/$userId", params: { userId } }),
      children: [
        avatarUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: avatarUrl }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: "bg-primary/10 text-primary text-xs", children: ((_b = (_a = profile == null ? void 0 : profile.name) == null ? void 0 : _a.charAt(0)) == null ? void 0 : _b.toUpperCase()) ?? "?" })
      ]
    }
  );
}
function CommentAuthorName({ userId }) {
  const { data: profile } = useGetUserProfile(userId);
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: "font-semibold text-xs cursor-pointer hover:text-primary transition-colors",
      onClick: () => navigate({ to: "/users/$userId", params: { userId } }),
      children: (profile == null ? void 0 : profile.username) ?? (profile == null ? void 0 : profile.name) ?? "Unknown"
    }
  );
}
function PostInteractionsBar({
  post,
  onComment,
  isOwner
}) {
  const { data: interactions, isLoading } = useGetPostInteractions(post.id);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const giftRosesOnPost = useGiftRosesOnPost();
  const { data: roseBalance = 0 } = useGetRoseBalance();
  const { identity } = useInternetIdentity();
  const { data: authorProfile } = useGetUserProfile(post.author.toString());
  const [liked, setLiked] = reactExports.useState(false);
  const [giftOpen, setGiftOpen] = reactExports.useState(false);
  const handleLike = async () => {
    if (!identity) return;
    if (liked) {
      setLiked(false);
      await unlikePost.mutateAsync(post.id);
    } else {
      setLiked(true);
      await likePost.mutateAsync(post.id);
    }
  };
  const handleGift = async (amount) => {
    await giftRosesOnPost.mutateAsync({ postId: post.id, amount });
  };
  const recipientName = (authorProfile == null ? void 0 : authorProfile.username) ?? (authorProfile == null ? void 0 : authorProfile.name) ?? "this creator";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4 pt-2 border-t border-border/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: handleLike,
          className: `flex items-center gap-1.5 text-xs transition-colors ${liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`,
          "data-ocid": "post.like_button",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Heart, { className: `w-4 h-4 ${liked ? "fill-rose-500" : ""}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isLoading ? "…" : Number((interactions == null ? void 0 : interactions.likes) ?? 0) })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: onComment,
          className: "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors",
          "data-ocid": "post.comment_button",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isLoading ? "…" : Number((interactions == null ? void 0 : interactions.comments) ?? 0) })
          ]
        }
      ),
      !isOwner && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setGiftOpen(true),
          className: "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-500 transition-colors ml-auto",
          "data-ocid": "post.gift_button",
          title: "Gift Roses",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base leading-none", children: "🌹" }),
            Number((interactions == null ? void 0 : interactions.totalRosesGifted) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: Number((interactions == null ? void 0 : interactions.totalRosesGifted) ?? 0).toFixed(0) })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      RoseGiftModal,
      {
        open: giftOpen,
        onClose: () => setGiftOpen(false),
        onGift: handleGift,
        recipientName,
        currentBalance: roseBalance
      }
    )
  ] });
}
function CommentsModal({
  post,
  open,
  onClose
}) {
  const { data: comments, isLoading } = useGetPostComments(post.id);
  const commentOnPost = useCommentOnPost();
  const deleteComment = useDeleteComment();
  const { identity } = useInternetIdentity();
  const [text, setText] = reactExports.useState("");
  const handleSubmit = async () => {
    if (!text.trim() || commentOnPost.isPending) return;
    await commentOnPost.mutateAsync({
      postId: post.id,
      comment: text.trim(),
      parentCommentId: null
    });
    setText("");
  };
  const callerPrincipal = identity == null ? void 0 : identity.getPrincipal().toString();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (v) => !v && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-lg max-h-[80vh] flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Comments" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto space-y-3 pr-1", children: [
      isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-12 w-full rounded-lg" }, i)) }),
      !isLoading && (!comments || comments.length === 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-muted-foreground text-sm py-6", children: "No comments yet. Be the first!" }),
      comments == null ? void 0 : comments.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 items-start", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CommentAuthorAvatar, { userId: c.user.toString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 bg-muted/40 rounded-xl px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CommentAuthorName, { userId: c.user.toString() }),
            callerPrincipal === c.user.toString() && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => deleteComment.mutateAsync({
                  postId: post.id,
                  commentId: c.id
                }),
                className: "text-muted-foreground hover:text-destructive transition-colors",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm mt-0.5", children: c.comment })
        ] })
      ] }, String(c.id)))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-2 border-t border-border/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          value: text,
          onChange: (e) => setText(e.target.value),
          placeholder: "Write a comment…",
          className: "flex-1",
          onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && handleSubmit()
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "icon",
          onClick: handleSubmit,
          disabled: !text.trim() || commentOnPost.isPending,
          className: "bg-primary hover:bg-primary/90",
          children: commentOnPost.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "w-4 h-4" })
        }
      )
    ] })
  ] }) });
}
function PostCard({
  post,
  pinned = false,
  isAdmin = false
}) {
  const { identity } = useInternetIdentity();
  const deletePost = useDeletePost();
  const pinPost = usePinPostToTrending();
  const unpinPost = useUnpinTrendingPost();
  const [showComments, setShowComments] = reactExports.useState(false);
  const [editMode, setEditMode] = reactExports.useState(false);
  const [editContent, setEditContent] = reactExports.useState(post.content);
  const editPost = useEditPost();
  const callerPrincipal = identity == null ? void 0 : identity.getPrincipal().toString();
  const isOwner = callerPrincipal === post.author.toString();
  const imageUrl = post.image ? post.image.getDirectURL() : null;
  const { text: postText, embedUrl } = parseEmbed(post.content);
  const handleDelete = async () => {
    await deletePost.mutateAsync(post.id);
  };
  const handlePinPost = async () => {
    await pinPost.mutateAsync(post.id);
  };
  const handleUnpinPost = async () => {
    await unpinPost.mutateAsync();
  };
  const handleEdit = async () => {
    await editPost.mutateAsync({
      postId: post.id,
      content: editContent,
      image: post.image ?? null
    });
    setEditMode(false);
  };
  const formattedDate = new Date(
    Number(post.timestamp) / 1e6
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(PostAuthorAvatar, { authorId: post.author.toString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PostAuthorName, { authorId: post.author.toString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: formattedDate })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
        pinned && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Pin, { className: "w-3 h-3" }),
          " Pinned"
        ] }),
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: pinned ? handleUnpinPost : handlePinPost,
            disabled: pinPost.isPending || unpinPost.isPending,
            className: `p-1.5 rounded-lg transition-colors ${pinned ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`,
            title: pinned ? "Unpin post" : "Pin to top",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pin, { className: "w-3.5 h-3.5" })
          }
        ),
        isOwner && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setEditMode(!editMode),
              className: "p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { className: "w-3.5 h-3.5" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleDelete,
              disabled: deletePost.isPending,
              className: "p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              children: deletePost.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5" })
            }
          )
        ] })
      ] })
    ] }),
    editMode ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Textarea,
        {
          value: editContent,
          onChange: (e) => setEditContent(e.target.value),
          className: "min-h-[80px] resize-none"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            onClick: handleEdit,
            disabled: editPost.isPending,
            children: [
              editPost.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3 h-3 animate-spin mr-1" }) : null,
              "Save"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => setEditMode(false),
            children: "Cancel"
          }
        )
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      postText && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm leading-relaxed mb-3 whitespace-pre-wrap", children: postText }),
      embedUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(EmbedRenderer, { embedUrl })
    ] }),
    imageUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3 rounded-xl overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      LazyImage,
      {
        src: imageUrl,
        alt: "Post image",
        className: "w-full object-cover max-h-80",
        wrapperClassName: "rounded-xl overflow-hidden"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PostInteractionsBar,
      {
        post,
        onComment: () => setShowComments(true),
        isOwner
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CommentsModal,
      {
        post,
        open: showComments,
        onClose: () => setShowComments(false)
      }
    )
  ] });
}
function CreatePostForm() {
  var _a, _b;
  const [content, setContent] = reactExports.useState("");
  const [imageFile, setImageFile] = reactExports.useState(null);
  const [imagePreview, setImagePreview] = reactExports.useState(null);
  const [uploading, setUploading] = reactExports.useState(false);
  const [showEmbedInput, setShowEmbedInput] = reactExports.useState(false);
  const [embedCode, setEmbedCode] = reactExports.useState("");
  const [embedUrl, setEmbedUrl] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const createPost = useCreatePost();
  const { data: profile } = useGetCallerUserProfile();
  const handleEmbedCodeChange = (code) => {
    setEmbedCode(code);
    const extracted = extractEmbedSrcFromCode(code);
    setEmbedUrl(extracted);
  };
  const handleRemoveEmbed = () => {
    setEmbedCode("");
    setEmbedUrl(null);
    setShowEmbedInput(false);
  };
  const handleImageSelect = (e) => {
    var _a2;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      var _a3;
      return setImagePreview((_a3 = ev.target) == null ? void 0 : _a3.result);
    };
    reader.readAsDataURL(file);
  };
  const handleSubmit = async () => {
    const hasContent = content.trim() || imageFile || embedUrl;
    if (!hasContent) return;
    setUploading(true);
    try {
      let imageBlob = null;
      if (imageFile) {
        const bytes = new Uint8Array(await imageFile.arrayBuffer());
        imageBlob = ExternalBlob.fromBytes(bytes);
      }
      const finalContent = embedUrl ? `${content.trim()}${content.trim() ? "\n" : ""}${encodeEmbed(embedUrl)}` : content.trim();
      await createPost.mutateAsync({
        content: finalContent,
        image: imageBlob
      });
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setEmbedCode("");
      setEmbedUrl(null);
      setShowEmbedInput(false);
    } finally {
      setUploading(false);
    }
  };
  const avatarUrl = (profile == null ? void 0 : profile.profilePicture) ? profile.profilePicture.getDirectURL() : null;
  const embedType = embedUrl ? detectEmbedType(embedUrl) : null;
  const embedTypeLabel = embedType === "youtube" ? "YouTube" : embedType === "x" ? "X (Twitter)" : embedType === "tiktok" ? "TikTok" : embedUrl ? "Embed" : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card border border-border/50 rounded-2xl p-4 shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "w-9 h-9 ring-2 ring-primary/20", children: [
      avatarUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: avatarUrl }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: "bg-primary/10 text-primary text-xs font-semibold", children: ((_b = (_a = profile == null ? void 0 : profile.name) == null ? void 0 : _a.charAt(0)) == null ? void 0 : _b.toUpperCase()) ?? "?" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Textarea,
        {
          value: content,
          onChange: (e) => setContent(e.target.value),
          placeholder: "Share something with the community…",
          className: "min-h-[80px] resize-none border-border/50 focus:border-primary/50"
        }
      ),
      showEmbedInput && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 p-3 bg-muted/40 rounded-xl border border-border/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-foreground", children: "Paste YouTube, X, or TikTok embed code" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: handleRemoveEmbed,
              className: "text-muted-foreground hover:text-destructive transition-colors",
              "aria-label": "Remove embed",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3.5 h-3.5" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Textarea,
          {
            value: embedCode,
            onChange: (e) => handleEmbedCodeChange(e.target.value),
            placeholder: 'Paste embed code here, e.g. <iframe src="...">',
            className: "min-h-[70px] resize-none text-xs font-mono border-border/50",
            "data-ocid": "embed-code-input"
          }
        ),
        embedUrl && embedTypeLabel && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-1.5 h-1.5 rounded-full bg-green-500" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            embedTypeLabel,
            " embed detected"
          ] })
        ] }),
        embedCode && !embedUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: "Could not extract embed URL. Make sure you paste the full embed code." })
      ] }),
      imagePreview && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative inline-block", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: imagePreview,
            alt: "Preview",
            className: "max-h-40 rounded-xl object-cover"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              setImageFile(null);
              setImagePreview(null);
            },
            className: "absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3 h-3" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                var _a2;
                return (_a2 = fileInputRef.current) == null ? void 0 : _a2.click();
              },
              className: "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Photo" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setShowEmbedInput((v) => !v),
              className: `flex items-center gap-1.5 text-xs transition-colors ${showEmbedInput ? "text-primary" : "text-muted-foreground hover:text-primary"}`,
              "data-ocid": "embed-toggle-btn",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CodeXml, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Embed" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            accept: "image/*",
            className: "hidden",
            onChange: handleImageSelect
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            onClick: handleSubmit,
            disabled: !content.trim() && !imageFile && !embedUrl || uploading || createPost.isPending,
            className: "bg-primary hover:bg-primary/90",
            children: [
              uploading || createPost.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-3 h-3 animate-spin mr-1" }) : null,
              "Post"
            ]
          }
        )
      ] })
    ] })
  ] }) });
}
function ViewMoreButton({
  visible,
  total,
  onViewMore
}) {
  if (visible >= total) return null;
  const remaining = total - visible;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col items-center gap-1 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Button,
    {
      variant: "outline",
      onClick: onViewMore,
      className: "gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/60 transition-all",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-4 h-4" }),
        "View More",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground ml-1", children: [
          "(",
          remaining,
          " remaining)"
        ] })
      ]
    }
  ) });
}
function PostsPage() {
  const [activeTab, setActiveTab] = reactExports.useState("all");
  const [allVisible, setAllVisible] = reactExports.useState(PAGE_SIZE);
  const [followedVisible, setFollowedVisible] = reactExports.useState(PAGE_SIZE);
  reactExports.useEffect(() => {
    if (activeTab === "all") setAllVisible(PAGE_SIZE);
    else if (activeTab === "followed") setFollowedVisible(PAGE_SIZE);
  }, [activeTab]);
  const { data: allPosts, isLoading: allLoading } = useGetPosts();
  const { data: followedPosts, isLoading: followedLoading } = useGetPostsFromFollowedUsers();
  const { data: pinnedPost } = useGetPinnedTrendingPost();
  const { data: callerProfile } = useGetCallerUserProfile();
  const isAdmin = (callerProfile == null ? void 0 : callerProfile.username) === "rosalia";
  const sortedAllPosts = [...allPosts ?? []].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp)
  );
  const sortedFollowedPosts = [...followedPosts ?? []].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp)
  );
  const visibleAllPosts = sortedAllPosts.slice(0, allVisible);
  const visibleFollowedPosts = sortedFollowedPosts.slice(0, followedVisible);
  const renderSkeletons = () => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "bg-card border border-border/50 rounded-2xl p-4 space-y-3 animate-fade-in",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "w-9 h-9 rounded-full" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-3 w-24 rounded" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-2.5 w-16 rounded" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-16 w-full rounded-xl" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-8 w-full rounded-xl" })
      ]
    },
    i
  )) });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-background pb-24", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl mx-auto px-4 py-6 space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-foreground", children: "Posts" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CreatePostForm, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "w-full grid grid-cols-2 bg-muted/50 rounded-xl p-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "all", className: "rounded-lg text-xs font-medium", children: "New" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TabsTrigger,
          {
            value: "followed",
            className: "rounded-lg text-xs font-medium",
            children: "Following"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "all", className: "mt-4 space-y-4", children: allLoading ? renderSkeletons() : sortedAllPosts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-12 text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: "No posts yet. Be the first to share!" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        pinnedPost && /* @__PURE__ */ jsxRuntimeExports.jsx(
          PostCard,
          {
            post: pinnedPost,
            pinned: true,
            isAdmin
          },
          `pinned-${pinnedPost.id}`
        ),
        visibleAllPosts.filter((p) => p.id !== (pinnedPost == null ? void 0 : pinnedPost.id)).map((post) => /* @__PURE__ */ jsxRuntimeExports.jsx(PostCard, { post, isAdmin }, post.id)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ViewMoreButton,
          {
            visible: allVisible,
            total: sortedAllPosts.length,
            onViewMore: () => setAllVisible((v) => v + PAGE_SIZE)
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "followed", className: "mt-4 space-y-4", children: followedLoading ? renderSkeletons() : sortedFollowedPosts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: "No posts from people you follow yet." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-1", children: "Follow users to see their posts here." })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        visibleFollowedPosts.map((post) => /* @__PURE__ */ jsxRuntimeExports.jsx(PostCard, { post }, post.id)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ViewMoreButton,
          {
            visible: followedVisible,
            total: sortedFollowedPosts.length,
            onViewMore: () => setFollowedVisible((v) => v + PAGE_SIZE)
          }
        )
      ] }) })
    ] })
  ] }) });
}
export {
  PostsPage as default
};
