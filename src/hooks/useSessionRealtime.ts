
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParticipantInfo } from "@/types/chat";

type UseSessionRealtimeProps = {
  currentConversationId: number | null;
  participants: ParticipantInfo[];
  setParticipants: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
  conversation: any | null;
  refetch: () => void;
  handleSessionFull?: () => void;
};

export const useSessionRealtime = ({
  currentConversationId,
  participants,
  setParticipants,
  conversation,
  refetch,
  handleSessionFull
}: UseSessionRealtimeProps) => {
  useEffect(() => {
    if (currentConversationId) {
      console.log("Setting up realtime subscription for participants in Session page");
      
      const channel = supabase
        .channel(`participants-${currentConversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${currentConversationId}`
        }, (payload) => {
          console.log("Received realtime update for participants in Session page:", payload);
          
          if (payload.new && payload.new.current_participants !== undefined) {
            const currentCount = payload.new.current_participants;
            
            if (currentCount > participants.length) {
              const newParticipants = [...participants];
              for (let i = participants.length + 1; i <= currentCount; i++) {
                if (!newParticipants.some(p => p.id === i)) {
                  newParticipants.push({
                    id: i,
                    name: `Participant ${i}`,
                    avatar: null
                  });
                }
              }
              setParticipants(newParticipants);
            }
            
            if (currentCount >= (conversation?.participants || 0) && (conversation?.participants || 0) > 0) {
              if (handleSessionFull) {
                handleSessionFull();
              }
            }
            
            refetch();
          }
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentConversationId, participants, refetch, conversation, handleSessionFull, setParticipants]);
};
