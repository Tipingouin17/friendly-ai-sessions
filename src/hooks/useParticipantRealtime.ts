
import { useEffect, useRef } from "react";
import { ParticipantInfo } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { getParticipantInfo } from "@/utils/participantUtils";

interface UseParticipantRealtimeProps {
  conversationId: number | null;
  participants: ParticipantInfo[];
  setParticipants: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useParticipantRealtime({
  conversationId,
  participants,
  setParticipants,
  setIsLoading
}: UseParticipantRealtimeProps) {
  const participantsChannelRef = useRef<any>(null);
  const eventsChannelRef = useRef<any>(null);
  
  // Set up realtime subscription for participant updates
  useEffect(() => {
    if (!conversationId) {
      console.log("No conversationId provided to useParticipantRealtime, skipping subscription");
      return () => {};
    }
    
    console.log("Setting up realtime participant tracking for conversation:", conversationId);
    
    // Listen for new participant registrations
    try {
      const participantsChannel = supabase
        .channel(`admin-session-participants-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          console.log("New participant registered:", payload);
          
          if (payload.new) {
            const participant = payload.new;
            
            setParticipants(prev => {
              // Check if we already have this participant
              if (prev.some(p => p.id === participant.participant_id)) return prev;
              
              console.log("Adding participant from realtime event:", participant);
              console.log("Participant name from database:", participant.name);
              
              return [...prev, {
                id: participant.participant_id,
                name: participant.name,
                avatar: participant.avatar_seed 
                  ? `/api/avatar?name=${participant.avatar_seed}&variant=beam&palette=0` 
                  : null,
                isAnonymous: participant.is_anonymous || false
              }];
            });
          }
        })
        .subscribe((status) => {
          console.log(`Participants channel subscription status: ${status}`);
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            console.log("Successfully subscribed to participant updates");
            // Force loading state to false after successful channel subscription
            setIsLoading(false);
          } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
            console.error("Error subscribing to participant updates");
            setIsLoading(false);
          }
        });
        
      participantsChannelRef.current = participantsChannel;
    } catch (e) {
      console.error("Error setting up participants channel:", e);
      setIsLoading(false);
    }
    
    // Listen for participant_joined events
    try {
      const eventsChannel = supabase
        .channel(`admin-participant-events-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          console.log("Admin received participant event:", payload);
          
          if (payload.new) {
            const eventData = payload.new.data;
            const eventType = payload.new.event_type;
            
            if (eventType === 'participant_joined' && eventData) {
              const participantId = eventData.participant_id;
              const participantName = eventData.participant_name;
              
              console.log("Participant joined event data:", eventData);
              console.log("Participant name from event:", participantName);
              
              if (participantId && participantName) {
                setParticipants(prev => {
                  // Check if we already have this participant
                  if (prev.some(p => p.id === participantId)) return prev;
                  
                  console.log("Adding new participant from event:", eventData);
                  return [...prev, {
                    id: participantId,
                    name: participantName,
                    avatar: eventData.avatar_url || null,
                    isAnonymous: eventData.is_anonymous || false
                  }];
                });
              }
            }
          }
        })
        .subscribe((status) => {
          console.log(`Participant events channel status: ${status}`);
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            console.log("Successfully subscribed to participant events");
            // Second chance to set loading to false after event channel subscription
            setIsLoading(false);
          } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
            console.error("Error subscribing to participant events");
            setIsLoading(false);
          }
        });
        
      eventsChannelRef.current = eventsChannel;
    } catch (e) {
      console.error("Error setting up events channel:", e);
      setIsLoading(false);
    }
      
    // Clean up function
    return () => {
      // Safe cleanup of channels
      try {
        if (participantsChannelRef.current) {
          removeChannel(participantsChannelRef.current);
          participantsChannelRef.current = null;
        }
      } catch (e) {
        console.error("Error removing participants channel:", e);
      }
      
      try {
        if (eventsChannelRef.current) {
          removeChannel(eventsChannelRef.current);
          eventsChannelRef.current = null;
        }
      } catch (e) {
        console.error("Error removing events channel:", e);
      }
    };
  }, [conversationId, participants, setParticipants, setIsLoading]);
}
