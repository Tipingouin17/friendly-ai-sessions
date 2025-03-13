
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
  // Use localStorage to persist response state across refreshes
  const getInitialResponseState = () => {
    try {
      const stored = localStorage.getItem('participant_responses');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading participant responses from storage:', e);
    }
    return {};
  };
  
  const [participantResponded, setParticipantResponded] = useState<{[key: number]: boolean}>(getInitialResponseState());
  
  // Persist response state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('participant_responses', JSON.stringify(participantResponded));
    } catch (e) {
      console.error('Error saving participant responses to storage:', e);
    }
  }, [participantResponded]);
  
  // Update hasAnswered based on messages - only run this once when messages change
  useEffect(() => {
    if (currentUserParticipantId) {
      const hasUserResponded = messages.some(message => 
        message.participant === `P${currentUserParticipantId}` && 
        message.sender === "user"
      );
      
      if (hasUserResponded) {
        console.log(`User participant ${currentUserParticipantId} has already responded`);
        setParticipantResponded(prev => {
          // Only update if the value is different to avoid unnecessary rerenders
          if (prev[currentUserParticipantId] !== true) {
            const updated = {...prev, [currentUserParticipantId]: true};
            return updated;
          }
          return prev;
        });
      }
    }
  }, [messages, currentUserParticipantId]);
  
  // Calculate if current participant has answered - memoized to avoid recalculations
  const hasAnswered = currentUserParticipantId ? 
    !!participantResponded[currentUserParticipantId] || 
    messages.some(message => 
      message.participant === `P${currentUserParticipantId}` && 
      message.sender === "user"
    ) : false;
  
  // Count unique participants who have responded
  const totalResponses = messages.reduce((uniqueParticipants, message) => {
    if (message.sender === "user" && message.participant) {
      const participantId = parseInt(message.participant.replace('P', ''));
      if (!uniqueParticipants.has(participantId)) {
        uniqueParticipants.add(participantId);
      }
    }
    return uniqueParticipants;
  }, new Set<number>()).size;

  // Record if a participant has responded - memoized to prevent recreation between renders
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    console.log(`Recording participant ${participantId} response status: ${hasResponded}`);
    setParticipantResponded(prev => {
      // Only update if the value is different
      if (prev[participantId] !== hasResponded) {
        const updated = {...prev, [participantId]: hasResponded};
        // Save to localStorage immediately
        try {
          localStorage.setItem('participant_responses', JSON.stringify(updated));
        } catch (e) {
          console.error('Error saving participant responses to storage:', e);
        }
        return updated;
      }
      return prev;
    });
  }, []);
  
  return {
    hasAnswered,
    totalResponses,
    participantResponded,
    recordResponse
  };
};
