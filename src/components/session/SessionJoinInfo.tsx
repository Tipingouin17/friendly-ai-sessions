
import React, { useEffect, useState } from 'react';
import { QrCode, Share2, Copy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { buildJoinUrl } from '@/utils/joinUrl';

interface SessionJoinInfoProps {
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants: number;
  onSessionFull?: () => void;
  isAdmin?: boolean;
  /** UUID join token from the conversations table — required for secure join URLs */
  joinToken?: string | null;
}

const SessionJoinInfo = ({ 
  conversationId, 
  currentParticipantCount = 0, 
  maxParticipants = 0,
  onSessionFull,
  isAdmin = false,
  joinToken
}: SessionJoinInfoProps) => {
  const { toast } = useToast();
  const [displayParticipantCount, setDisplayParticipantCount] = useState(currentParticipantCount);
  
  // Update from props when they change - no realtime subscription here
  useEffect(() => {
    setDisplayParticipantCount(currentParticipantCount);
  }, [currentParticipantCount]);
  
  // Check if session is full and call the callback if provided
  useEffect(() => {
    if (maxParticipants > 0 && displayParticipantCount >= maxParticipants && onSessionFull) {
      onSessionFull();
    }
  }, [displayParticipantCount, maxParticipants, onSessionFull]);

  // Early return AFTER all hooks have been called
  if (!isAdmin || !conversationId) return null;
  
  // Generate secure join URL (includes join_token to prevent enumeration)
  const joinUrl = buildJoinUrl(conversationId, joinToken);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl);
    toast({
      title: "Link copied!",
      description: "Session link copied to clipboard.",
    });
  };
  
  const percentageFilled = maxParticipants ? (displayParticipantCount / maxParticipants) * 100 : 0;
  
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 mt-4">
      <div className="text-center mb-3">
        <h3 className="text-gray-700 font-medium mb-1 flex items-center justify-center gap-1">
          <Users className="w-4 h-4" /> Participants
        </h3>
        <div className="text-xl font-semibold text-primary">
          {displayParticipantCount} <span className="text-gray-400 text-sm font-normal">/ {maxParticipants}</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-6">
        <div 
          className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${percentageFilled}%` }}
        />
      </div>
      
      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-gray-700 font-medium mb-3 flex items-center gap-1">
          <QrCode className="w-4 h-4" /> Session QR Code
        </h3>
        
        <div className="flex justify-center mb-3">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(joinUrl)}`} 
            alt="Join session QR code" 
            className="w-32 h-32"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-sm flex items-center gap-1"
            onClick={copyToClipboard}
          >
            <Copy className="w-3 h-3" /> Copy link
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full text-sm flex items-center gap-1"
            onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`, '_blank')}
          >
            <Share2 className="w-3 h-3" /> Share QR
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionJoinInfo;
