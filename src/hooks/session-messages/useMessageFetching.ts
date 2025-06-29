
import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { debugLog } from '@/utils/debugLogger';
import { useWelcomeMessageWithFallback } from './useWelcomeMessageWithFallback';
import { useWelcomeMessageSaver } from './useWelcomeMessageSaver';
import { useResponseAggregation } from './useResponseAggregation';
import { useCoordinatedSessionData } from '../useCoordinatedSessionData';

interface UseMessageFetchingProps {
  conversationId: number | null;
  welcomeMessage?: string | null;
  isAdmin: boolean;
  conversation?: any;
  totalParticipants?: number;
}

export const useMessageFetching = ({
  conversationId,
  welcomeMessage,
  isAdmin,
  conversation,
  totalParticipants = 1
}: UseMessageFetchingProps) => {
  const [error, setError] = useState<string | null>(null);
  
  // Use coordinated session data instead of direct database calls
  const {
    messages: coordinatedMessages,
    isLoading,
    error: coordinatedError,
    refetch,
    connectionHealthy
  } = useCoordinatedSessionData({
    conversationId,
    isAdmin
  });
  
  const { 
    getCachedWelcomeMessage, 
    createWelcomeMessageWithFallback,
    clearWelcomeMessageCache,
    isGenerating: isGeneratingWelcome,
    lastError: welcomeError
  } = useWelcomeMessageWithFallback({
    conversationId,
    welcomeMessage,
    isAdmin,
    conversation
  });

  const { saveWelcomeMessageToDb } = useWelcomeMessageSaver({ conversationId, isAdmin });

  // Response aggregation system
  const {
    isWaitingForResponses,
    responseCount,
    recordParticipantResponse,
    generateAggregatedResponse,
    startResponseCollection,
    isGeneratingResponse
  } = useResponseAggregation({
    conversationId,
    totalParticipants,
    conversation
  });

  // Enhanced message processing with response tracking
  const processNewMessage = useCallback((message: Message) => {
    // Record participant responses for aggregation
    if (message.sender === 'user' && isWaitingForResponses) {
      recordParticipantResponse(message);
    }

    // Trigger coordinated data refetch to get updated messages
    refetch();
  }, [isWaitingForResponses, recordParticipantResponse, refetch]);

  // Trigger response collection for facilitator questions
  const handleFacilitatorQuestion = useCallback((message: Message) => {
    if (message.sender === 'assistant' && !isAdmin) {
      // Start collecting responses for this question
      const questionId = `question-${message.id}`;
      startResponseCollection(questionId);
      debugLog('all', `Started response collection for facilitator question: ${questionId}`);
    }
  }, [isAdmin, startResponseCollection]);

  // Main fetch function - uses coordinated data
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      debugLog('all', 'No conversation ID provided, using coordinated fetch');
      return;
    }
    
    debugLog('all', `🔍 Using coordinated fetch for conversation: ${conversationId}`);
    
    // The coordinated system handles all the fetching logic
    // We just need to trigger a refetch if needed
    refetch();
  }, [conversationId, refetch]);

  // Determine final messages based on coordinated data and fallbacks
  const messages = coordinatedMessages.length > 0 
    ? coordinatedMessages 
    : (getCachedWelcomeMessage() ? [getCachedWelcomeMessage()] : []);

  // Combine errors from different sources
  const finalError = error || coordinatedError || welcomeError;

  return {
    messages,
    setMessages: () => {
      console.warn('setMessages is deprecated in coordinated system - use refetch()');
    },
    error: finalError,
    fetchMessages,
    isGeneratingWelcome: isGeneratingWelcome || isLoading,
    processNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse,
    clearWelcomeMessageCache,
    refetch,
    connectionHealthy
  };
};
