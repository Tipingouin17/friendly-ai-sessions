import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

interface UseParticipantChannelProps {
  conversationId: number | null;
  setIsConnected: (isConnected: boolean) => void;
  attemptReconnection: () => void;
  setCurrentParticipantCount: (count: number) => void;
  setMaxParticipantsForSession: (max: number) => void;
  refetch: () => Promise<any>;
}

export function useParticipantChannel({
  conversationId,
  setIsConnected,
  attemptReconnection,
  setCurrentParticipantCount,
  setMaxParticipantsForSession,
  refetch
}: UseParticipantChannelProps) {
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;
    
    console.log(`Setting up participant channel for conversation ${conversationId}`);
    
    // Create a unique channel name to prevent stale connections
    const channelName = `participant-count-${conversationId}-${Date.now()}`;
    
    // Listen for changes to current_participants and participants in the conversation
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        if (!mountedRef.current) return;
        
        console.log("Participant count update payload:", payload);
        
        if (payload.new) {
          const newCount = payload.new.current_participants;
          const maxParticipants = payload.new.participants;
          
          if (typeof newCount === 'number') {
            console.log(`Setting current participant count to ${newCount} from realtime update`);
            setCurrentParticipantCount(newCount);
          }
          
          if (typeof maxParticipants === 'number') {
            console.log(`Setting max participants to ${maxParticipants} from realtime update`);
            setMaxParticipantsForSession(maxParticipants);
          }
          
          // Also refetch the full conversation to keep everything in sync
          refetch();
        }
        
        // Mark as connected when we get updates
        setIsConnected(true);
      })
      .subscribe((status) => {
        console.log(`Participant channel ${channelName} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to participant count updates');
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to participant count updates');
          setError('Failed to connect to session updates');
          setIsConnected(false);
          attemptReconnection();
        } else if (status === 'TIMED_OUT') {
          console.error('Connection timed out for participant count updates');
          setError('Connection timed out');
          setIsConnected(false);
          attemptReconnection();
        }
      });
      
    // Clean up the channel when the component unmounts
    return () => {
      if (mountedRef.current) {
        console.log(`Cleaning up participant channel ${channelName}`);
      }
      removeChannel(channel);
    };
  }, [conversationId, setIsConnected, attemptReconnection, setCurrentParticipantCount, setMaxParticipantsForSession, refetch]);
  
  return { error };
}
