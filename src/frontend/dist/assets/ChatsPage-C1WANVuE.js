import { a as createLucideIcon, r as reactExports, j as jsxRuntimeExports, ak as Presence, $ as Primitive, Z as useControllableState, a0 as useComposedRefs, _ as composeEventHandlers, a6 as usePrevious, a4 as useSize, a5 as createContextScope, al as Check, c as cn, n as useInternetIdentity, am as useGetConversations, an as useCreateGroupChat, O as Dialog, Q as DialogContent, U as DialogHeader, V as DialogTitle, A as Avatar, k as AvatarImage, l as AvatarFallback, B as Button, ao as Camera, ae as Label, W as Input, a9 as ue, E as ExternalBlob, ap as useCreateStory, I as Image, aq as Video, X, ar as DialogFooter, as as getVideoUploadWarning, at as useGetActiveStories, au as useMarkStoryAsViewed, x as useNavigate, av as useGetPinnedStories, aw as Principal, w as useGetUserProfile, ax as getMimeType, ay as useReactToStory, az as useUnreactToStory, aA as useGetStoryReactions, aB as usePinStory, aC as useUnpinStory, aD as useGiftRosesOnStory, G as useGetRoseBalance, aE as Gift, aF as Bookmark, R as RoseGiftModal, aG as useGetGroupChats, aH as useSendMessage, aI as useSendGroupMessage, aJ as ScrollArea, aK as useGetUnreadCounts, aL as React, S as ShimmerSkeleton, C as ChevronDown, M as MessageCircle, aM as Users } from "./index-OIeMUJ41.js";
import { L as LazyImage } from "./LazyImage-86JFBcSQ.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$4 = [
  ["path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z", key: "169p4p" }],
  ["path", { d: "m9 10 2 2 4-4", key: "1gnqz4" }]
];
const BookmarkCheck = createLucideIcon("bookmark-check", __iconNode$4);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]];
const ChevronLeft = createLucideIcon("chevron-left", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]];
const ChevronRight = createLucideIcon("chevron-right", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
];
const Plus = createLucideIcon("plus", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["circle", { cx: "18", cy: "5", r: "3", key: "gq8acd" }],
  ["circle", { cx: "6", cy: "12", r: "3", key: "w7nqdw" }],
  ["circle", { cx: "18", cy: "19", r: "3", key: "1xt0gg" }],
  ["line", { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49", key: "47mynk" }],
  ["line", { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49", key: "1n3mei" }]
];
const Share2 = createLucideIcon("share-2", __iconNode);
var CHECKBOX_NAME = "Checkbox";
var [createCheckboxContext] = createContextScope(CHECKBOX_NAME);
var [CheckboxProviderImpl, useCheckboxContext] = createCheckboxContext(CHECKBOX_NAME);
function CheckboxProvider(props) {
  const {
    __scopeCheckbox,
    checked: checkedProp,
    children,
    defaultChecked,
    disabled,
    form,
    name,
    onCheckedChange,
    required,
    value = "on",
    // @ts-expect-error
    internal_do_not_use_render
  } = props;
  const [checked, setChecked] = useControllableState({
    prop: checkedProp,
    defaultProp: defaultChecked ?? false,
    onChange: onCheckedChange,
    caller: CHECKBOX_NAME
  });
  const [control, setControl] = reactExports.useState(null);
  const [bubbleInput, setBubbleInput] = reactExports.useState(null);
  const hasConsumerStoppedPropagationRef = reactExports.useRef(false);
  const isFormControl = control ? !!form || !!control.closest("form") : (
    // We set this to true by default so that events bubble to forms without JS (SSR)
    true
  );
  const context = {
    checked,
    disabled,
    setChecked,
    control,
    setControl,
    name,
    form,
    value,
    hasConsumerStoppedPropagationRef,
    required,
    defaultChecked: isIndeterminate(defaultChecked) ? false : defaultChecked,
    isFormControl,
    bubbleInput,
    setBubbleInput
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CheckboxProviderImpl,
    {
      scope: __scopeCheckbox,
      ...context,
      children: isFunction(internal_do_not_use_render) ? internal_do_not_use_render(context) : children
    }
  );
}
var TRIGGER_NAME = "CheckboxTrigger";
var CheckboxTrigger = reactExports.forwardRef(
  ({ __scopeCheckbox, onKeyDown, onClick, ...checkboxProps }, forwardedRef) => {
    const {
      control,
      value,
      disabled,
      checked,
      required,
      setControl,
      setChecked,
      hasConsumerStoppedPropagationRef,
      isFormControl,
      bubbleInput
    } = useCheckboxContext(TRIGGER_NAME, __scopeCheckbox);
    const composedRefs = useComposedRefs(forwardedRef, setControl);
    const initialCheckedStateRef = reactExports.useRef(checked);
    reactExports.useEffect(() => {
      const form = control == null ? void 0 : control.form;
      if (form) {
        const reset = () => setChecked(initialCheckedStateRef.current);
        form.addEventListener("reset", reset);
        return () => form.removeEventListener("reset", reset);
      }
    }, [control, setChecked]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        role: "checkbox",
        "aria-checked": isIndeterminate(checked) ? "mixed" : checked,
        "aria-required": required,
        "data-state": getState(checked),
        "data-disabled": disabled ? "" : void 0,
        disabled,
        value,
        ...checkboxProps,
        ref: composedRefs,
        onKeyDown: composeEventHandlers(onKeyDown, (event) => {
          if (event.key === "Enter") event.preventDefault();
        }),
        onClick: composeEventHandlers(onClick, (event) => {
          setChecked((prevChecked) => isIndeterminate(prevChecked) ? true : !prevChecked);
          if (bubbleInput && isFormControl) {
            hasConsumerStoppedPropagationRef.current = event.isPropagationStopped();
            if (!hasConsumerStoppedPropagationRef.current) event.stopPropagation();
          }
        })
      }
    );
  }
);
CheckboxTrigger.displayName = TRIGGER_NAME;
var Checkbox$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeCheckbox,
      name,
      checked,
      defaultChecked,
      required,
      disabled,
      value,
      onCheckedChange,
      form,
      ...checkboxProps
    } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      CheckboxProvider,
      {
        __scopeCheckbox,
        checked,
        defaultChecked,
        disabled,
        required,
        onCheckedChange,
        name,
        form,
        value,
        internal_do_not_use_render: ({ isFormControl }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            CheckboxTrigger,
            {
              ...checkboxProps,
              ref: forwardedRef,
              __scopeCheckbox
            }
          ),
          isFormControl && /* @__PURE__ */ jsxRuntimeExports.jsx(
            CheckboxBubbleInput,
            {
              __scopeCheckbox
            }
          )
        ] })
      }
    );
  }
);
Checkbox$1.displayName = CHECKBOX_NAME;
var INDICATOR_NAME = "CheckboxIndicator";
var CheckboxIndicator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeCheckbox, forceMount, ...indicatorProps } = props;
    const context = useCheckboxContext(INDICATOR_NAME, __scopeCheckbox);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Presence,
      {
        present: forceMount || isIndeterminate(context.checked) || context.checked === true,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.span,
          {
            "data-state": getState(context.checked),
            "data-disabled": context.disabled ? "" : void 0,
            ...indicatorProps,
            ref: forwardedRef,
            style: { pointerEvents: "none", ...props.style }
          }
        )
      }
    );
  }
);
CheckboxIndicator.displayName = INDICATOR_NAME;
var BUBBLE_INPUT_NAME = "CheckboxBubbleInput";
var CheckboxBubbleInput = reactExports.forwardRef(
  ({ __scopeCheckbox, ...props }, forwardedRef) => {
    const {
      control,
      hasConsumerStoppedPropagationRef,
      checked,
      defaultChecked,
      required,
      disabled,
      name,
      value,
      form,
      bubbleInput,
      setBubbleInput
    } = useCheckboxContext(BUBBLE_INPUT_NAME, __scopeCheckbox);
    const composedRefs = useComposedRefs(forwardedRef, setBubbleInput);
    const prevChecked = usePrevious(checked);
    const controlSize = useSize(control);
    reactExports.useEffect(() => {
      const input = bubbleInput;
      if (!input) return;
      const inputProto = window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(
        inputProto,
        "checked"
      );
      const setChecked = descriptor.set;
      const bubbles = !hasConsumerStoppedPropagationRef.current;
      if (prevChecked !== checked && setChecked) {
        const event = new Event("click", { bubbles });
        input.indeterminate = isIndeterminate(checked);
        setChecked.call(input, isIndeterminate(checked) ? false : checked);
        input.dispatchEvent(event);
      }
    }, [bubbleInput, prevChecked, checked, hasConsumerStoppedPropagationRef]);
    const defaultCheckedRef = reactExports.useRef(isIndeterminate(checked) ? false : checked);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.input,
      {
        type: "checkbox",
        "aria-hidden": true,
        defaultChecked: defaultChecked ?? defaultCheckedRef.current,
        required,
        disabled,
        name,
        value,
        form,
        ...props,
        tabIndex: -1,
        ref: composedRefs,
        style: {
          ...props.style,
          ...controlSize,
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          margin: 0,
          // We transform because the input is absolutely positioned but we have
          // rendered it **after** the button. This pulls it back to sit on top
          // of the button.
          transform: "translateX(-100%)"
        }
      }
    );
  }
);
CheckboxBubbleInput.displayName = BUBBLE_INPUT_NAME;
function isFunction(value) {
  return typeof value === "function";
}
function isIndeterminate(checked) {
  return checked === "indeterminate";
}
function getState(checked) {
  return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
}
function Checkbox({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Checkbox$1,
    {
      "data-slot": "checkbox",
      className: cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        CheckboxIndicator,
        {
          "data-slot": "checkbox-indicator",
          className: "flex items-center justify-center text-current transition-none",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3.5" })
        }
      )
    }
  );
}
function CreateGroupChatModal({
  open,
  onClose
}) {
  const [groupName, setGroupName] = reactExports.useState("");
  const [selectedParticipants, setSelectedParticipants] = reactExports.useState(
    []
  );
  const [avatarFile, setAvatarFile] = reactExports.useState(null);
  const [avatarPreview, setAvatarPreview] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const { identity } = useInternetIdentity();
  const { data: conversations, isLoading: conversationsLoading } = useGetConversations();
  const createGroup = useCreateGroupChat();
  const dmContacts = reactExports.useMemo(() => {
    if (!conversations || !identity) return [];
    const callerPrincipal = identity.getPrincipal().toString();
    const seen = /* @__PURE__ */ new Set();
    const contacts = [];
    for (const conv of conversations) {
      if (conv.participants.length !== 2) continue;
      const otherPrincipal = conv.participants.find(
        (p) => p.toString() !== callerPrincipal
      );
      if (!otherPrincipal) continue;
      const key = otherPrincipal.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      if (conv.otherParticipantProfile) {
        contacts.push({
          principal: otherPrincipal,
          profile: conv.otherParticipantProfile
        });
      }
    }
    return contacts;
  }, [conversations, identity]);
  const handleAvatarChange = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        ue.error("Please select an image file");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleToggleParticipant = (principal) => {
    setSelectedParticipants((prev) => {
      const exists = prev.find((p) => p.toString() === principal.toString());
      if (exists) {
        return prev.filter((p) => p.toString() !== principal.toString());
      }
      return [...prev, principal];
    });
  };
  const handleCreate = async () => {
    if (!groupName.trim()) {
      ue.error("Please enter a group name");
      return;
    }
    if (selectedParticipants.length === 0) {
      ue.error("Please select at least one participant");
      return;
    }
    try {
      let avatar = null;
      if (avatarFile) {
        const arrayBuffer = await avatarFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        avatar = ExternalBlob.fromBytes(uint8Array);
      }
      await createGroup.mutateAsync({
        name: groupName.trim(),
        participants: selectedParticipants,
        avatar
      });
      ue.success("Group chat created!");
      setGroupName("");
      setSelectedParticipants([]);
      setAvatarFile(null);
      setAvatarPreview(null);
      onClose();
    } catch (error) {
      ue.error("Failed to create group chat");
      console.error(error);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-md max-h-[80vh] overflow-y-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Create Group Chat" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "h-20 w-20", children: [
          avatarPreview ? /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: avatarPreview }) : /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: "/assets/generated/group-avatar-placeholder.dim_200x200.png" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { children: "GRP" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            accept: "image/*",
            onChange: handleAvatarChange,
            className: "hidden"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            onClick: () => {
              var _a;
              return (_a = fileInputRef.current) == null ? void 0 : _a.click();
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "h-4 w-4 mr-2" }),
              avatarPreview ? "Change" : "Add",
              " Group Photo"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "group-name", children: "Group Name *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            id: "group-name",
            value: groupName,
            onChange: (e) => setGroupName(e.target.value),
            placeholder: "Enter group name",
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Select Participants *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2", children: conversationsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground text-center py-4", children: "Loading contacts..." }) : dmContacts.length > 0 ? dmContacts.map((contact) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            className: "w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg cursor-pointer text-left",
            onClick: () => handleToggleParticipant(contact.principal),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Checkbox,
                {
                  checked: selectedParticipants.some(
                    (p) => p.toString() === contact.principal.toString()
                  ),
                  onCheckedChange: () => handleToggleParticipant(contact.principal)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "h-8 w-8", children: [
                contact.profile.profilePicture ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  AvatarImage,
                  {
                    src: contact.profile.profilePicture.getDirectURL()
                  }
                ) : null,
                /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: "text-xs", children: contact.profile.name.charAt(0).toUpperCase() })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium truncate", children: contact.profile.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground truncate", children: [
                  "@",
                  contact.profile.username
                ] })
              ] })
            ]
          },
          contact.principal.toString()
        )) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground text-center py-4", children: "No direct message contacts yet. Start a direct conversation first to add participants to a group." }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
          selectedParticipants.length,
          " participant(s) selected"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            onClick: handleCreate,
            disabled: createGroup.isPending || !groupName.trim() || selectedParticipants.length === 0,
            className: "flex-1",
            children: createGroup.isPending ? "Creating..." : "Create Group"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: onClose, className: "flex-1", children: "Cancel" })
      ] })
    ] })
  ] }) });
}
function CreateStoryModal({
  open,
  onClose
}) {
  const createStory = useCreateStory();
  const [mode, setMode] = reactExports.useState("picker");
  const [imageFile, setImageFile] = reactExports.useState(null);
  const [imagePreview, setImagePreview] = reactExports.useState(null);
  const [videoFile, setVideoFile] = reactExports.useState(null);
  const [videoWarning, setVideoWarning] = reactExports.useState(null);
  const [caption, setCaption] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const imageInputRef = reactExports.useRef(null);
  const videoInputRef = reactExports.useRef(null);
  const handleClose = () => {
    setMode("picker");
    setImageFile(null);
    setImagePreview(null);
    setVideoFile(null);
    setVideoWarning(null);
    setCaption("");
    setSubmitting(false);
    onClose();
  };
  const handleImageChange = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      ue.error("Please select an image file");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    setMode("image");
  };
  const handleVideoChange = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      ue.error("Please select a video file");
      return;
    }
    setVideoFile(file);
    const warning = getVideoUploadWarning(file);
    setVideoWarning(warning);
    setMode("video");
  };
  const handleSubmitImage = async () => {
    if (!imageFile || submitting) return;
    setSubmitting(true);
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const externalBlob = ExternalBlob.fromBytes(uint8Array);
      const content = { __kind__: "image", image: externalBlob };
      await createStory.mutateAsync({
        content,
        caption: caption.trim() || null
      });
      ue.success("Story created!");
      handleClose();
    } catch (_error) {
      ue.error("Failed to create story");
    } finally {
      setSubmitting(false);
    }
  };
  const handleSubmitVideo = async () => {
    if (!videoFile || submitting) return;
    setSubmitting(true);
    try {
      const arrayBuffer = await videoFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const externalBlob = ExternalBlob.fromBytes(uint8Array);
      const content = { __kind__: "video", video: externalBlob };
      await createStory.mutateAsync({
        content,
        caption: caption.trim() || null
      });
      ue.success("Story created!");
      handleClose();
    } catch (_error) {
      ue.error("Failed to create story");
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: handleClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Create Story" }) }),
    mode === "picker" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground text-center", children: "Choose how you'd like to create your story" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          className: "w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group",
          onClick: () => {
            var _a;
            return (_a = imageInputRef.current) == null ? void 0 : _a.click();
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "h-6 w-6 text-primary" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-sm", children: "Image Story" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Share a photo from your device" })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          className: "w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group",
          onClick: () => {
            var _a;
            return (_a = videoInputRef.current) == null ? void 0 : _a.click();
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { className: "h-6 w-6 text-primary" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-sm", children: "Video Story" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Upload a video from your device" })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: imageInputRef,
          type: "file",
          accept: "image/*",
          onChange: handleImageChange,
          className: "hidden"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: videoInputRef,
          type: "file",
          accept: "video/*",
          onChange: handleVideoChange,
          className: "hidden"
        }
      )
    ] }),
    mode === "image" && imageFile && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 py-2", children: [
      imagePreview && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative rounded-xl overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: imagePreview,
            alt: "Story preview",
            className: "w-full max-h-72 object-cover"
          }
        ),
        caption.trim() && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white text-sm font-medium text-center drop-shadow-sm line-clamp-2", children: caption }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors",
            onClick: () => {
              setImageFile(null);
              setImagePreview(null);
              setMode("picker");
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4 text-white" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            maxLength: 120,
            placeholder: "Add a caption… (optional)",
            value: caption,
            onChange: (e) => setCaption(e.target.value),
            className: "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40",
            "data-ocid": "story.caption_input"
          }
        ),
        caption.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground", children: [
          caption.length,
          "/120"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground text-center", children: "Stories expire after 72 hours" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2 sm:gap-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            onClick: () => {
              setMode("picker");
              setImageFile(null);
              setImagePreview(null);
            },
            children: "Back"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            onClick: handleSubmitImage,
            disabled: createStory.isPending || submitting,
            className: "flex-1",
            "data-ocid": "story.submit_button",
            children: createStory.isPending || submitting ? "Sharing..." : "Share Story"
          }
        )
      ] })
    ] }),
    mode === "video" && videoFile && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 bg-muted rounded-xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { className: "h-5 w-5 text-primary shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm truncate flex-1", children: videoFile.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/30 transition-colors shrink-0",
            onClick: () => {
              setVideoFile(null);
              setVideoWarning(null);
              setMode("picker");
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" })
          }
        )
      ] }),
      videoWarning && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg", children: videoWarning }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            maxLength: 120,
            placeholder: "Add a caption… (optional)",
            value: caption,
            onChange: (e) => setCaption(e.target.value),
            className: "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40",
            "data-ocid": "story.caption_input"
          }
        ),
        caption.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground", children: [
          caption.length,
          "/120"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground text-center", children: "Stories expire after 72 hours" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2 sm:gap-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            onClick: () => {
              setMode("picker");
              setVideoFile(null);
              setVideoWarning(null);
            },
            children: "Back"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            onClick: handleSubmitVideo,
            disabled: createStory.isPending || submitting,
            className: "flex-1",
            "data-ocid": "story.submit_button",
            children: createStory.isPending || submitting ? "Sharing..." : "Share Story"
          }
        )
      ] })
    ] })
  ] }) });
}
const REACTION_EMOJIS = ["❤️", "😍", "🌹", "😘", "💋", "🔥", "💯", "😂"];
function StoriesCarousel() {
  const { identity } = useInternetIdentity();
  const { data: stories } = useGetActiveStories();
  const markAsViewed = useMarkStoryAsViewed();
  const navigate = useNavigate();
  const callerPrincipal = (identity == null ? void 0 : identity.getPrincipal().toString()) ?? "";
  const [selectedStory, setSelectedStory] = reactExports.useState(null);
  const [currentIndex, setCurrentIndex] = reactExports.useState(0);
  const { data: ownPinnedStories } = useGetPinnedStories(
    callerPrincipal || null
  );
  const storiesByAuthor = (stories == null ? void 0 : stories.reduce(
    (acc, story) => {
      const authorId = story.author.toString();
      if (!acc[authorId]) {
        acc[authorId] = [];
      }
      acc[authorId].push(story);
      return acc;
    },
    {}
  )) || {};
  const authors = Object.keys(storiesByAuthor);
  const handleStoryClick = async (authorId) => {
    const authorStories = storiesByAuthor[authorId];
    if (authorStories && authorStories.length > 0) {
      setSelectedStory(authorStories[0]);
      setCurrentIndex(0);
      try {
        await markAsViewed.mutateAsync(authorStories[0].id);
      } catch (error) {
        console.error("Failed to mark story as viewed:", error);
      }
    }
  };
  const handleNext = async () => {
    if (!selectedStory) return;
    const authorStories = storiesByAuthor[selectedStory.author.toString()];
    if (currentIndex < authorStories.length - 1) {
      const nextStory = authorStories[currentIndex + 1];
      setSelectedStory(nextStory);
      setCurrentIndex(currentIndex + 1);
      try {
        await markAsViewed.mutateAsync(nextStory.id);
      } catch (error) {
        console.error("Failed to mark story as viewed:", error);
      }
    } else {
      const currentAuthorIndex = authors.indexOf(
        selectedStory.author.toString()
      );
      if (currentAuthorIndex < authors.length - 1) {
        const nextAuthorId = authors[currentAuthorIndex + 1];
        const nextAuthorStories = storiesByAuthor[nextAuthorId];
        setSelectedStory(nextAuthorStories[0]);
        setCurrentIndex(0);
        try {
          await markAsViewed.mutateAsync(nextAuthorStories[0].id);
        } catch (error) {
          console.error("Failed to mark story as viewed:", error);
        }
      } else {
        setSelectedStory(null);
      }
    }
  };
  const handlePrevious = () => {
    if (!selectedStory) return;
    const authorStories = storiesByAuthor[selectedStory.author.toString()];
    if (currentIndex > 0) {
      setSelectedStory(authorStories[currentIndex - 1]);
      setCurrentIndex(currentIndex - 1);
    } else {
      const currentAuthorIndex = authors.indexOf(
        selectedStory.author.toString()
      );
      if (currentAuthorIndex > 0) {
        const prevAuthorId = authors[currentAuthorIndex - 1];
        const prevAuthorStories = storiesByAuthor[prevAuthorId];
        setSelectedStory(prevAuthorStories[prevAuthorStories.length - 1]);
        setCurrentIndex(prevAuthorStories.length - 1);
      }
    }
  };
  const handleAvatarClick = (authorId) => {
    navigate({ to: `/users/${authorId}` });
  };
  const renderStoryContent = (story) => {
    if (story.content.__kind__ === "image") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        "img",
        {
          src: story.content.image.getDirectURL(),
          alt: "Story",
          className: "max-w-full max-h-[80vh] object-contain mx-auto"
        }
      );
    }
    if (story.content.__kind__ === "video") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        EnhancedVideoPlayer,
        {
          src: story.content.video.getDirectURL(),
          autoPlay: true
        }
      );
    }
    if (story.content.__kind__ === "media") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: story.content.media.getDirectURL(),
          target: "_blank",
          rel: "noopener noreferrer",
          className: "text-primary underline",
          children: "View Media"
        }
      ) });
    }
    return null;
  };
  if (!stories || stories.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 pb-2", children: authors.map((authorId) => {
      const authorStories = storiesByAuthor[authorId];
      const isOwn = (identity == null ? void 0 : identity.getPrincipal().toString()) === authorId;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        StoryThumbnail,
        {
          authorId,
          storyCount: authorStories.length,
          isOwn,
          onClick: () => handleStoryClick(authorId)
        },
        authorId
      );
    }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Dialog,
      {
        open: !!selectedStory,
        onOpenChange: () => setSelectedStory(null),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { className: "max-w-2xl p-0 bg-black/95", children: selectedStory && /* @__PURE__ */ jsxRuntimeExports.jsx(
          StoryViewer,
          {
            story: selectedStory,
            currentIndex,
            storiesByAuthor,
            authors,
            callerPrincipal,
            isPinned: (ownPinnedStories == null ? void 0 : ownPinnedStories.some((s) => s.id === selectedStory.id)) ?? false,
            onClose: () => setSelectedStory(null),
            onNext: handleNext,
            onPrevious: handlePrevious,
            onAvatarClick: handleAvatarClick,
            renderStoryContent
          }
        ) })
      }
    )
  ] });
}
function StoryViewer({
  story,
  currentIndex,
  storiesByAuthor,
  authors,
  callerPrincipal,
  isPinned,
  onClose,
  onNext,
  onPrevious,
  onAvatarClick,
  renderStoryContent
}) {
  const [showReactionBar, setShowReactionBar] = reactExports.useState(false);
  const isOwnStory = story.author.toString() === callerPrincipal;
  const handleContentTap = (e) => {
    const target = e.target;
    if (target.closest("button") || target.closest("a")) return;
    setShowReactionBar((prev) => !prev);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "ghost",
        size: "icon",
        className: "absolute top-2 right-2 z-40 text-white hover:bg-white/20",
        onClick: onClose,
        "aria-label": "Close story",
        "data-ocid": "story.close_button",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-5 w-5" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StoryHeader,
      {
        authorId: story.author.toString(),
        timestamp: story.timestamp,
        onAvatarClick
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "min-h-[400px] flex items-center justify-center p-12 cursor-pointer relative",
        onClick: handleContentTap,
        "data-ocid": "story.canvas_target",
        children: [
          renderStoryContent(story),
          story.caption && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-4 left-4 right-4 pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white text-sm font-medium drop-shadow leading-snug", children: story.caption }) }) })
        ]
      }
    ),
    showReactionBar && /* @__PURE__ */ jsxRuntimeExports.jsx(
      StoryReactionBar,
      {
        story,
        callerPrincipal,
        onClose: () => setShowReactionBar(false)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StoryReactionCounts, { storyId: story.id }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 flex items-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "ghost",
        size: "icon",
        className: "text-white hover:bg-white/20 ml-2",
        onClick: onPrevious,
        disabled: currentIndex === 0 && authors.indexOf(story.author.toString()) === 0,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "h-6 w-6" })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 right-0 flex items-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "ghost",
        size: "icon",
        className: "text-white hover:bg-white/20 mr-2",
        onClick: onNext,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-6 w-6" })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-4 left-0 right-0 flex justify-center gap-1 px-4", children: storiesByAuthor[story.author.toString()].map((_, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `h-1 flex-1 rounded-full ${idx === currentIndex ? "bg-white" : "bg-white/30"}`
      },
      idx
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StoryInteractions,
      {
        story,
        isOwnStory,
        isPinned
      }
    )
  ] });
}
function StoryReactionBar({
  story,
  callerPrincipal,
  onClose
}) {
  const reactToStory = useReactToStory();
  const unreactToStory = useUnreactToStory();
  const { data: reactions = [] } = useGetStoryReactions(story.id);
  const myReactions = new Set(
    reactions.filter(
      ([, principals]) => principals.some((p) => p.toString() === callerPrincipal)
    ).map(([emoji]) => emoji)
  );
  const handleReact = async (emoji) => {
    try {
      if (myReactions.has(emoji)) {
        await unreactToStory.mutateAsync({ storyId: story.id, emoji });
      } else {
        await reactToStory.mutateAsync({ storyId: story.id, emoji });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to react";
      ue.error(msg);
    }
    onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "absolute bottom-20 left-1/2 -translate-x-1/2 z-30",
      onClick: (e) => e.stopPropagation(),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 bg-black/80 backdrop-blur-md rounded-full px-3 py-2 shadow-xl border border-white/10", children: REACTION_EMOJIS.map((emoji) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: `text-xl h-9 w-9 flex items-center justify-center rounded-full transition-all duration-150 hover:scale-125 ${myReactions.has(emoji) ? "bg-rose-500/40 scale-110" : "hover:bg-white/10"}`,
          onClick: () => handleReact(emoji),
          "data-ocid": "story.reaction_button",
          title: emoji,
          children: emoji
        },
        emoji
      )) })
    }
  );
}
function StoryReactionCounts({ storyId }) {
  const { data: reactions = [] } = useGetStoryReactions(storyId);
  const totals = reactions.map(([emoji, principals]) => ({ emoji, count: principals.length })).filter(({ count }) => count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  if (totals.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative z-20 flex gap-1.5 justify-center py-1.5 flex-wrap px-4", children: totals.map(({ emoji, count }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-0.5",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: emoji }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white text-xs font-medium", children: count })
      ]
    },
    emoji
  )) });
}
function EnhancedVideoPlayer({
  src,
  autoPlay
}) {
  const videoRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    const source = document.createElement("source");
    source.src = src;
    source.type = getMimeType(src);
    video.appendChild(source);
    video.load();
    if (autoPlay) {
      video.play().catch((err) => {
        console.warn("Autoplay failed (user gesture required):", err);
      });
    }
  }, [src, autoPlay]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "video",
    {
      ref: videoRef,
      className: "story-video max-w-full max-h-[80vh] mx-auto block [&::-webkit-media-controls-timeline]:hidden [&::-webkit-media-controls-panel]:bg-transparent",
      controls: true,
      playsInline: true,
      muted: autoPlay,
      preload: "metadata",
      style: { WebkitAppearance: "none" }
    }
  );
}
function StoryThumbnail({
  authorId,
  storyCount,
  isOwn,
  onClick
}) {
  var _a;
  const authorPrincipal = Principal.fromText(authorId);
  const { data: profile } = useGetUserProfile(authorPrincipal);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col items-center gap-1 cursor-pointer shrink-0",
      onClick,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-0.5 rounded-full bg-gradient-to-tr from-rose-400 via-pink-500 to-rose-600", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "h-14 w-14 border-2 border-background", children: [
            (profile == null ? void 0 : profile.profilePicture) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              AvatarImage,
              {
                src: profile.profilePicture.getDirectURL(),
                alt: profile.name
              }
            ) : null,
            /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { children: ((_a = profile == null ? void 0 : profile.name) == null ? void 0 : _a.charAt(0).toUpperCase()) || authorId.slice(0, 2).toUpperCase() })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold", children: storyCount })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-center max-w-[60px] truncate", children: isOwn ? "You" : (profile == null ? void 0 : profile.username) || authorId.slice(0, 8) })
      ]
    }
  );
}
function StoryHeader({
  authorId,
  timestamp,
  onAvatarClick
}) {
  var _a;
  const authorPrincipal = Principal.fromText(authorId);
  const { data: profile } = useGetUserProfile(authorPrincipal);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-2 left-2 z-10 flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Avatar,
      {
        className: "h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity",
        onClick: () => onAvatarClick(authorId),
        children: [
          (profile == null ? void 0 : profile.profilePicture) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            AvatarImage,
            {
              src: profile.profilePicture.getDirectURL(),
              alt: profile.name
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: "text-xs", children: ((_a = profile == null ? void 0 : profile.name) == null ? void 0 : _a.charAt(0).toUpperCase()) || authorId.slice(0, 2).toUpperCase() })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-white", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          className: "text-sm font-semibold cursor-pointer hover:underline",
          onClick: () => onAvatarClick(authorId),
          children: (profile == null ? void 0 : profile.username) || `${authorId.slice(0, 12)}...`
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs opacity-80", children: new Date(Number(timestamp) / 1e6).toLocaleTimeString() })
    ] })
  ] });
}
function StoryInteractions({
  story,
  isOwnStory,
  isPinned
}) {
  const [showForward, setShowForward] = reactExports.useState(false);
  const [showGift, setShowGift] = reactExports.useState(false);
  const [pinPending, setPinPending] = reactExports.useState(false);
  const pinStory = usePinStory();
  const unpinStory = useUnpinStory();
  const giftRosesOnStory = useGiftRosesOnStory();
  const { data: roseBalance = 0 } = useGetRoseBalance();
  const { data: authorProfile } = useGetUserProfile(story.author);
  const handlePinToggle = async () => {
    if (pinPending) return;
    setPinPending(true);
    try {
      if (isPinned) {
        await unpinStory.mutateAsync(story.id);
        ue.success("Story removed from Highlights");
      } else {
        await pinStory.mutateAsync(story.id);
        ue.success("Story pinned to your Highlights");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update pin";
      ue.error(msg);
    } finally {
      setPinPending(false);
    }
  };
  const handleGift = async (amount) => {
    await giftRosesOnStory.mutateAsync({ storyId: story.id, amount });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-16 left-0 right-0 px-4 z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          className: "gap-2 text-white hover:bg-white/20",
          onClick: () => setShowForward(true),
          "data-ocid": "story.share_button",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { className: "h-5 w-5" })
        }
      ),
      !isOwnStory && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          className: "gap-2 text-white hover:bg-white/20",
          onClick: () => setShowGift(true),
          "data-ocid": "story.gift_button",
          title: "Gift Roses",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Gift, { className: "h-5 w-5 text-rose-300" })
        }
      ),
      isOwnStory && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "sm",
          className: `gap-2 text-white hover:bg-white/20 ${isPinned ? "text-rose-300" : ""}`,
          onClick: handlePinToggle,
          disabled: pinPending,
          "data-ocid": "story.pin_button",
          title: isPinned ? "Unpin from Highlights" : "Pin to Highlights",
          children: isPinned ? /* @__PURE__ */ jsxRuntimeExports.jsx(BookmarkCheck, { className: "h-5 w-5 fill-rose-400 text-rose-300" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, { className: "h-5 w-5" })
        }
      )
    ] }) }),
    showForward && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ForwardStoryModal,
      {
        open: showForward,
        onClose: () => setShowForward(false),
        story
      }
    ),
    showGift && /* @__PURE__ */ jsxRuntimeExports.jsx(
      RoseGiftModal,
      {
        open: showGift,
        onClose: () => setShowGift(false),
        onGift: handleGift,
        recipientName: (authorProfile == null ? void 0 : authorProfile.username) || (authorProfile == null ? void 0 : authorProfile.name) || story.author.toString().slice(0, 12),
        currentBalance: roseBalance
      }
    )
  ] });
}
function ForwardStoryModal({
  open,
  onClose,
  story
}) {
  const { identity } = useInternetIdentity();
  const { data: conversations } = useGetConversations();
  const { data: groups } = useGetGroupChats();
  const sendMessage = useSendMessage();
  const sendGroupMessage = useSendGroupMessage();
  const [selectedConversations, setSelectedConversations] = reactExports.useState(/* @__PURE__ */ new Set());
  const [selectedGroups, setSelectedGroups] = reactExports.useState(/* @__PURE__ */ new Set());
  const [isSending, setIsSending] = reactExports.useState(false);
  const handleForward = async () => {
    if (selectedConversations.size === 0 && selectedGroups.size === 0) {
      ue.error("Please select at least one conversation or group");
      return;
    }
    setIsSending(true);
    try {
      const ensureMobileCompatibleBlob = async (originalBlob) => {
        try {
          const bytes = await originalBlob.getBytes();
          return ExternalBlob.fromBytes(bytes);
        } catch (error) {
          console.error("Error processing blob:", error);
          return originalBlob;
        }
      };
      let forwardContent = story.content;
      if (story.content.__kind__ === "video") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.video
        );
        forwardContent = { __kind__: "video", video: mobileCompatibleBlob };
      } else if (story.content.__kind__ === "image") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.image
        );
        forwardContent = { __kind__: "image", image: mobileCompatibleBlob };
      } else if (story.content.__kind__ === "media") {
        const mobileCompatibleBlob = await ensureMobileCompatibleBlob(
          story.content.media
        );
        forwardContent = { __kind__: "media", media: mobileCompatibleBlob };
      }
      const callerPrincipal = identity == null ? void 0 : identity.getPrincipal().toString();
      for (const convId of selectedConversations) {
        const conv = conversations == null ? void 0 : conversations.find((c) => c.id === convId);
        if (conv) {
          const receiver = conv.participants.find(
            (p) => p.toString() !== callerPrincipal
          );
          if (receiver) {
            await sendMessage.mutateAsync({
              receiver,
              content: forwardContent
            });
          }
        }
      }
      for (const groupId of selectedGroups) {
        await sendGroupMessage.mutateAsync({
          groupId,
          content: forwardContent
        });
      }
      ue.success("Story forwarded successfully!");
      onClose();
    } catch (error) {
      ue.error(
        (error instanceof Error ? error.message : null) || "Failed to forward story"
      );
    } finally {
      setIsSending(false);
    }
  };
  const toggleConversation = (convId) => {
    setSelectedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  };
  const toggleGroup = (groupId) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { className: "max-w-md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold", children: "Forward Story" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, { className: "h-64", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 pr-4", children: [
      conversations && conversations.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-muted-foreground mb-2", children: "Direct Messages" }),
        conversations.map((conv) => {
          var _a, _b, _c, _d, _e;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer",
              onClick: () => toggleConversation(conv.id),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: selectedConversations.has(conv.id),
                    onCheckedChange: () => toggleConversation(conv.id)
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "h-8 w-8", children: [
                  ((_a = conv.otherParticipantProfile) == null ? void 0 : _a.profilePicture) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    AvatarImage,
                    {
                      src: conv.otherParticipantProfile.profilePicture.getDirectURL()
                    }
                  ) : null,
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: "text-xs", children: ((_c = (_b = conv.otherParticipantProfile) == null ? void 0 : _b.name) == null ? void 0 : _c.charAt(0).toUpperCase()) || "?" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: ((_d = conv.otherParticipantProfile) == null ? void 0 : _d.name) || ((_e = conv.otherParticipantProfile) == null ? void 0 : _e.username) || "Unknown" })
              ]
            },
            conv.id.toString()
          );
        })
      ] }),
      groups && groups.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-muted-foreground mb-2 mt-3", children: "Group Chats" }),
        groups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer",
            onClick: () => toggleGroup(group.id),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Checkbox,
                {
                  checked: selectedGroups.has(group.id),
                  onCheckedChange: () => toggleGroup(group.id)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "h-8 w-8", children: [
                group.avatar ? /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: group.avatar.getDirectURL() }) : null,
                /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: "text-xs", children: group.name.charAt(0).toUpperCase() })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: group.name })
            ]
          },
          group.id.toString()
        ))
      ] }),
      (!conversations || conversations.length === 0) && (!groups || groups.length === 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground text-center py-4", children: "No conversations or groups available" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: onClose, disabled: isSending, children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          onClick: handleForward,
          disabled: isSending || selectedConversations.size === 0 && selectedGroups.size === 0,
          children: isSending ? "Forwarding..." : "Forward"
        }
      )
    ] })
  ] }) }) });
}
const STORIES_PAGE_SIZE = 9;
const GROUPS_PAGE_SIZE = 9;
const CONVOS_PAGE_SIZE = 9;
function ChatsPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity == null ? void 0 : identity.getPrincipal().toString();
  const { data: conversations = [], isLoading: convsLoading } = useGetConversations();
  const { data: groupChats = [], isLoading: groupsLoading } = useGetGroupChats();
  const { data: activeStories = [], isLoading: storiesLoading } = useGetActiveStories();
  const { data: unreadCounts } = useGetUnreadCounts();
  const [showCreateStory, setShowCreateStory] = reactExports.useState(false);
  const [showCreateGroup, setShowCreateGroup] = reactExports.useState(false);
  const [visibleStoryAuthors, setVisibleStoryAuthors] = reactExports.useState(STORIES_PAGE_SIZE);
  const [visibleGroups, setVisibleGroups] = reactExports.useState(GROUPS_PAGE_SIZE);
  const [visibleConvos, setVisibleConvos] = reactExports.useState(CONVOS_PAGE_SIZE);
  const directUnreadMap = React.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const item of (unreadCounts == null ? void 0 : unreadCounts.direct) ?? []) {
      map.set(item.conversationId.toString(), Number(item.unreadCount));
    }
    return map;
  }, [unreadCounts]);
  const groupUnreadMap = React.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const item of (unreadCounts == null ? void 0 : unreadCounts.groups) ?? []) {
      map.set(item.groupId.toString(), Number(item.unreadCount));
    }
    return map;
  }, [unreadCounts]);
  const storiesByAuthor = React.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const story of activeStories) {
      const key = story.author.toString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(story);
    }
    return Array.from(map.keys());
  }, [activeStories]);
  const visibleStoryAuthorSet = React.useMemo(
    () => new Set(storiesByAuthor.slice(0, visibleStoryAuthors)),
    [storiesByAuthor, visibleStoryAuthors]
  );
  React.useMemo(
    () => activeStories.filter(
      (s) => visibleStoryAuthorSet.has(s.author.toString())
    ),
    [activeStories, visibleStoryAuthorSet]
  );
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
  const getLastMessage = (conv) => {
    const msgs = conv.messages || [];
    if (msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  };
  const getMessagePreview = (conv) => {
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
  const getDirectUnreadCount = (conv) => {
    const backendCount = directUnreadMap.get(conv.id.toString());
    if (backendCount !== void 0) return backendCount;
    const last = getLastMessage(conv);
    if (!last) return 0;
    return last.sender.toString() !== currentPrincipal ? 1 : 0;
  };
  const getGroupUnreadCount = (group) => {
    return groupUnreadMap.get(group.id.toString()) ?? 0;
  };
  const getAvatarUrl = (profile) => {
    if (profile == null ? void 0 : profile.profilePicture) return profile.profilePicture.getDirectURL();
    return "/assets/generated/avatar-placeholder.dim_200x200.png";
  };
  const getGroupAvatarUrl = (group) => {
    if (group.avatar) return group.avatar.getDirectURL();
    return "/assets/generated/group-avatar-placeholder.dim_200x200.png";
  };
  const formatTime = (timestamp) => {
    const date = new Date(Number(timestamp) / 1e6);
    const now = /* @__PURE__ */ new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 6e4) return "now";
    if (diff < 36e5) return `${Math.floor(diff / 6e4)}m`;
    if (diff < 864e5) return `${Math.floor(diff / 36e5)}h`;
    return `${Math.floor(diff / 864e5)}d`;
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background pb-24", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "pt-4 pb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold text-foreground", children: "Stories" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setShowCreateStory(true),
            className: "flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80 transition-opacity",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 14 }),
              "Add Story"
            ]
          }
        )
      ] }),
      storiesLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 px-4 overflow-x-auto pb-2", children: [...Array(4)].map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex-shrink-0 flex flex-col items-center gap-1",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "w-16 h-16 rounded-full" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "w-12 h-2 rounded" })
          ]
        },
        i
      )) }) : activeStories.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3 text-sm text-muted-foreground", children: "No active stories" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StoriesCarousel, {}),
        storiesByAuthor.length > visibleStoryAuthors && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center mt-2 px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "ghost",
            size: "sm",
            className: "text-primary text-xs gap-1",
            onClick: () => setVisibleStoryAuthors((v) => v + STORIES_PAGE_SIZE),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14 }),
              "View More Stories"
            ]
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-px bg-border mx-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "pt-4 pb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between px-4 mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-base font-semibold text-foreground flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { size: 16, className: "text-primary" }),
        "Messages"
      ] }) }),
      convsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 px-4", children: [...Array(4)].map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "w-12 h-12 rounded-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-3 w-1/2 rounded" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-2 w-3/4 rounded" })
        ] })
      ] }, i)) }) : sortedConversations.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3 text-sm text-muted-foreground", children: "No conversations yet" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 px-2", children: sortedConversations.slice(0, visibleConvos).map((conv) => {
          const lastMsg = getLastMessage(conv);
          const unreadCount = getDirectUnreadCount(conv);
          const hasUnread = unreadCount > 0;
          const profile = conv.otherParticipantProfile;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              "data-ocid": "chats.direct.item",
              onClick: () => navigate({
                to: "/chats/$conversationId",
                params: { conversationId: conv.id.toString() }
              }),
              className: "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-shrink-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    LazyImage,
                    {
                      src: getAvatarUrl(profile),
                      alt: (profile == null ? void 0 : profile.name) || "User",
                      className: "w-12 h-12 rounded-full object-cover border-2 border-primary/20",
                      wrapperClassName: "w-12 h-12 rounded-full"
                    }
                  ),
                  hasUnread && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1 border-2 border-background", children: unreadCount > 9 ? "9+" : unreadCount })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: `text-sm truncate ${hasUnread ? "font-bold text-foreground" : "font-medium text-foreground"}`,
                        children: (profile == null ? void 0 : profile.name) || "Unknown User"
                      }
                    ),
                    lastMsg && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground ml-2 flex-shrink-0", children: formatTime(lastMsg.timestamp) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: `text-xs truncate ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`,
                      children: getMessagePreview(conv)
                    }
                  )
                ] })
              ]
            },
            conv.id.toString()
          );
        }) }),
        sortedConversations.length > visibleConvos && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center mt-2 px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "ghost",
            size: "sm",
            className: "text-primary text-xs gap-1",
            onClick: () => setVisibleConvos((v) => v + CONVOS_PAGE_SIZE),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14 }),
              "View More Messages (",
              sortedConversations.length - visibleConvos,
              " remaining)"
            ]
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-px bg-border mx-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "pt-4 pb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-base font-semibold text-foreground flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 16, className: "text-primary" }),
          "Groups"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setShowCreateGroup(true),
            className: "flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80 transition-opacity",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 14 }),
              "New Group"
            ]
          }
        )
      ] }),
      groupsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 px-4", children: [...Array(3)].map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "w-12 h-12 rounded-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-3 w-1/2 rounded" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShimmerSkeleton, { className: "h-2 w-1/3 rounded" })
        ] })
      ] }, i)) }) : groupChats.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3 text-sm text-muted-foreground", children: "No group chats yet" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1 px-2", children: groupChats.slice(0, visibleGroups).map((group) => {
          const groupUnread = getGroupUnreadCount(group);
          const hasGroupUnread = groupUnread > 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              "data-ocid": "chats.group.item",
              onClick: () => navigate({
                to: "/groups/$groupId",
                params: { groupId: group.id.toString() }
              }),
              className: "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-shrink-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    LazyImage,
                    {
                      src: getGroupAvatarUrl(group),
                      alt: group.name,
                      className: "w-12 h-12 rounded-full object-cover border-2 border-primary/20",
                      wrapperClassName: "w-12 h-12 rounded-full"
                    }
                  ),
                  hasGroupUnread && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1 border-2 border-background", children: groupUnread > 9 ? "9+" : groupUnread })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: `text-sm truncate ${hasGroupUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`,
                        children: group.name
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground ml-2 flex-shrink-0", children: [
                      group.participants.length,
                      " members"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: `text-xs truncate ${hasGroupUnread ? "text-foreground font-medium" : "text-muted-foreground"}`,
                      children: group.admins.some(
                        (a) => a.toString() === currentPrincipal
                      ) ? "👑 Admin" : "👤 Member"
                    }
                  )
                ] })
              ]
            },
            group.id.toString()
          );
        }) }),
        groupChats.length > visibleGroups && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center mt-2 px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "ghost",
            size: "sm",
            className: "text-primary text-xs gap-1",
            onClick: () => setVisibleGroups((v) => v + GROUPS_PAGE_SIZE),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14 }),
              "View More Groups (",
              groupChats.length - visibleGroups,
              " ",
              "remaining)"
            ]
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateStoryModal,
      {
        open: showCreateStory,
        onClose: () => setShowCreateStory(false)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateGroupChatModal,
      {
        open: showCreateGroup,
        onClose: () => setShowCreateGroup(false)
      }
    )
  ] });
}
export {
  ChatsPage as default
};
