
import React, { useState, useEffect } from 'react';
import { QrCode, Copy, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [localParticipantCount, setLocalParticipantCount] = useState(currentParticipantCount);
  const { toast } = useToast();

  const baseUrl = window.location.origin;
  const joinUrl = `${baseUrl}/join-session?id=${conversationId}`;

  // Update local count when prop changes
  useEffect(() => {
    setLocalParticipantCount(currentParticipantCount);
  }, [currentParticipantCount]);
  
  // Set up real-time subscription to track participants
  useEffect(() => {
    if (!conversationId) return;
    
    const channel = supabase
      .channel(`join-info-${conversationId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        console.log("SessionJoinInfo received update:", payload);
        
        if (payload.new && payload.new.current_participants !== undefined) {
          setLocalParticipantCount(payload.new.current_participants);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
  useEffect(() => {
    if (maxParticipants > 0 && localParticipantCount >= maxParticipants && onSessionFull) {
      onSessionFull();
    }
  }, [localParticipantCount, maxParticipants, onSessionFull]);

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
                className="w-40 h-40 border p-2 rounded-lg shadow-sm"
              />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-2">
                Scan this QR code to join the session or share the link:
              </p>
              {/* More compact link display with inline copy button */}
              <div className="flex items-center bg-gray-50 p-2 rounded-md border shadow-sm max-w-full gap-1">
                <p className="text-xs text-gray-700 truncate flex-1 px-1">
                  {joinUrl}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 py-0 px-2 hover:bg-gray-100"
                  onClick={handleCopyLink}
                >
                  {isCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="text-xs text-gray-500 flex flex-col items-center space-y-1 bg-gray-50 rounded-full px-4 py-2 border">
        <div className="flex items-center">
          <Users className="h-3 w-3 mr-1" />
          <span>Participants</span>
        </div>
        <div className="font-medium">
          {localParticipantCount} {maxParticipants > 0 ? `/ ${maxParticipants}` : ''}
        </div>
      </div>
    </div>
  );
};

export default SessionJoinInfo;
