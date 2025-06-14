
import { useEffect, useRef } from "react";
import { ParticipantInfo } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

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
  const currentConversationIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Only set up once per conversation id - prevent duplicate subscriptions
    if (!conversationId || 
        hasSetupSubscription.current || 
        currentConversationIdRef.current === conversationId) {
      return () => {};
    }
    
    // Clean up existing channels if they exist and we're switching to a new conversation
    if (currentConversationIdRef.current !== conversationId) {
      if (participantsChannelRef.current) {
        removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
      
      if (eventsChannelRef.current) {
        removeChannel(eventsChannelRef.current);
        eventsChannelRef.current = null;
      }
      
      currentConversationIdRef.current = conversationId;
    }
    
    hasSetupSubscription.current = true;
    console.log("Setting up realtime participant tracking for conversation:", conversationId);
    
    try {
      // Subscribe to direct table changes (INSERT, UPDATE, DELETE)
      const participantsChannel = supabase
        .channel(`admin-session-participants-${conversationId}`)
        .on('postgres_changes', {
          event: '*', // Listen for all events
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          console.log("Participant table change:", payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const participant = payload.new;
            
            setParticipants(prev => {
              if (prev.some(p => p.id === participant.participant_id)) return prev;
              
              console.log("Adding participant from realtime event:", participant);
              
              return [...prev, {
                id: participant.participant_id,
                name: participant.name,
                avatar: participant.avatar_seed 
                  ? `/api/avatar?name=${participant.avatar_seed}&variant=beam&palette=0` 
                  : null,
                isAnonymous: participant.is_anonymous || false,
                isAdmin: participant.is_admin || false
              }];
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Handle direct deletion from database
            const deletedParticipant = payload.old;
            console.log("Participant deleted from database:", deletedParticipant);
            
            setParticipants(prev => prev.filter(p => p.id !== deletedParticipant.participant_id));
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Handle participant updates
            const updatedParticipant = payload.new;
            
            setParticipants(prev => prev.map(p => {
              if (p.id === updatedParticipant.participant_id) {
                return {
                  ...p,
                  name: updatedParticipant.name || p.name,
                  avatar: updatedParticipant.avatar_seed 
                    ? `/api/avatar?name=${updatedParticipant.avatar_seed}&variant=beam&palette=0` 
                    : p.avatar,
                  isAnonymous: updatedParticipant.is_anonymous || p.isAnonymous,
                  isAdmin: updatedParticipant.is_admin || p.isAdmin
                };
              }
              return p;
            }));
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
      // Subscribe to session events for additional coordination
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
              
              if (participantId && participantName) {
                setParticipants(prev => {
                  if (prev.some(p => p.id === participantId)) return prev;
                  
                  console.log("Adding new participant from event:", eventData);
                  return [...prev, {
                    id: participantId,
                    name: participantName,
                    avatar: eventData.avatar_url || null,
                    isAnonymous: eventData.is_anonymous || false,
                    isAdmin: eventData.is_admin || false
                  }];
                });
              }
            } else if (eventType === 'participant_removed' && eventData) {
              // Handle participant removal events
              const participantId = eventData.participant_id;
              
              if (participantId) {
                console.log("Participant removed via event:", participantId);
                setParticipants(prev => prev.filter(p => p.id !== participantId));
              }
            }
            
            // Auto-start session when max participants reached
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
      // Clean up on unmount
      if (participantsChannelRef.current) {
        removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
      
      if (eventsChannelRef.current) {
        removeChannel(eventsChannelRef.current);
        eventsChannelRef.current = null;
      }
      
      hasSetupSubscription.current = false;
    };
  }, [conversationId, setParticipants, setIsLoading, maxParticipants]);
}
