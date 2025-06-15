import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QrCode, Copy, Check } from "lucide-react";
import QRCode from "qrcode.react";
import { useToast } from "@/components/ui/use-toast";

interface HostQrDialogProps {
  conversationId: number | null;
}

const HostQrDialog: React.FC<HostQrDialogProps> = ({ conversationId }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const sessionLink = conversationId 
    ? `${window.location.origin}/join-session?id=${conversationId}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link copied!",
        description: "Session link has been copied to clipboard.",
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          <span className="hidden sm:inline">QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          {sessionLink && (
            <>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <QRCode value={sessionLink} size={200} />
              </div>
              
              <div className="flex items-center space-x-2 w-full">
                <div className="flex-1 p-2 bg-gray-50 rounded border text-sm font-mono truncate">
                  {sessionLink}
                </div>
                <Button 
                  onClick={handleCopyLink}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              
              <p className="text-sm text-gray-600 text-center">
                Participants can scan this QR code or use the link to join your session.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostQrDialog;
