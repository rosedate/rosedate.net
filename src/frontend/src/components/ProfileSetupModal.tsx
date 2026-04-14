import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { promptInstall } from "@/lib/pwa";
import { Download, Heart, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSaveCallerUserProfile } from "../hooks/useQueries";

type Step = "form" | "share";

interface ProfileSetupModalProps {
  onComplete?: () => void;
}

export default function ProfileSetupModal({
  onComplete,
}: ProfileSetupModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [bio, setBio] = useState("");
  const [copied, setCopied] = useState(false);

  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !username.trim() || !country.trim()) {
      toast.error(
        "Please fill in all required fields (name, username, and country)",
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      toast.error(
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

    let birthYearNum: bigint | undefined = undefined;
    if (birthYear.trim()) {
      const year = Number.parseInt(birthYear);
      const currentYear = new Date().getFullYear();
      if (Number.isNaN(year) || year < 1900 || year > currentYear - 18) {
        toast.error(
          "Please enter a valid birth year (must be at least 18 years old)",
        );
        return;
      }
      birthYearNum = BigInt(year);
    }

    try {
      await saveProfile.mutateAsync({
        name: name.trim(),
        username: username.trim(),
        country: country.trim(),
        gender: gender.trim() || undefined,
        birthYear: birthYearNum,
        bio: bio.trim() || undefined,
        profilePicture: undefined,
      });
      toast.success("Profile created successfully!");
      // Transition to share step instead of closing
      setStep("share");
    } catch (error) {
      toast.error("Failed to create profile");
      console.error(error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Rose Dating",
      text: "Join me on Rose Dating! 🌹",
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share — that's fine
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Could not copy link");
      }
    }
  };

  const handleAddToHomeScreen = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      toast.success("Rose Dating added to your home screen! 🌹");
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto card-romantic animate-slide-up"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Welcome! Let's set up your profile 💕
              </DialogTitle>
              <DialogDescription className="text-sm">
                Complete your profile to start connecting with others
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="text-base rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username *
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  required
                  className="text-base rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium">
                  Country *
                </Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Enter your country"
                  required
                  className="text-base rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
                />
              </div>

              <div className="border-t border-primary/10 pt-3 sm:pt-4">
                <p className="text-sm font-medium mb-3 text-muted-foreground">
                  Optional Information
                </p>

                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium">
                      Gender
                    </Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger
                        id="gender"
                        className="rounded-xl border-primary/20"
                      >
                        <SelectValue placeholder="Select gender (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Non-binary">Non-binary</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthYear" className="text-sm font-medium">
                      Birth Year
                    </Label>
                    <Input
                      id="birthYear"
                      type="number"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="e.g., 1990"
                      min="1900"
                      max={new Date().getFullYear() - 18}
                      className="text-base rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 18 years old
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-medium">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="text-base resize-none rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rose-gradient hover:shadow-rose-glow transition-all rounded-xl"
                disabled={saveProfile.isPending}
              >
                {saveProfile.isPending
                  ? "Creating Profile..."
                  : "Create Profile"}
              </Button>
            </form>
          </>
        ) : (
          /* Share & Install step */
          <div className="flex flex-col items-center text-center space-y-5 py-2">
            {/* Decorative rose glow header */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full rose-gradient flex items-center justify-center shadow-rose-glow">
                <Heart className="h-10 w-10 text-white fill-white" />
              </div>
              <span className="absolute -top-1 -right-1 text-2xl">🌹</span>
            </div>

            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl sm:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                You're all set! 🌹
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base leading-relaxed">
                Share Rose Dating with your friends and add it to your home
                screen for the best experience.
              </DialogDescription>
            </DialogHeader>

            <div className="w-full space-y-3 pt-1">
              {/* Share button */}
              <Button
                onClick={handleShare}
                className="w-full rose-gradient hover:shadow-rose-glow transition-all rounded-xl gap-2"
                data-ocid="share-app-btn"
              >
                <Share2 className="h-4 w-4" />
                {copied ? "Link Copied! ✓" : "Share App"}
              </Button>

              {/* Add to Home Screen */}
              <Button
                onClick={handleAddToHomeScreen}
                variant="outline"
                className="w-full rounded-xl border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all gap-2"
                data-ocid="add-to-homescreen-btn"
              >
                <Download className="h-4 w-4 text-primary" />
                Add to Home Screen
              </Button>

              {/* Skip */}
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="w-full rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="skip-share-btn"
              >
                Maybe Later
              </Button>
            </div>

            <p className="text-xs text-muted-foreground px-4">
              You can always install the app from your browser's menu later.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
