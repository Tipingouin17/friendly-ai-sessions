
import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { ParticipantInfo } from "@/types/chat";
import { removeChannel } from "@/utils/realtimeHelpers";

interface UseParticipantRealtimeProps {
  conversationId: number | null;
  participants: ParticipantInfo[];
  maxParticipants: number;
  setDisplayCount: (count: number) => void;
  setParticipantsList: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
}

export const useParticipantRealtime = ({
  conversationId,
  participants,
  maxParticipants,
  setDisplayCount,
  setParticipantsList
}: UseParticipantRealtimeProps) => {
  
  // Set up realtime subscription for participant updates
  useEffect(() => {
    if (!conversationId) return;
    
    // Set up channel subscriptions
    const conversationChannel = supabase
      .channel(`admin-conversation-updates-${conversationId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        if (payload.new && payload.new.current_participants !== undefined) {
          setDisplayCount(payload.new.current_participants);
          
          // If max participants is reached, update session_started flag
          if (payload.new.current_participants >= maxParticipants && maxParticipants > 0 && !payload.new.session_started) {
            // Update session_started flag
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
      .subscribe();
    
    // Listen for session events
    const eventsChannel = supabase
      .channel(`admin-session-events-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (payload.new && payload.new.event_type === 'participant_joined') {
          const eventData = payload.new.data;
          if (eventData) {
            if (eventData.current_count !== undefined) {
              setDisplayCount(eventData.current_count);
            }
            
            // Update participant information from the event data
            if (eventData.participant_id && eventData.participant_name) {
              setParticipantsList(prev => {
                // Check if participant already exists
                const exists = prev.some(p => p.id === eventData.participant_id);
                if (exists) return prev;
                
                return [...prev, {
                  id: eventData.participant_id,
                  name: eventData.participant_name,
                  avatar: eventData.avatar_url || null,
                  isAnonymous: eventData.is_anonymous || false
                }];
              });
            }
          }
        } else if (payload.new && payload.new.event_type === 'participant_removed') {
          const eventData = payload.new.data;
          if (eventData && eventData.participant_id && eventData.current_count !== undefined) {
            setDisplayCount(eventData.current_count);
            
            // Remove participant from list if we didn't remove them ourselves
            if (eventData.removed_by !== 'admin') {
              setParticipantsList(prev => prev.filter(p => p.id !== eventData.participant_id));
            }
          }
        }
      })
      .subscribe();
      
    // Set up a direct subscription to session_participants table
    const participantsDirectChannel = supabase
      .channel(`admin-participants-direct-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_participants',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (payload.new) {
          const participantData = payload.new;
          setParticipantsList(prev => {
            // Check if participant already exists
            const exists = prev.some(p => p.id === participantData.participant_id);
            if (exists) return prev;
            
            return [...prev, {
              id: participantData.participant_id,
              name: participantData.name,
              avatar: participantData.avatar_seed 
                ? `/api/avatar?name=${participantData.avatar_seed}&variant=beam&palette=0` 
                : null,
              isAnonymous: participantData.is_anonymous || false
            }];
          });
        }
      })
      .subscribe();
      
    return () => {
      removeChannel(conversationChannel);
      removeChannel(eventsChannel);
      removeChannel(participantsDirectChannel);
    };
  }, [conversationId, participants, maxParticipants, setDisplayCount, setParticipantsList]);
};
