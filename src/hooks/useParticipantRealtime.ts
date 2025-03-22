
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
  maxParticipants?: number;
}

export function useParticipantRealtime({
  conversationId,
  participants,
  setParticipants,
  setIsLoading,
  maxParticipants
}: UseParticipantRealtimeProps) {
  const participantsChannelRef = useRef<any>(null);
  const eventsChannelRef = useRef<any>(null);
  const hasSetupSubscription = useRef(false);
  
  useEffect(() => {
    if (!conversationId || hasSetupSubscription.current) {
      return () => {};
    }
    
    hasSetupSubscription.current = true;
    console.log("Setting up realtime participant tracking for conversation:", conversationId);
    
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
            
            if (eventType === 'participant_joined' && eventData && maxParticipants && eventData.current_count >= maxParticipants) {
              console.log(`Maximum participants (${maxParticipants}) reached, updating session_started flag`);
              supabase
                .from('conversations')
                .update({ session_started: true })
                .eq('id', conversationId)
                .then(({ error }) => {
                  if (error) {
                    console.error("Error starting session automatically:", error);
                  }
                });
            }
          }
        })
        .subscribe((status) => {
          console.log(`Participant events channel status: ${status}`);
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            console.log("Successfully subscribed to participant events");
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
      
    return () => {
      hasSetupSubscription.current = false;
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
  }, [conversationId, setParticipants, setIsLoading, maxParticipants]);
}
