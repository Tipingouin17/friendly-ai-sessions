/**
 * use Response Tracking
 *
 * Session message hook for the AIfacilitator application.
 */

import { useState, useCallback } from 'react';

interface UseResponseTrackingProps {
  currentUserParticipantId: number | null;
}

export const useResponseTracking = ({
  currentUserParticipantId
}: UseResponseTrackingProps) => {
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [totalResponses, setTotalResponses] = useState<number>(0);
  
  // Use currentUserParticipantId directly to avoid timing issues where
  // a separate state starts at 0 and hasn't been updated yet when a message is sent
  const currentParticipant = currentUserParticipantId ?? 0;
  
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
