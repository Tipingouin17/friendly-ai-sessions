
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

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    const start = url.substring(0, Math.floor(maxLength / 2) - 2);
    const end = url.substring(url.length - Math.floor(maxLength / 2) + 2);
    return `${start}...${end}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          <span className="hidden sm:inline">QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md mx-auto p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle>Session QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          {sessionLink && (
            <>
              <div className="w-full flex justify-center bg-white p-3 rounded-lg border">
                <QRCodeSVG value={sessionLink} size={200} className="w-48 h-48 sm:w-52 sm:h-52" />
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg border p-2 min-h-[40px]">
                  <span className="text-xs font-mono text-gray-700 flex-1 break-all leading-tight px-1">
                    {truncateUrl(sessionLink, 50)}
                  </span>
                  <Button 
                    onClick={handleCopyLink}
                    size="sm"
                    variant="ghost"
                    className="ml-2 h-8 w-8 p-0 flex-shrink-0 flex items-center justify-center"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
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
