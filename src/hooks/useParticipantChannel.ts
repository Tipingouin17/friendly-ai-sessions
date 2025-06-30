import { useState, useEffect, useRef, useCallback } from "react";
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
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Enhanced retry mechanism with exponential backoff
  const retryConnection = useCallback(() => {
    if (retryCountRef.current < maxRetries && mountedRef.current) {
      retryCountRef.current += 1;
      const delay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
      
      console.log(`Retrying participant channel connection (attempt ${retryCountRef.current}/${maxRetries}) after ${delay}ms`);
      
      setTimeout(() => {
        if (mountedRef.current) {
          attemptReconnection();
        }
      }, delay);
    } else {
      console.error('Max retry attempts reached for participant channel');
      setError('Failed to establish stable connection after multiple attempts');
    }
  }, [attemptReconnection]);
  
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;
    
    console.log(`Setting up enhanced participant channel for conversation ${conversationId}`);
    
    // Reset retry count on new setup
    retryCountRef.current = 0;
    setError(null);
    
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
      }, async (payload) => {
        if (!mountedRef.current) return;
        
        console.log("Enhanced participant count update payload:", payload);
        
        try {
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
            
            // Refetch with error handling
            try {
              await refetch();
              setError(null); // Clear any previous errors on successful refetch
            } catch (refetchError) {
              console.error("Error refetching conversation after realtime update:", refetchError);
              setError(`Refetch failed: ${refetchError.message || 'Unknown error'}`);
            }
          }
          
          // Mark as connected when we get updates
          setIsConnected(true);
          retryCountRef.current = 0; // Reset retry count on successful update
        } catch (error) {
          console.error("Error processing participant count update:", error);
          setError(`Update processing failed: ${error.message || 'Unknown error'}`);
        }
      })
      .subscribe((status) => {
        console.log(`Enhanced participant channel ${channelName} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to participant count updates');
          setIsConnected(true);
          setError(null);
          retryCountRef.current = 0; // Reset retry count on successful subscription
          
          // Immediately refetch after subscribing to get latest counts
          refetch().catch(err => {
            console.error("Error refetching conversation after channel subscribe:", err);
            setError(`Initial refetch failed: ${err.message || 'Unknown error'}`);
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Enhanced error subscribing to participant count updates');
          const errorMsg = 'Failed to connect to session updates';
          setError(errorMsg);
          setIsConnected(false);
          retryConnection();
        } else if (status === 'TIMED_OUT') {
          console.error('Enhanced connection timed out for participant count updates');
          const errorMsg = 'Connection timed out';
          setError(errorMsg);
          setIsConnected(false);
          retryConnection();
        } else if (status === 'CLOSED') {
          console.log('Participant channel closed');
          setIsConnected(false);
        }
      });
      
    // Also listen for participant removal events with enhanced error handling
    const eventsChannel = supabase
      .channel(`count-events-${conversationId}-${Date.now()}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (!mountedRef.current) return;
        
        console.log("Enhanced count event:", payload);
        
        try {
          if (payload.new && payload.new.data) {
            const eventData = payload.new.data;
            const eventType = payload.new.event_type;
            
            // Update count for both join and removal events
            if ((eventType === 'participant_joined' || eventType === 'participant_removed') &&
                typeof eventData.current_count === 'number') {
              console.log(`Setting counter display count from ${eventType} event to ${eventData.current_count}`);
              setCurrentParticipantCount(eventData.current_count);
            }
          }
        } catch (error) {
          console.error("Error processing session event:", error);
          setError(`Event processing failed: ${error.message || 'Unknown error'}`);
        }
      })
      .subscribe((status) => {
        console.log(`Enhanced events channel status:`, status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Events channel error, but continuing with main channel');
        }
      });
    
    return () => {
      if (mountedRef.current) {
        console.log(`Cleaning up enhanced participant channel ${channelName}`);
      }
      try {
        removeChannel(channel);
        removeChannel(eventsChannel);
      } catch (cleanupError) {
        console.error("Error cleaning up participant channels:", cleanupError);
      }
    };
  }, [conversationId, setIsConnected, retryConnection, setCurrentParticipantCount, setMaxParticipantsForSession, refetch]);
  
  return { error };
}
