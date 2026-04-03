/**
 * use Current Participant
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect } from "react";
import { ConversationWithSession } from "@/types/database";
import { getCurrentParticipantId } from "@/utils/participantUtils";

interface UseCurrentParticipantProps {
  locationState: { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean 
  } | null;
  conversation: ConversationWithSession | null;
}

export const useCurrentParticipant = ({ 
  locationState, 
  conversation 
}: UseCurrentParticipantProps) => {
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState<number | null>(null);
  
  useEffect(() => {
    if (conversation) {
      const participantId = getCurrentParticipantId(locationState, conversation);
      setCurrentUserParticipantId(participantId);
    }
  }, [conversation, locationState]);
  
  return currentUserParticipantId;
};
