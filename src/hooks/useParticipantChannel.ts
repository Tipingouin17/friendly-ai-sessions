
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

interface UseParticipantChannelProps {
  conversationId: number | null;
  setIsConnected: (state: boolean) => void;
  attemptReconnection: () => void;
  setCurrentParticipantCount: (count: number) => void;
  setMaxParticipantsForSession: (max: number) => void;
  refetch: () => void;
}

export function useParticipantChannel({
  conversationId,
  setIsConnected,
  attemptReconnection,
  setCurrentParticipantCount,
  setMaxParticipantsForSession,
  refetch
}: UseParticipantChannelProps) {
  const channelRef = useRef<any>(null);
  
  useEffect(() => {
    // Clean up existing subscription
    const cleanupChannel = () => {
      if (channelRef.current) {
        console.log("Cleaning up existing channel subscription");
        removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    
    cleanupChannel();
    
    if (!conversationId) {
      console.log("No conversation ID provided, skipping realtime subscription");
      return cleanupChannel;
    }
    
    console.log("Setting up realtime subscription for conversation:", conversationId);
    
    // Create a unique channel name with the conversation ID
    const channelName = `public-conversation-${conversationId}`;
    console.log(`Creating public channel: ${channelName}`);
    
    try {
      // For public access, we need to use the general schema-db-changes approach
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received realtime update for conversation:", payload);
          setIsConnected(true);
          
          if (payload.new) {
            // Update max participants if available
            if (payload.new.participants !== null && payload.new.participants > 0) {
              setMaxParticipantsForSession(payload.new.participants);
            }
            
            // Update current participants count
            if (payload.new.current_participants !== null && payload.new.current_participants >= 0) {
              setCurrentParticipantCount(payload.new.current_participants);
              
              // Force refetch conversation data to ensure we have latest state
              refetch();
            }
          }
        })
        .subscribe((status) => {
          console.log(`Channel ${channelName} status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to realtime updates');
            setIsConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to channel:', channelName);
            setIsConnected(false);
            attemptReconnection();
          }
        });

      channelRef.current = channel;

      return cleanupChannel;
    } catch (err) {
      console.error("Error setting up realtime subscription:", err);
      return cleanupChannel;
    }
  }, [conversationId, refetch, attemptReconnection, setIsConnected, setCurrentParticipantCount, setMaxParticipantsForSession]);
}
