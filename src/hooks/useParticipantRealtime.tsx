
import { useEffect } from 'react';
import { ParticipantInfo } from "@/types/chat";
import { useOptimizedRealtimeConnection } from "./useOptimizedRealtimeConnection";

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
  
  // Handle conversation updates (participant count changes)
  const handleConversationUpdate = (payload: any) => {
    if (payload.new && payload.new.current_participants !== undefined) {
      console.log(`📊 Participant count updated: ${payload.new.current_participants}`);
      setDisplayCount(payload.new.current_participants);
    }
  };

  // Handle participant changes
  const handleParticipantChange = (payload: any) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const newParticipant: ParticipantInfo = {
        id: payload.new.participant_id,
        name: payload.new.name,
        avatar: payload.new.avatar_seed 
          ? `/api/avatar?name=${payload.new.avatar_seed}&variant=beam&palette=0` 
          : null,
        isAnonymous: payload.new.is_anonymous || false
      };
      
      setParticipantsList(prev => {
        const exists = prev.some(p => p.id === newParticipant.id);
        if (exists) return prev;
        return [...prev, newParticipant];
      });
    } else if (payload.eventType === 'DELETE' && payload.old) {
      setParticipantsList(prev => prev.filter(p => p.id !== payload.old.participant_id));
    }
  };

  // Handle session events
  const handleSessionEvent = (payload: any) => {
    if (payload.new) {
      const eventData = payload.new.data;
      const eventType = payload.new.event_type;
      
      // Update count for participant events
      if ((eventType === 'participant_joined' || eventType === 'participant_removed') &&
          typeof eventData.current_count === 'number') {
        console.log(`📊 Setting counter from ${eventType} event: ${eventData.current_count}`);
        setDisplayCount(eventData.current_count);
      }
      
      // Handle participant joined events
      if (eventType === 'participant_joined' && eventData.participant_id && eventData.participant_name) {
        setParticipantsList(prev => {
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
      
      // Handle participant removed events
      if (eventType === 'participant_removed' && eventData.participant_id) {
        setParticipantsList(prev => prev.filter(p => p.id !== eventData.participant_id));
      }
    }
  };

  // Set up optimized realtime connection
  useOptimizedRealtimeConnection({
    conversationId,
    onConversationUpdate: handleConversationUpdate,
    onParticipantChange: handleParticipantChange,
    onSessionEvent: handleSessionEvent,
    isHost: true // Assuming this is used by admin/host components
  });
};
