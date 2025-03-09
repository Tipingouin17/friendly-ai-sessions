
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";

interface UseSessionParticipantContextProps {
  conversation: ConversationWithSession | null;
  participants: ParticipantInfo[];
  currentUserParticipantId: number | null;
}

export const useSessionParticipantContext = ({
  conversation,
  participants,
  currentUserParticipantId
}: UseSessionParticipantContextProps) => {
  const [participantMap, setParticipantMap] = useState<{[id: number]: ParticipantInfo}>({});
  const [participantCount, setParticipantCount] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(0);
  
  // Build participant map for easy access
  useEffect(() => {
    const map: {[id: number]: ParticipantInfo} = {};
    participants.forEach(participant => {
      map[participant.id] = participant;
    });
    setParticipantMap(map);
  }, [participants]);
  
  // Update counts from conversation data
  useEffect(() => {
    if (conversation) {
      setParticipantCount(conversation.current_participants || 0);
      setMaxParticipants(conversation.participants || 0);
    }
  }, [conversation]);
  
  // Get the current participant info
  const currentParticipant = currentUserParticipantId 
    ? participantMap[currentUserParticipantId] 
    : null;
  
  return {
    participantMap,
    participantCount,
    maxParticipants,
    currentParticipant,
    isSessionFull: maxParticipants > 0 && participantCount >= maxParticipants
  };
};
