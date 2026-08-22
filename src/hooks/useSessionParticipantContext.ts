/**
 * use Session Participant Context
 *
 * Hook for the AIfacilitator application.
 */

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
  const [participantMap, setParticipantMap] = useState<{[id: number]: ParticipantInfo}>({ /* no-op */ });
  const [participantCount, setParticipantCount] = useState(0);
  const [maxParticipants, setMaxParticipants] = useState(0);
  
  // Build participant map for easy access
  useEffect(() => {
    const map: {[id: number]: ParticipantInfo} = { /* no-op */ };
    participants.forEach(participant => {
      map[participant.id] = participant;
    });
    setParticipantMap(map);
  }, [participants]);
  
  // Update counts from conversation data
  useEffect(() => {
    if (conversation) {
      setParticipantCount(conversation.current_participants || 0);
      setMaxParticipants(Math.max((conversation.participants || 0) - 1, 0));
    }
  }, [conversation]);
  
  // Get the current participant info
  const currentParticipant = currentUserParticipantId 
    ? participantMap[currentUserParticipantId] 
    : null;
  
  // `current_participants` counts non-host attendee rows only; capacity is
  // host-inclusive in `participants`, so it is normalized once above.
  const attendeeCount = participantCount;

  return {
    participantMap,
    participantCount,
    maxParticipants,
    currentParticipant,
    isSessionFull: maxParticipants > 0 && attendeeCount >= maxParticipants
  };
};
