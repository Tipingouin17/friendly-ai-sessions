
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

export function useParticipantTracking(
  conversationState: { participantName?: string; avatarSeed?: string; isGuest?: boolean; participantId?: number } | null,
  conversation: ConversationWithSession | null,
  conversationId?: number | null
) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch existing participants from session_participants table
  useEffect(() => {
    if (!conversationId) {
      console.log("No conversationId provided to useParticipantTracking, skipping fetch");
      setIsLoading(false);
      return () => {
        // No cleanup needed for this case
      };
    }
    
    let isMounted = true;
    
    async function fetchParticipants() {
      setIsLoading(true);
      
      try {
        console.log("Fetching participants for conversation:", conversationId);
        
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('participant_id', { ascending: true });
          
        if (error) {
          console.error("Error fetching participants:", error);
          return;
        }
        
        if (data && data.length > 0 && isMounted) {
          console.log("Fetched participants from database:", data);
          
          const participantsList: ParticipantInfo[] = data.map(participant => ({
            id: participant.participant_id,
            name: participant.name,
            avatar: participant.avatar_seed 
              ? `/api/avatar?name=${participant.avatar_seed}&variant=beam&palette=0` 
              : null,
            isAnonymous: participant.is_anonymous || false
          }));
          
          console.log("Processed participant list:", participantsList);
          setParticipants(participantsList);
        } else if (conversation && conversation.current_participants > 0 && isMounted) {
          console.log("No participants found in database, waiting for realtime updates");
          setParticipants([]);
        }
      } catch (err) {
        console.error("Exception fetching participants:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    fetchParticipants();
    
    return () => {
      isMounted = false;
    };
  }, [conversationId, conversation]);
  
  // Add participant from location state (for guests joining)
  useEffect(() => {
    if (conversationState?.isGuest) {
      console.log("Guest participant joining with data:", conversationState);
      
      if (conversationState.participantName && conversationState.participantId) {
        const avatarUrl = conversationState.avatarSeed 
          ? `/api/avatar?name=${conversationState.avatarSeed}&variant=beam&palette=0` 
          : null;
          
        setParticipants(prev => {
          const exists = prev.some(p => p.id === conversationState.participantId);
          if (exists) return prev;
          
          console.log("Adding participant with ID:", conversationState.participantId);
          console.log("Adding participant with name:", conversationState.participantName);
          
          return [...prev, {
            id: conversationState.participantId!,
            name: conversationState.participantName!,
            avatar: avatarUrl,
            isAnonymous: false
          }];
        });
      }
    }
    
    return () => {
      // No cleanup needed for this effect
    };
  }, [conversationState]);
  
  // Set up realtime subscription for participant updates
  useEffect(() => {
    if (!conversationId) {
      console.log("No conversationId provided to useParticipantTracking, skipping realtime subscription");
      return () => {
        // No cleanup needed for this case
      };
    }
    
    console.log("Setting up realtime participant tracking for conversation:", conversationId);
    
    // Listen for new participant registrations
    let participantsChannel;
    let eventsChannel;
    
    try {
      participantsChannel = supabase
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
    } catch (e) {
      console.error("Error setting up participants channel:", e);
      setIsLoading(false);
    }
    
    // Listen for participant_joined events
    try {
      eventsChannel = supabase
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
    } catch (e) {
      console.error("Error setting up events channel:", e);
      setIsLoading(false);
    }
      
    return () => {
      // Safe cleanup of channels
      if (participantsChannel) {
        try {
          removeChannel(participantsChannel);
        } catch (e) {
          console.error("Error removing participants channel:", e);
        }
      }
      
      if (eventsChannel) {
        try {
          removeChannel(eventsChannel);
        } catch (e) {
          console.error("Error removing events channel:", e);
        }
      }
    };
  }, [conversationId]);
  
  // Log the current participants array for debugging
  useEffect(() => {
    console.log("Current participants array:", participants);
    return () => {
      // No cleanup needed
    };
  }, [participants]);
  
  return {
    participants,
    setParticipants,
    isLoading
  };
}
