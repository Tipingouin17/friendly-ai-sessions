
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { useResponseTracking } from './session-messages/useResponseTracking';
import { useViewMode } from './session-messages/useViewMode';
import { useCoordinatedSessionData } from './useCoordinatedSessionData';

interface UseSessionMessagesProps {
  conversationId: number | null;
  currentUserParticipantId: number | null;
  isAdmin: boolean;
  welcomeMessage?: string | null;
  conversation?: any;
  totalParticipants?: number;
}

export const useSessionMessages = ({
  conversationId,
  currentUserParticipantId,
  isAdmin,
  welcomeMessage,
  conversation,
  totalParticipants = 1
}: UseSessionMessagesProps) => {
  // Use coordinated session data to prevent duplicate requests
  const {
    messages,
    participants,
    conversation: sessionConversation,
    isLoading,
    error,
    refetch,
    connectionHealthy
  } = useCoordinatedSessionData({
    conversationId,
    isAdmin
  });
  
  const {
    currentParticipant,
    hasAnswered,
    totalResponses,
    recordResponse
  } = useResponseTracking({
    currentUserParticipantId
  });
  
  const {
    viewMode,
    setViewMode
  } = useViewMode({
    isAdmin
  });
  
  // Enhanced message handler that includes response processing
  const handleNewMessage = (message: Message) => {
    // Record response for tracking
    if (message.sender === 'user' && message.participant) {
      const participantId = parseInt(message.participant.replace('P', ''));
      recordResponse(participantId, true);
    }
    
    // Trigger refetch to get updated data
    refetch();
  };
  
  return {
    messages,
    setMessages: () => {
      console.warn('setMessages is deprecated - use refetch() to update messages');
    },
    error,
    currentParticipant,
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode,
    setViewMode,
    isGeneratingWelcome: isLoading,
    handleNewMessage,
    isWaitingForResponses: false,
    responseCount: 0,
    generateAggregatedResponse: () => Promise.resolve(),
    isGeneratingResponse: false,
    refetch,
    connectionHealthy
  };
};
