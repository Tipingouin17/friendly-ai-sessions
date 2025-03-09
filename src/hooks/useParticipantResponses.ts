
import { useState, useCallback, useMemo } from 'react';
import { Message } from '@/types/chat';

type UseParticipantResponsesProps = {
  messages: Message[];
  currentUserParticipantId: number | null;
};

export const useParticipantResponses = ({
  messages,
  currentUserParticipantId
}: UseParticipantResponsesProps) => {
  const [participantResponded, setParticipantResponded] = useState<{[key: number]: boolean}>({});
  
  // Calculate metrics for UI
  const hasAnswered = useMemo(() => 
    messages.some(message => 
      message.participant === `P${currentUserParticipantId}` && message.sender === "user"
    )
  , [messages, currentUserParticipantId]);
  
  const totalResponses = useMemo(() => 
    messages.filter(message => message.sender === "user").length
  , [messages]);

  // Record if a participant has responded
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    setParticipantResponded(prev => ({...prev, [participantId]: hasResponded}));
  }, []);
  
  return {
    hasAnswered,
    totalResponses,
    participantResponded,
    recordResponse
  };
};
