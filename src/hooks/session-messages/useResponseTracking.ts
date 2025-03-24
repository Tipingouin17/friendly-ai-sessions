
import { useState, useCallback, useEffect } from 'react';

interface UseResponseTrackingProps {
  currentUserParticipantId: number | null;
}

export const useResponseTracking = ({
  currentUserParticipantId
}: UseResponseTrackingProps) => {
  const [currentParticipant, setCurrentParticipant] = useState<number>(0);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [totalResponses, setTotalResponses] = useState<number>(0);
  
  // Set up the current participant
  useEffect(() => {
    if (currentUserParticipantId) {
      setCurrentParticipant(currentUserParticipantId);
    }
  }, [currentUserParticipantId]);
  
  // Record response for a participant
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    if (participantId === currentUserParticipantId) {
      setHasAnswered(hasResponded);
    }
    if (hasResponded) {
      setTotalResponses(prev => prev + 1);
    }
  }, [currentUserParticipantId]);
  
  return {
    currentParticipant,
    hasAnswered,
    totalResponses,
    recordResponse
  };
};
