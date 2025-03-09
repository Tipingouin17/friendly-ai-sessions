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

  // Initialize with current count
  useEffect(() => {
    setLocalParticipantCount(currentParticipantCount);
  }, [currentParticipantCount]);
  
  // Check if session is full on component mount
  useEffect(() => {
    if (maxParticipants > 0 && localParticipantCount >= maxParticipants && onSessionFull) {
      console.log("Session is already full on component mount, calling onSessionFull");
      onSessionFull();
      
      // Automatically mark session as started in the database
      if (conversationId) {
        updateSessionStarted(conversationId, true);
      }
    }
  }, [localParticipantCount, maxParticipants, onSessionFull, conversationId]);
  
  // Update session_started in the database
  const updateSessionStarted = async (convId: number, started: boolean) => {
    try {
      console.log(`Setting session_started to ${started} for conversation:`, convId);
      const { error } = await supabase
        .from('conversations')
        .update({ 
          session_started: started 
        })
        .eq('id', convId);
        
      if (error) {
        console.error("Error updating session_started:", error);
      } else {
        console.log("Successfully updated session_started to", started);
      }
    } catch (err) {
      console.error("Exception updating session_started:", err);
    }
  };
  
  useEffect(() => {
    if (!conversationId) return;
    
    console.log("Setting up public realtime subscription in SessionJoinInfo for conversation:", conversationId);
    
    // Use a public channel with a unique name
    const channelName = `public-join-info-${conversationId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        console.log("SessionJoinInfo received update:", payload);
        
        if (payload.new && payload.new.current_participants !== undefined) {
          const newCount = payload.new.current_participants;
          setLocalParticipantCount(newCount);
          
          // Check if the session is now full after this update
          if (maxParticipants > 0 && newCount >= maxParticipants && onSessionFull) {
            console.log("Session became full with participant count:", newCount);
            onSessionFull();
            
            // Automatically mark session as started in the database
            updateSessionStarted(conversationId, true);
          }
        }
      })
      .subscribe((status) => {
        console.log(`SessionJoinInfo channel ${channelName} status: ${status}`);
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, maxParticipants, onSessionFull]);

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

  // Generate QR code for the session
  const qrCodeSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`;

  return (
    <div className="w-full h-full flex flex-col items-center justify-start space-y-4 pt-2">
      {conversationId && (
        <div className="flex flex-col items-center justify-center p-1">
          <div className="mb-1">
            <img 
              src={qrCodeSrc}
              alt="QR Code to join session"
              className="w-28 h-28 border p-1 rounded-lg shadow-sm"
            />
          </div>
          <div className="text-center mb-1">
            <p className="text-xs text-gray-500 mb-1">
              Scan QR code or share link:
            </p>
            <div className="flex items-center bg-gray-50 p-1 rounded-md border shadow-sm max-w-full gap-1">
              <p className="text-xs text-gray-700 truncate flex-1 px-1">
                {joinUrl}
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-5 py-0 px-2 hover:bg-gray-100"
                onClick={handleCopyLink}
              >
                {isCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500 flex flex-col items-center space-y-1 bg-gray-50 rounded-full px-4 py-1 border">
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
