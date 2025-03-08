
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParticipantInfo } from "@/types/chat";
import { getParticipantInfo } from "@/utils/participantUtils";

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
      
      // Check if the session is already full when component mounts
      if (conversation && 
          conversation.current_participants >= (conversation.participants || 0) && 
          (conversation.participants || 0) > 0) {
        console.log("Session is already full on component mount, triggering handleSessionFull");
        if (handleSessionFull) {
          handleSessionFull();
        }
      }

      // First channel for conversation updates
      const conversationChannel = supabase
        .channel(`conversations-${currentConversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${currentConversationId}`
        }, (payload) => {
          console.log("Received realtime update for participants in Session page:", payload);
          
          if (payload.new && payload.new.current_participants !== undefined) {
            const currentCount = payload.new.current_participants;
            
            // Check if all participants have joined and trigger redirect
            if (currentCount >= (payload.new.participants || 0) && (payload.new.participants || 0) > 0) {
              console.log("All participants have joined, triggering session start");
              if (handleSessionFull) {
                handleSessionFull();
              }
            }
            
            refetch();
          }
        })
        .subscribe();
      
      // Second channel for session_participants updates
      const participantsChannel = supabase
        .channel(`session_participants-${currentConversationId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'session_participants',
          filter: `conversation_id=eq.${currentConversationId}`
        }, async (payload) => {
          console.log("Received new participant:", payload);
          
          if (payload.new) {
            const newParticipant = payload.new;
            
            // Check if we already have this participant
            if (!participants.some(p => p.id === newParticipant.participant_id)) {
              const participantInfo = await getParticipantInfo(newParticipant);
              
              setParticipants(current => {
                // Double-check we're not adding a duplicate
                if (current.some(p => p.id === participantInfo.id)) {
                  return current;
                }
                return [...current, participantInfo];
              });
            }
            
            refetch();
          }
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(conversationChannel);
        supabase.removeChannel(participantsChannel);
      };
    }
  }, [currentConversationId, participants, refetch, conversation, handleSessionFull, setParticipants]);
};
