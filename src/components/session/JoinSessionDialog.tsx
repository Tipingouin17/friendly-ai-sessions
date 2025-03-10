
import React, { useEffect, useState } from 'react';
import { QrCode, Copy, X } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface JoinSessionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  joinUrl: string;
  currentParticipantCount: number;
  maxParticipants: number;
}

const JoinSessionDialog = ({
  isOpen,
  setIsOpen,
  joinUrl,
  currentParticipantCount,
  maxParticipants
}: JoinSessionDialogProps) => {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (joinUrl) {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`);
    }
  }, [joinUrl]);

  const copyJoinLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      toast({
        title: "Link copied",
        description: "Session join link copied to clipboard",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="absolute top-4 right-14 z-10"
          onClick={() => setIsOpen(true)}
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Session</DialogTitle>
          <DialogDescription>
            Share this link or QR code to invite others
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          {joinUrl ? (
            <>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4">
                <img 
                  src={qrCodeUrl} 
                  alt="Session QR Code" 
                  className="w-48 h-48"
                />
              </div>
              <div className="flex w-full items-center mt-2 bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
                <input 
                  type="text" 
                  value={joinUrl} 
                  readOnly 
                  className="flex-1 bg-transparent border-none px-3 py-2 text-sm focus:outline-none"
                />
                <Button 
                  variant="ghost" 
                  className="h-full rounded-l-none border-l" 
                  onClick={copyJoinLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No session URL available
            </div>
          )}
          <p className="mt-4 text-sm text-gray-600 text-center">
            {currentParticipantCount} 
            {maxParticipants > 0 ? ` of ${maxParticipants}` : ''} participants
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinSessionDialog;
