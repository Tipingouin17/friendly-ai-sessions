/**
 * Admin Qr Dialog
 *
 * Session component for the AIfacilitator application.
 */

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/components/ui/use-toast";

interface AdminQrDialogProps {
  conversationId: number | null;
  joinToken?: string | null;
}

const AdminQrDialog: React.FC<AdminQrDialogProps> = ({
  conversationId,
  joinToken
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const { toast } = useToast();
  
  useEffect(() => {
    if (conversationId) {
      const baseUrl = window.location.origin;
      const url = joinToken
        ? `${baseUrl}/join-session?id=${conversationId}&token=${encodeURIComponent(joinToken)}`
        : `${baseUrl}/join-session?id=${conversationId}`;
      setJoinUrl(url);
    }
  }, [conversationId, joinToken]);

  const onCopyLink = async () => {
    if (!joinUrl) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinUrl);
      } else {
        const fallbackInput = document.createElement('textarea');
        fallbackInput.value = joinUrl;
        fallbackInput.setAttribute('readonly', '');
        fallbackInput.style.position = 'fixed';
        fallbackInput.style.opacity = '0';
        document.body.appendChild(fallbackInput);
        fallbackInput.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(fallbackInput);
        if (!copied) throw new Error('Clipboard fallback was rejected');
      }
      toast({
        title: "Link copied",
        description: "Session join link copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy the link. Please copy it manually.",
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

  // Don't render the dialog at all if no conversation ID
  if (!conversationId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <QrCode className="h-4 w-4" />
          <span>QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md mx-auto p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle>Session QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          {joinUrl && (
            <>
              <div className="w-full flex justify-center bg-white p-3 rounded-lg border">
                <QRCodeSVG
                  value={joinUrl}
                  title="Session QR Code"
                  size={208}
                  level="M"
                  includeMargin
                  className="h-48 w-48 sm:h-52 sm:w-52"
                />
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg border p-2 min-h-[40px]">
                  <span className="text-xs font-mono text-gray-700 flex-1 break-all leading-tight px-1">
                    {truncateUrl(joinUrl, 50)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="ml-2 h-8 w-8 p-0 flex-shrink-0" 
                    onClick={() => { void onCopyLink(); }}
                    aria-label="Copy session join link"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
          <div className="text-sm text-gray-600 text-center">
            <p>Share this QR code or link with participants to join the session</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminQrDialog;
