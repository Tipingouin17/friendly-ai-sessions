
import { useState, useEffect } from "react";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { useParticipantTracking } from "@/hooks/useParticipantTracking";

interface UseAdminParticipantStateProps {
  locationState: any;
  conversationData: any;
  currentConversationId: number | null;
}

export const useAdminParticipantState = ({
  locationState,
  conversationData,
  currentConversationId
}: UseAdminParticipantStateProps) => {
  // Participant tracking for admin monitoring
  const {
    participants = [],
    setParticipants,
    isLoading: isLoadingParticipants
  } = useParticipantTracking(locationState, conversationData, currentConversationId);

  // Response tracking state for admin monitoring
  const [totalResponses, setTotalResponses] = useState(0);
  const [participantResponses, setParticipantResponses] = useState<{ [key: number]: boolean }>({});

  const recordResponse = (participantId: number, hasResponded: boolean) => {
    setParticipantResponses(prev => {
      const updated = { ...prev, [participantId]: hasResponded };
      const newTotal = Object.values(updated).filter(Boolean).length;
      setTotalResponses(newTotal);
      return updated;
    });
  };

  return {
    participants,
    setParticipants,
    isLoadingParticipants,
    totalResponses,
    participantResponses,
    recordResponse
  };
};
