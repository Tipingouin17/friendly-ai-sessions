
import React, { useState } from 'react';
import { QrCode, Copy, Check, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface SessionJoinInfoProps {
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants?: number;
}

const SessionJoinInfo = ({ 
  conversationId, 
  currentParticipantCount, 
  maxParticipants = 0 
}: SessionJoinInfoProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const baseUrl = window.location.origin;
  const joinUrl = `${baseUrl}/join-session?id=${conversationId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setIsCopied(true);
    
    toast({
      title: "Link Copied",
      description: "The join link has been copied to your clipboard",
    });
    
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start space-y-4 pt-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-1 w-full">
            <QrCode className="h-4 w-4" />
            <span>Join Code</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share join link</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            {conversationId && (
              <>
                <div className="mb-4">
                  <QrCode 
                    size={200}
                    className="w-40 h-40"
                    data-url={joinUrl}
                  />
                </div>
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500 mb-2">
                    Scan this QR code to join the session or share the link:
                  </p>
                  <p className="text-xs text-gray-700 bg-gray-100 p-2 rounded break-all">
                    {joinUrl}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={handleCopyLink}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="text-xs text-gray-500 flex flex-col items-center space-y-1">
        <div className="flex items-center">
          <Users className="h-3 w-3 mr-1" />
          <span>Participants</span>
        </div>
        <div className="font-medium">
          {currentParticipantCount} {maxParticipants > 0 ? `/ ${maxParticipants}` : ''}
        </div>
      </div>
    </div>
  );
};

export default SessionJoinInfo;
