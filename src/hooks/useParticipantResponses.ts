
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
        // Parse the stored responses
        const storedResponses = JSON.parse(stored);
        
        // Check if this is a valid object
        if (typeof storedResponses === 'object' && storedResponses !== null) {
          return storedResponses;
        }
      }
    } catch (e) {
      console.error('Error loading participant responses from storage:', e);
      // On error, clear the storage to avoid persistent problems
      localStorage.removeItem('participant_responses');
    }
    return { /* no-op */ };
  };
  
  const [participantResponded, setParticipantResponded] = useState<{[key: number]: boolean}>(getInitialResponseState());
  
  // Clear response state when joining a new session or if there are no messages yet
  useEffect(() => {
    // If messages array is empty or only contains a welcome message,
    // we should reset the response state for the current user
    const onlyWelcomeMessage = messages.length <= 1 && messages.some(msg => msg.sender === 'assistant');
    
    if ((messages.length === 0 || onlyWelcomeMessage) && currentUserParticipantId) {
      setParticipantResponded(prev => {
        const updated = {...prev};
        delete updated[currentUserParticipantId];
        // Update localStorage
        try {
          localStorage.setItem('participant_responses', JSON.stringify(updated));
        } catch (e) {
          console.error('Error saving participant responses to storage:', e);
        }
        return updated;
      });
    }
  }, [messages, currentUserParticipantId]);
  
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

  // Reset hasAnswered when a new facilitator message arrives
  useEffect(() => {
    if (!currentUserParticipantId) return;
    
    // Get the most recent message
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    
    // If the most recent message is from the facilitator (after initial welcome), reset answer state
    if (lastMessage && lastMessage.sender === 'assistant' && messages.length > 1) {
      // Check if the participant has already responded to this message
      const hasRespondedToLatestFacilitatorMessage = messages.some((message, index) => {
        // Find the last facilitator message
        if (message.id === lastMessage.id) {
          // Check if there are any participant messages after this facilitator message
          return messages.slice(index + 1).some(m => 
            m.participant === `P${currentUserParticipantId}` && 
            m.sender === "user"
          );
        }
        return false;
      });
      
      // Only reset if participant hasn't responded to this new message
      if (!hasRespondedToLatestFacilitatorMessage) {
        setParticipantResponded(prev => {
          // Only update if the participant is marked as having responded
          if (prev[currentUserParticipantId] === true) {
            const updated = {...prev, [currentUserParticipantId]: false};
            // Save to localStorage
            try {
              localStorage.setItem('participant_responses', JSON.stringify(updated));
            } catch (e) {
              console.error('Error saving participant responses to storage:', e);
            }
            return updated;
          }
          return prev;
        });
      }
    }
  }, [messages, currentUserParticipantId]);
  
  // Calculate if current participant has answered - memoized to avoid recalculations
  const hasAnswered = currentUserParticipantId ? 
    !!participantResponded[currentUserParticipantId] : false;
  
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

  // Function to clear all participant responses (useful for joining new sessions)
  const clearAllResponses = useCallback(() => {
    setParticipantResponded({ /* no-op */ });
    try {
      localStorage.removeItem('participant_responses');
    } catch (e) {
      console.error('Error removing participant responses from storage:', e);
    }
  }, []);
  
  return {
    hasAnswered,
    totalResponses,
    participantResponded,
    recordResponse,
    clearAllResponses
  };
};
