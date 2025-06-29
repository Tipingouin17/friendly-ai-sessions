
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { useResponseTracking } from './session-messages/useResponseTracking';
import { useMessageFetching } from './session-messages/useMessageFetching';
import { useViewMode } from './session-messages/useViewMode';

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
  // Use enhanced message fetching with response aggregation
  const {
    messages,
    setMessages,
    error,
    fetchMessages,
    isGeneratingWelcome,
    processNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse
  } = useMessageFetching({
    conversationId,
    welcomeMessage,
    isAdmin,
    conversation,
    totalParticipants
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
  
  // Fetch messages when the conversation ID changes
  useEffect(() => {
    fetchMessages();
  }, [conversationId, welcomeMessage, conversation, fetchMessages]);
  
  // Enhanced message handler that includes response processing
  const handleNewMessage = (message: Message) => {
    processNewMessage(message);
    
    // Record response for tracking
    if (message.sender === 'user' && message.participant) {
      const participantId = parseInt(message.participant.replace('P', ''));
      recordResponse(participantId, true);
    }
  };
  
  return {
    messages,
    setMessages,
    error,
    currentParticipant,
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode,
    setViewMode,
    isGeneratingWelcome,
    handleNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse
  };
};
