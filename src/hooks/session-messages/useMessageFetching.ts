
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
    clearWelcomeMessageCache,
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

  // Main fetch function - DATABASE FIRST approach
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      debugLog('all', 'No conversation ID provided, skipping message fetch');
      return;
    }
    
    try {
      debugLog('all', `🔍 Fetching messages for conversation: ${conversationId} (Database First)`);
      
      // ALWAYS check database first - this is the primary source of truth
      const { data, error: dbError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (dbError) {
        console.error('Error fetching messages from database:', dbError);
        setError(`Failed to fetch messages: ${dbError.message}`);
        
        // If database fails and we're a participant, show emergency fallback
        if (!isAdmin) {
          const cachedWelcomeMsg = getCachedWelcomeMessage();
          if (cachedWelcomeMsg) {
            debugLog('all', 'Database failed, using cached welcome message');
            setMessages([cachedWelcomeMsg]);
          } else {
            const emergencyWelcome = await createWelcomeMessageWithFallback();
            if (emergencyWelcome) {
              setMessages([emergencyWelcome]);
            }
          }
        }
        return;
      }
      
      // If we have database messages, use them (this is the expected path)
      if (data && data.length > 0) {
        const formattedMessages = await formatDatabaseMessages(data);
        debugLog('all', `✅ Successfully loaded ${formattedMessages.length} database messages`);
        setMessages(formattedMessages);
        
        // Check if the last message was a facilitator question
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        if (lastMessage) {
          handleFacilitatorQuestion(lastMessage);
        }
        return;
      }
      
      // No database messages found
      debugLog('all', `📭 No messages found in database for session ${conversationId}`);
      
      // For admin, just show empty state - they'll see messages when session starts
      if (isAdmin) {
        debugLog('all', 'Admin view - showing empty state until session generates messages');
        setMessages([]);
        return;
      }
      
      // For participants, check if we should have a welcome message
      debugLog('all', 'Participant view - checking for welcome message availability');
      
      // If session has started, there should be a database message
      // If not found, it means AI generation may have failed - show emergency fallback
      const cachedWelcomeMsg = getCachedWelcomeMessage();
      if (cachedWelcomeMsg && !cachedWelcomeMsg.isFallback) {
        debugLog('all', 'Using valid cached AI-generated welcome message');
        setMessages([cachedWelcomeMsg]);
      } else {
        debugLog('all', '⚠️ No AI-generated welcome message found, creating emergency fallback');
        const emergencyWelcome = await createWelcomeMessageWithFallback();
        if (emergencyWelcome) {
          setMessages([emergencyWelcome]);
        }
      }
      
    } catch (err) {
      console.error('Exception fetching messages:', err);
      setError('Failed to load session messages');
      
      // Emergency fallback for participants
      if (!isAdmin) {
        try {
          const cachedWelcomeMsg = getCachedWelcomeMessage();
          if (cachedWelcomeMsg) {
            setMessages([cachedWelcomeMsg]);
          } else {
            const emergencyWelcome = await createWelcomeMessageWithFallback();
            if (emergencyWelcome) {
              setMessages([emergencyWelcome]);
            }
          }
        } catch (fallbackError) {
          console.error('Failed to show emergency fallback welcome message:', fallbackError);
        }
      }
    }
  }, [
    conversationId,
    isAdmin,
    getCachedWelcomeMessage,
    createWelcomeMessageWithFallback,
    formatDatabaseMessages,
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
    isGeneratingResponse,
    clearWelcomeMessageCache
  };
};
