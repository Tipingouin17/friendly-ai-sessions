
import { useState, useEffect } from "react";
import { ConversationWithSession } from "@/types/database";

export function useParticipantCounts(conversation: ConversationWithSession | null) {
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  
  // Set conversation data
  useEffect(() => {
    if (conversation) {
      console.log("Conversation data loaded in useParticipantCounts:", {
        current: conversation.current_participants,
        max: conversation.participants
      });
      
      // Set the maximum participants for this specific session
      if (conversation.participants !== null && conversation.participants > 0) {
        setMaxParticipantsForSession(conversation.participants);
      }
      
      // Set the current participants count
      if (conversation.current_participants !== null && conversation.current_participants >= 0) {
        setCurrentParticipantCount(conversation.current_participants);
      }
    }
  }, [conversation]);
  
  return {
    currentParticipantCount,
    setCurrentParticipantCount,
    maxParticipantsForSession,
    setMaxParticipantsForSession,
  };
}
