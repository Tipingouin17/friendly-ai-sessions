
import React, { useState } from 'react';
import { QrCode, Copy, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface SessionJoinInfoProps {
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants?: number;
  onSessionFull?: () => void;
}

const SessionJoinInfo = ({ 
  conversationId, 
  currentParticipantCount, 
  maxParticipants = 0,
  onSessionFull
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

  // Generate QR code with correct link
  const qrCodeSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`;

  // Check if session is full and trigger callback if needed
  React.useEffect(() => {
    if (maxParticipants > 0 && currentParticipantCount >= maxParticipants && onSessionFull) {
      onSessionFull();
    }
  }, [currentParticipantCount, maxParticipants, onSessionFull]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-start space-y-4 pt-4">
      {/* Display QR code with proper link */}
      <div className="flex flex-col items-center justify-center p-4">
        {conversationId && (
          <>
            <div className="mb-4">
              <img 
                src={qrCodeSrc}
                alt="QR Code to join session"
                className="w-40 h-40"
              />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-2">
                Scan this QR code to join the session or share the link:
              </p>
              {/* More compact link display with inline copy button */}
              <div className="flex items-center bg-gray-100 p-1 rounded max-w-full gap-1">
                <p className="text-xs text-gray-700 truncate flex-1 px-1">
                  {joinUrl}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 py-0 px-2"
                  onClick={handleCopyLink}
                >
                  {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      
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
