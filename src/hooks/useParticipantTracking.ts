
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";

export function useParticipantTracking(
  conversationState: { participantName?: string; avatarSeed?: string; isGuest?: boolean; participantId?: number } | null,
  conversation: ConversationWithSession | null
) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  
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
            avatar: avatarUrl
          }];
        });
      }
    }
  }, [conversationState]);
  
  // Update participants based on conversation data
  useEffect(() => {
    if (conversation && conversation.current_participants > 0) {
      if (conversation.current_participants > participants.length) {
        console.log("Updating participants based on conversation data:", conversation.current_participants);
        
        const updatedParticipants = [...participants];
        
        for (let i = updatedParticipants.length + 1; i <= conversation.current_participants; i++) {
          if (!updatedParticipants.some(p => p.id === i)) {
            updatedParticipants.push({
              id: i,
              name: `Participant ${i}`,
              avatar: null
            });
          }
        }
        
        setParticipants(updatedParticipants);
      }
    }
  }, [conversation, participants]);
  
  return {
    participants,
    setParticipants
  };
}
