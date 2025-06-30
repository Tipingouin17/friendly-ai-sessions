
import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';
import { useWelcomeMessageWithFallback } from './useWelcomeMessageWithFallback';
import { useMessageFormatting } from './useMessageFormatting';
import { useWelcomeMessageSaver } from './useWelcomeMessageSaver';
import { useResponseAggregation } from './useResponseAggregation';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    getCachedWelcomeMessage, 
    createWelcomeMessageWithFallback,
    isGenerating: isGeneratingWelcome,
    lastError: welcomeError
  } = useWelcomeMessageWithFallback({
    conversationId,
    welcomeMessage,
    isAdmin,
    conversation
  });

  const { formatDatabaseMessages } = useMessageFormatting({ conversation });
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

    // Add message to the list
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });
  }, [isWaitingForResponses, recordParticipantResponse]);

  // Trigger response collection for facilitator questions
  const handleFacilitatorQuestion = useCallback((message: Message) => {
    if (message.sender === 'assistant' && !isAdmin) {
      // Start collecting responses for this question
      const questionId = `question-${message.id}`;
      startResponseCollection(questionId);
      debugLog('all', `Started response collection for facilitator question: ${questionId}`);
    }
  }, [isAdmin, startResponseCollection]);

  // Main fetch function with enhanced context awareness
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      debugLog('all', 'No conversation ID provided, skipping message fetch');
      return;
    }
    
    try {
      debugLog('all', `Fetching messages for conversation: ${conversationId}`);
      
      // Always check for database messages first
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching messages:', error);
        setError(`Failed to fetch messages: ${error.message}`);
        return;
      }
      
      // If we have database messages, format and display them
      if (data && data.length > 0) {
        const formattedMessages = await formatDatabaseMessages(data);
        debugLog('all', `Successfully fetched ${formattedMessages.length} database messages`);
        setMessages(formattedMessages);
        
        // Check if the last message was a facilitator question
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        if (lastMessage) {
          handleFacilitatorQuestion(lastMessage);
        }
        return;
      }
      
      // No database messages - generate welcome message for participants
      if (!isAdmin) {
        debugLog('all', 'No database messages found, generating contextual welcome message for participant');
        
        // Check cache first
        const cachedWelcomeMsg = getCachedWelcomeMessage();
        if (cachedWelcomeMsg) {
          debugLog('all', 'Using cached welcome message');
          setMessages([cachedWelcomeMsg]);
          return;
        }
        
        // Generate new welcome message with enhanced context
        const welcomeMsg = await createWelcomeMessageWithFallback();
        if (welcomeMsg) {
          setMessages([welcomeMsg]);
          // Save to database for other participants to see
          saveWelcomeMessageToDb(welcomeMsg);
        }
      } else {
        // For admin, just show empty state until session starts
        debugLog('all', 'Admin view - showing empty state until session starts');
        setMessages([]);
      }
      
    } catch (err) {
      console.error('Exception fetching messages:', err);
      setError('Failed to load session messages');
      
      // Even on error, try to show a fallback welcome message for participants
      if (!isAdmin) {
        try {
          const cachedWelcomeMsg = getCachedWelcomeMessage();
          if (cachedWelcomeMsg) {
            setMessages([cachedWelcomeMsg]);
          }
        } catch (fallbackError) {
          console.error('Failed to show fallback welcome message:', fallbackError);
        }
      }
    }
  }, [
    conversationId,
    welcomeMessage,
    conversation,
    isAdmin,
    getCachedWelcomeMessage,
    createWelcomeMessageWithFallback,
    formatDatabaseMessages,
    saveWelcomeMessageToDb,
    handleFacilitatorQuestion
  ]);

  return {
    messages,
    setMessages,
    error: error || welcomeError,
    fetchMessages,
    isGeneratingWelcome,
    processNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse
  };
};
