
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
import { QRCodeSVG } from "qrcode.react";
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 p-4">
          {sessionLink && (
            <>
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                <QRCodeSVG value={sessionLink} size={250} />
              </div>
              
              <div className="flex items-center space-x-2 w-full bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
                <div className="flex-1 p-3 text-sm font-mono truncate">
                  {sessionLink}
                </div>
                <Button 
                  onClick={handleCopyLink}
                  size="sm"
                  variant="ghost"
                  className="h-full rounded-l-none border-l flex items-center gap-1"
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
