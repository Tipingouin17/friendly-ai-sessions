
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { useResponseTracking } from './session-messages/useResponseTracking';
import { useViewMode } from './session-messages/useViewMode';
import { useEnhancedSessionMessages } from './useEnhancedSessionMessages';

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
  // Use enhanced message fetching with improved reliability
  const {
    messages,
    setMessages,
    error,
    isLoading,
    handleNewMessage: processNewMessage,
    forceFetchMessages,
    connectionStatus,
    forceReconnect,
    forceDeliveryCheck
  } = useEnhancedSessionMessages({
    conversationId,
    currentUserParticipantId,
    isAdmin,
    welcomeMessage,
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
  
  // Enhanced message handler that includes response processing
  const handleNewMessage = (message: Message) => {
    processNewMessage(message);
    
    // Record response for tracking
    if (message.sender === 'user' && message.participant) {
      const participantId = parseInt(message.participant.replace('P', ''));
      recordResponse(participantId, true);
    }
  };

  // Log connection status for debugging
  useEffect(() => {
    if (conversationId) { /* no-op */ }
  }, [conversationId, connectionStatus]);
  
  return {
    messages,
    setMessages,
    error: error || null,
    currentParticipant,
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode,
    setViewMode,
    isGeneratingWelcome: isLoading,
    handleNewMessage,
    isWaitingForResponses: false, // Not implemented in enhanced version yet
    responseCount: 0, // Not implemented in enhanced version yet
    generateAggregatedResponse: async () => { /* no-op */ }, // Not implemented in enhanced version yet
    isGeneratingResponse: false, // Not implemented in enhanced version yet
    forceFetchMessages,
    
    // Enhanced reliability features
    connectionStatus,
    forceReconnect,
    forceDeliveryCheck
  };
};
