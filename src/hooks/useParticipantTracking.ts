
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

export function useParticipantTracking(
  conversationState: { participantName?: string; avatarSeed?: string; isGuest?: boolean; participantId?: number } | null,
  conversation: ConversationWithSession | null,
  conversationId?: number | null
) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch existing participants from session_participants table
  useEffect(() => {
    if (!conversationId) return;
    
    async function fetchParticipants() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('participant_id', { ascending: true });
          
        if (error) {
          console.error("Error fetching participants:", error);
          return;
        }
        
        if (data && data.length > 0) {
          console.log("Fetched participants from database:", data);
          
          const participantsList: ParticipantInfo[] = data.map(participant => ({
            id: participant.participant_id,
            name: participant.name,
            avatar: participant.avatar_seed 
              ? `/api/avatar?name=${participant.avatar_seed}&variant=beam&palette=0` 
              : null,
            isAnonymous: participant.is_anonymous || false
          }));
          
          setParticipants(participantsList);
        } else if (conversation && conversation.current_participants > 0) {
          // Fallback to placeholder data if no participants are found in the table
          console.log("No participants found in database, using fallback data");
          
          const initialParticipants: ParticipantInfo[] = [];
          
          for (let i = 1; i <= conversation.current_participants; i++) {
            initialParticipants.push({
              id: i,
              name: `Participant ${i}`,
              avatar: null,
              isAnonymous: false
            });
          }
          
          setParticipants(initialParticipants);
        }
      } catch (err) {
        console.error("Exception fetching participants:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchParticipants();
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
          return [...prev, {
            id: conversationState.participantId!,
            name: conversationState.participantName!,
            avatar: avatarUrl,
            isAnonymous: false
          }];
        });
      }
    }
  }, [conversationState]);
  
  // Set up realtime subscription for participant updates
  useEffect(() => {
    if (!conversationId) return;
    
    console.log("Setting up realtime participant tracking for conversation:", conversationId);
    
    // Listen for new participant registrations
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
      .subscribe();
    
    // Listen for participant_joined events
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
            
            setParticipants(prev => {
              // Check if we already have this participant
              if (prev.some(p => p.id === participantId)) return prev;
              
              console.log("Adding new participant from event:", participantId);
              return [...prev, {
                id: participantId,
                name: eventData.participant_name || `Participant ${participantId}`,
                avatar: eventData.avatar_url || null,
                isAnonymous: eventData.is_anonymous || false
              }];
            });
          }
        }
      })
      .subscribe();
      
    return () => {
      removeChannel(participantsChannel);
      removeChannel(eventsChannel);
    };
  }, [conversationId]);
  
  return {
    participants,
    setParticipants,
    isLoading
  };
}
