
import { useState, useCallback, useEffect } from 'react';

interface UseResponseCollectionProps {
  totalParticipants: number;
  currentUserParticipantId: number | null;
}

export const useResponseCollection = ({
  totalParticipants,
  currentUserParticipantId
}: UseResponseCollectionProps) => {
  const [responseSet, setResponseSet] = useState<Set<number>>(new Set());
  const [isWaitingForResponses, setIsWaitingForResponses] = useState(false);
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);

  // Reset response collection when a new question is asked
  const startNewResponseCollection = useCallback((questionId: string) => {
    setResponseSet(new Set());
    setIsWaitingForResponses(true);
    setLastQuestionId(questionId);
  }, []);

  // Record a participant response
  const recordParticipantResponse = useCallback((participantId: number) => {
    setResponseSet(prev => new Set([...prev, participantId]));
  }, []);

  // Check if all participants have responded
  const allParticipantsResponded = responseSet.size >= totalParticipants;

  // Check if current user has responded
  const currentUserHasResponded = currentUserParticipantId ? responseSet.has(currentUserParticipantId) : false;

  // Stop waiting when all have responded or when facilitator responds
  useEffect(() => {
    if (allParticipantsResponded) {
      setIsWaitingForResponses(false);
    }
  }, [allParticipantsResponded]);

  const stopWaitingForResponses = useCallback(() => {
    setIsWaitingForResponses(false);
  }, []);

  return {
    responseCount: responseSet.size,
    isWaitingForResponses,
    allParticipantsResponded,
    currentUserHasResponded,
    startNewResponseCollection,
    recordParticipantResponse,
    stopWaitingForResponses,
    lastQuestionId
  };
};
