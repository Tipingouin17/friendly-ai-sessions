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
import { useToast } from "@/components/ui/use-toast";

interface AdminQrDialogProps {
  conversationId: number | null;
}

const AdminQrDialog: React.FC<AdminQrDialogProps> = ({
  conversationId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const { toast } = useToast();
  
  useEffect(() => {
    if (conversationId) {
      const baseUrl = window.location.origin;
      setJoinUrl(`${baseUrl}/join-session?id=${conversationId}`);
    }
  }, [conversationId]);

  const onCopyLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      toast({
        title: "Link copied",
        description: "Session join link copied to clipboard",
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
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`} 
                  alt="Session QR Code" 
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
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
                    onClick={onCopyLink}
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
