
import { useState, useCallback, useEffect } from 'react';
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
  
  // Update hasAnswered based on messages
  useEffect(() => {
    if (currentUserParticipantId) {
      const hasUserResponded = messages.some(message => 
        message.participant === `P${currentUserParticipantId}` && 
        message.sender === "user"
      );
      
      if (hasUserResponded) {
        console.log(`User participant ${currentUserParticipantId} has already responded`);
        setParticipantResponded(prev => ({...prev, [currentUserParticipantId]: true}));
      }
    }
  }, [messages, currentUserParticipantId]);
  
  // Calculate if current participant has answered
  const hasAnswered = currentUserParticipantId ? 
    !!participantResponded[currentUserParticipantId] || 
    messages.some(message => 
      message.participant === `P${currentUserParticipantId}` && 
      message.sender === "user"
    ) : false;
  
  // Calculate total unique participants who have responded
  const totalResponses = messages.reduce((count, message) => {
    if (message.sender === "user" && message.participant) {
      const participantId = message.participant.replace('P', '');
      setParticipantResponded(prev => ({...prev, [parseInt(participantId)]: true}));
      return count + 1;
    }
    return count;
  }, 0);

  // Record if a participant has responded
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    console.log(`Recording participant ${participantId} response status: ${hasResponded}`);
    setParticipantResponded(prev => ({...prev, [participantId]: hasResponded}));
  }, []);
  
  return {
    hasAnswered,
    totalResponses,
    participantResponded,
    recordResponse
  };
};
