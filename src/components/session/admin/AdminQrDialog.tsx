
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
      // Update to use the proper join-session path
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          {joinUrl && (
            <>
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(joinUrl)}`} 
                  alt="Session QR Code" 
                  className="w-[250px] h-[250px] object-contain"
                />
              </div>
              <div className="flex w-full items-center bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
                <input 
                  type="text" 
                  value={joinUrl} 
                  readOnly 
                  className="flex-1 bg-transparent border-none px-3 py-2 text-sm focus:outline-none"
                />
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-full rounded-l-none border-l" 
                  onClick={onCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
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
