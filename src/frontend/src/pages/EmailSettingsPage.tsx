import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Mail, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { EmailPreferences } from "../backend";
import LoginButton from "../components/LoginButton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerEmailPreferences,
  useSaveCallerEmailPreferences,
} from "../hooks/useQueries";

const DEFAULT_PREFS: EmailPreferences = {
  message: true,
  roseGift: true,
  like: true,
  comment: true,
  follow: true,
  tradeRequest: true,
  systemNotice: true,
  postGift: true,
  roseReceipt: true,
  storyView: false,
  storyReaction: true,
  groupMessage: true,
  groupAdd: true,
};

const NOTIFICATION_LABELS: {
  key: keyof EmailPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "message",
    label: "New messages",
    description: "When someone sends you a direct message",
  },
  {
    key: "groupMessage",
    label: "Group messages",
    description: "New messages in your group chats",
  },
  {
    key: "roseGift",
    label: "Rose gifts",
    description: "When someone gifts you Rose Credits",
  },
  {
    key: "roseReceipt",
    label: "Rose receipts",
    description: "Confirmation when you send or receive Roses",
  },
  {
    key: "like",
    label: "Likes on your posts",
    description: "When someone likes one of your posts",
  },
  {
    key: "comment",
    label: "Comments on your posts",
    description: "When someone comments on your posts",
  },
  {
    key: "postGift",
    label: "Post gifts",
    description: "When someone gifts roses on your post",
  },
  {
    key: "follow",
    label: "New followers",
    description: "When someone starts following you",
  },
  {
    key: "tradeRequest",
    label: "Trade requests",
    description: "Rose trading requests from other users",
  },
  {
    key: "groupAdd",
    label: "Added to group",
    description: "When you are added to a group chat",
  },
  {
    key: "storyView",
    label: "Story views",
    description: "When someone views your story",
  },
  {
    key: "storyReaction",
    label: "Story reactions",
    description: "When someone reacts to your story",
  },
  {
    key: "systemNotice",
    label: "System notices",
    description: "Important platform announcements and updates",
  },
];

function validateEmail(email: string): boolean {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function EmailSettingsPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: emailData, isLoading } = useGetCallerEmailPreferences();
  const savePrefs = useSaveCallerEmailPreferences();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailDirty, setEmailDirty] = useState(false);
  const [prefs, setPrefs] = useState<EmailPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    if (emailData) {
      setEmail(emailData.email ?? "");
      if (emailData.preferences) {
        setPrefs(emailData.preferences);
      }
    }
  }, [emailData]);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    try {
      await savePrefs.mutateAsync({
        email: email.trim() || null,
        preferences: prefs,
      });
      toast.success("Email settings saved!");
      setEmailDirty(false);
    } catch (err) {
      toast.error("Failed to save email settings");
      console.error(err);
    }
  };

  const handleToggle = async (key: keyof EmailPreferences, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await savePrefs.mutateAsync({
        email: email.trim() || null,
        preferences: updated,
      });
      toast.success("Preference updated");
    } catch (err) {
      setPrefs(prefs); // revert on failure
      toast.error("Failed to save preference");
      console.error(err);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailDirty(true);
    if (emailError) setEmailError("");
  };

  const handleEmailBlur = () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  if (!identity) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl text-rose-900 dark:text-rose-100">
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-sm text-rose-700 dark:text-rose-300">
              Please login to manage email settings
            </p>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-24">
      <div className="mb-4 sm:mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/profile" })}
          className="hover:bg-rose-100 dark:hover:bg-rose-900/20"
          data-ocid="email-settings.back_button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>
      </div>

      {/* Email Address Card */}
      <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800 shadow-lg mb-4 sm:mb-6">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-rose-400 to-pink-500">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl text-rose-900 dark:text-rose-100">
                Email Settings
              </CardTitle>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                Choose which notifications you'd like to receive by email
              </p>
            </div>
          </div>
        </CardHeader>

        {isLoading ? (
          <CardContent className="p-4 sm:p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-48" />
          </CardContent>
        ) : (
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSaveEmail} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-rose-900 dark:text-rose-100"
                >
                  Email Address
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    placeholder="your.email@example.com"
                    className="flex-1 text-base border-rose-300 focus:border-rose-500 dark:border-rose-700 bg-white/80 dark:bg-rose-950/20"
                    data-ocid="email-settings.email_input"
                  />
                  <Button
                    type="submit"
                    disabled={savePrefs.isPending || !emailDirty}
                    className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all shrink-0"
                    data-ocid="email-settings.save_email_button"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {savePrefs.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
                {emailError && (
                  <p
                    className="text-xs text-red-500"
                    data-ocid="email-settings.email_field_error"
                  >
                    {emailError}
                  </p>
                )}
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Your email is stored securely and never shared with other
                  users.
                </p>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Notification Toggles Card */}
      <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800 shadow-lg">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg text-rose-900 dark:text-rose-100">
            Notification Preferences
          </CardTitle>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            Toggle which events send you an email. Changes save automatically.
          </p>
        </CardHeader>

        {isLoading ? (
          <CardContent className="p-4 sm:p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        ) : (
          <CardContent
            className="p-4 sm:p-6 pt-2 sm:pt-3"
            data-ocid="email-settings.preferences_list"
          >
            <div className="space-y-1">
              {NOTIFICATION_LABELS.map(({ key, label, description }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 py-3 border-b border-rose-100 dark:border-rose-900/30 last:border-0"
                  data-ocid={`email-settings.pref.${key}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-rose-900 dark:text-rose-100 leading-tight">
                      {label}
                    </p>
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                      {description}
                    </p>
                  </div>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={(val) => handleToggle(key, val)}
                    disabled={savePrefs.isPending}
                    className="shrink-0 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-rose-500 data-[state=checked]:to-pink-500"
                    data-ocid={`email-settings.toggle.${key}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
