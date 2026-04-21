import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageIcon, Video, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob, type MessageType } from "../backend";
import { useCreateStory } from "../hooks/useQueries";
import { getVideoUploadWarning } from "../lib/videoUploadGuidance";

type StoryMode = "picker" | "image" | "video";

interface CreateStoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateStoryModal({
  open,
  onClose,
}: CreateStoryModalProps) {
  const createStory = useCreateStory();

  const [mode, setMode] = useState<StoryMode>("picker");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoWarning, setVideoWarning] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setMode("image");
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
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
      const content: MessageType = { __kind__: "image", image: externalBlob };
      await createStory.mutateAsync({
        content,
        caption: caption.trim() || null,
      });
      toast.success("Story created!");
      handleClose();
    } catch (_error) {
      toast.error("Failed to create story");
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
      const content: MessageType = { __kind__: "video", video: externalBlob };
      await createStory.mutateAsync({
        content,
        caption: caption.trim() || null,
      });
      toast.success("Story created!");
      handleClose();
    } catch (_error) {
      toast.error("Failed to create story");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        {mode === "picker" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground text-center">
              Choose how you'd like to create your story
            </p>

            {/* Image option */}
            <button
              type="button"
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group"
              onClick={() => imageInputRef.current?.click()}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Image Story</p>
                <p className="text-xs text-muted-foreground">
                  Share a photo from your device
                </p>
              </div>
            </button>

            {/* Video upload option */}
            <button
              type="button"
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group"
              onClick={() => videoInputRef.current?.click()}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Video Story</p>
                <p className="text-xs text-muted-foreground">
                  Upload a video from your device
                </p>
              </div>
            </button>

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
            />
          </div>
        )}

        {mode === "image" && imageFile && (
          <div className="space-y-4 py-2">
            {imagePreview && (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Story preview"
                  className="w-full max-h-72 object-cover"
                />
                {/* Caption overlay on preview */}
                {caption.trim() && (
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white text-sm font-medium text-center drop-shadow-sm line-clamp-2">
                      {caption}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    setMode("picker");
                  }}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            )}

            {/* Caption input */}
            <div className="relative">
              <input
                type="text"
                maxLength={120}
                placeholder="Add a caption… (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                data-ocid="story.caption_input"
              />
              {caption.length > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {caption.length}/120
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Stories expire after 72 hours
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setMode("picker");
                  setImageFile(null);
                  setImagePreview(null);
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitImage}
                disabled={createStory.isPending || submitting}
                className="flex-1"
                data-ocid="story.submit_button"
              >
                {createStory.isPending || submitting
                  ? "Sharing..."
                  : "Share Story"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === "video" && videoFile && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <Video className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm truncate flex-1">{videoFile.name}</span>
              <button
                type="button"
                className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/30 transition-colors shrink-0"
                onClick={() => {
                  setVideoFile(null);
                  setVideoWarning(null);
                  setMode("picker");
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {videoWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
                {videoWarning}
              </p>
            )}

            {/* Caption input */}
            <div className="relative">
              <input
                type="text"
                maxLength={120}
                placeholder="Add a caption… (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                data-ocid="story.caption_input"
              />
              {caption.length > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {caption.length}/120
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Stories expire after 72 hours
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setMode("picker");
                  setVideoFile(null);
                  setVideoWarning(null);
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitVideo}
                disabled={createStory.isPending || submitting}
                className="flex-1"
                data-ocid="story.submit_button"
              >
                {createStory.isPending || submitting
                  ? "Sharing..."
                  : "Share Story"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
