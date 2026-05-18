import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { useGetCallerUserProfile } from "../hooks/useQueries";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ open, onClose }: QRCodeModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const { data: userProfile } = useGetCallerUserProfile();
  const profileIdentifier = userProfile?.username ?? "";

  useEffect(() => {
    if (open && profileIdentifier) {
      const profileLink = `${window.location.origin}/users/${encodeURIComponent(profileIdentifier)}`;
      const encodedData = encodeURIComponent(profileLink);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&color=e91e63&bgcolor=ffffff`;
      setQrCodeDataUrl(qrUrl);
    }
  }, [open, profileIdentifier]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rose-gradient-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            My QR Code
          </DialogTitle>
          <DialogDescription>Scan to view my profile</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Your QR Code"
                className="w-64 h-64 rounded-lg shadow-romantic"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
            )}
          </div>

          {userProfile && (
            <div className="text-center space-y-1">
              <p className="font-semibold text-lg">{userProfile.name}</p>
              <p className="text-sm text-muted-foreground">
                @{userProfile.username}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Scan to view my profile
              </p>
            </div>
          )}

          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
