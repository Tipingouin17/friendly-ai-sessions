
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
  // Participant tracking
  const {
    participants = [],
    setParticipants,
    isLoading: isLoadingParticipants
  } = useParticipantTracking(locationState, conversationData, currentConversationId);

  // Current participant state
  const currentParticipant = useCurrentParticipant({
    locationState,
    conversation: conversationData
  });

  // Anonymous state
  const { isAnonymous, toggleAnonymous } = useAnonymousState({
    conversationId: currentConversationId,
    currentParticipantId: currentParticipant
  });

  // Response tracking state
  const [hasAnswered, setHasAnswered] = useState(false);
  const [totalResponses, setTotalResponses] = useState(0);
  const [participantResponses, setParticipantResponses] = useState<{ [key: number]: boolean }>({});

  const recordResponse = (participantId: number, hasResponded: boolean) => {
    setParticipantResponses(prev => {
      const updated = { ...prev, [participantId]: hasResponded };
      const newTotal = Object.values(updated).filter(Boolean).length;
      setTotalResponses(newTotal);
      if (participantId === currentParticipant) {
        setHasAnswered(hasResponded);
      }
      return updated;
    });
  };

  return {
    participants,
    setParticipants,
    isLoadingParticipants,
    currentParticipant,
    isAnonymous,
    toggleAnonymous,
    hasAnswered,
    totalResponses,
    participantResponses,
    recordResponse
  };
};
