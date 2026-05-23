/**
 * use Session Messages
 *
 * Hook for the AIfacilitator application.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Message } from '@/types/chat';
import api from '@/lib/api';
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
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

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
    currentUserParticipantId,
    messages
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
      const participantId = parseInt(message.participant, 10);
      recordResponse(participantId, true);
    }
  };

  const responseSnapshot = useMemo(() => {
    let lastAssistantIndex = -1;

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === 'assistant') {
        lastAssistantIndex = i;
        break;
      }
    }

    if (lastAssistantIndex === -1 || conversation?.is_session_ended) {
      return {
        isWaitingForResponses: false,
        responseCount: 0,
      };
    }

    const respondents = new Set<string>();
    messages.slice(lastAssistantIndex + 1).forEach(message => {
      if (message.sender !== 'user') return;
      respondents.add(message.participant || message.name || message.id);
    });

    return {
      isWaitingForResponses: true,
      responseCount: respondents.size,
    };
  }, [conversation?.is_session_ended, messages]);

  const generateAggregatedResponse = useCallback(async (hostInstruction?: string) => {
    if (!conversationId || isGeneratingResponse || conversation?.is_session_ended) return;

    setIsGeneratingResponse(true);

    try {
      const contextMessages = messages
        .filter(message => !message.isPrivateToHost)
        .map(message => ({
          role: message.sender === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        }));

      const { error: invokeError } = await api.functions.invoke('handle-facilitator-response', {
        body: {
          messages: contextMessages,
          conversationId,
          sessionStart: false,
          generateReport: false,
          ...(hostInstruction?.trim() ? { hostInstruction: hostInstruction.trim() } : {}),
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      await forceFetchMessages();
    } catch (generationError) {
      console.error('Error generating facilitator response:', generationError);
      throw generationError;
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [conversation?.is_session_ended, conversationId, forceFetchMessages, isGeneratingResponse, messages]);

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
    isWaitingForResponses: responseSnapshot.isWaitingForResponses,
    responseCount: responseSnapshot.responseCount,
    generateAggregatedResponse,
    isGeneratingResponse,
    forceFetchMessages,
    
    // Enhanced reliability features
    connectionStatus,
    forceReconnect,
    forceDeliveryCheck
  };
};
