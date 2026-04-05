/**
 * use Response Tracking
 *
 * Session message hook for the AIfacilitator application.
 */

import { useState, useCallback, useMemo } from 'react';
import { Message } from '@/types/chat';

interface UseResponseTrackingProps {
  currentUserParticipantId: number | null;
  messages?: Message[];
}

export const useResponseTracking = ({
  currentUserParticipantId,
  messages = []
}: UseResponseTrackingProps) => {
  const [totalResponses, setTotalResponses] = useState<number>(0);
  
  // Use currentUserParticipantId directly to avoid timing issues where
  // a separate state starts at 0 and hasn't been updated yet when a message is sent
  const currentParticipant = currentUserParticipantId ?? 0;
  
  // Compute hasAnswered directly from the messages array:
  // true only if the participant has sent a message AFTER the last assistant message.
  // This correctly resets each round without needing explicit reset calls.
  const hasAnswered = useMemo(() => {
    if (!currentUserParticipantId) return false;
    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'assistant') { lastAssistantIdx = i; break; }
    }
    if (lastAssistantIdx === -1) return false;
    return messages.slice(lastAssistantIdx + 1).some(
      m => m.sender === 'user' && m.participant === String(currentUserParticipantId)
    );
  }, [messages, currentUserParticipantId]);
  
  // Record response for a participant (kept for compatibility; totalResponses still uses it)
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    if (hasResponded) {
      setTotalResponses(prev => prev + 1);
    }
  }, []);
  
  return {
    currentParticipant,
    hasAnswered,
    totalResponses,
    recordResponse
  };
};
