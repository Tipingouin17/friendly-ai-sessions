
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  const [isInitialFetch, setIsInitialFetch] = useState(true);
  
  // Refs to prevent infinite loops
  const lastFetchRef = useRef<string>('');
  const fetchInProgressRef = useRef(false);
  
  // Enhanced logging for conversation context
  console.log('🔍 useMessageFetching - Session Context Analysis:', {
    conversationId,
    hasConversation: !!conversation,
    conversationKeys: conversation ? Object.keys(conversation) : [],
    facilitatorDetails: conversation?.sessions?.facilitator_details,
    sessionTitle: conversation?.sessions?.title,
    sessionObjective: conversation?.sessions?.objective,
    participantDescription: conversation?.participant_description,
    isAdmin,
    totalParticipants,
    isInitialFetch,
    fetchInProgress: fetchInProgressRef.current
  });
  
  // Memoize conversation data to prevent unnecessary re-renders
  const memoizedConversation = useMemo(() => {
    if (!conversation) return null;
    return {
      id: conversation.id,
      sessions: conversation.sessions,
      participant_description: conversation.participant_description,
      language: conversation.language
    };
  }, [conversation?.id, conversation?.sessions, conversation?.participant_description, conversation?.language]);
  
  const { 
    getCachedWelcomeMessage, 
    createWelcomeMessageWithFallback,
    clearCachedWelcomeMessage,
    isGenerating: isGeneratingWelcome,
    lastError: welcomeError
  } = useWelcomeMessageWithFallback({
    conversationId,
    welcomeMessage,
    isAdmin,
    conversation: memoizedConversation
  });

  const { formatDatabaseMessages } = useMessageFormatting({ conversation: memoizedConversation });
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
    conversation: memoizedConversation
  });

  // Enhanced message processing with response tracking
  const processNewMessage = useCallback((message: Message) => {
    console.log('📨 processNewMessage called:', {
      messageId: message.id,
      sender: message.sender,
      contentLength: message.content?.length,
      isWaitingForResponses
    });

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
    console.log('❓ handleFacilitatorQuestion called:', {
      messageId: message.id,
      sender: message.sender,
      isAdmin
    });

    if (message.sender === 'assistant' && !isAdmin) {
      // Start collecting responses for this question
      const questionId = `question-${message.id}`;
      startResponseCollection(questionId);
      debugLog('all', `Started response collection for facilitator question: ${questionId}`);
    }
  }, [isAdmin, startResponseCollection]);

  // Generate unique fetch key to prevent unnecessary re-fetches
  const generateFetchKey = useCallback(() => {
    return `${conversationId}-${!!memoizedConversation}-${isAdmin}-${messages.length}`;
  }, [conversationId, memoizedConversation, isAdmin, messages.length]);

  // Main fetch function with enhanced context awareness and improved AI generation
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      console.log('⚠️ fetchMessages: No conversation ID provided, skipping message fetch');
      return;
    }

    const fetchKey = generateFetchKey();
    if (lastFetchRef.current === fetchKey || fetchInProgressRef.current) {
      console.log('⚠️ fetchMessages: Skipping duplicate fetch or fetch in progress');
      return;
    }

    lastFetchRef.current = fetchKey;
    fetchInProgressRef.current = true;
    
    console.log('🚀 fetchMessages started for conversation:', conversationId);
    console.log('📋 fetchMessages - Full conversation context:', {
      conversation: memoizedConversation,
      conversationId,
      isAdmin,
      totalParticipants,
      welcomeMessage,
      hasConversationData: !!memoizedConversation
    });
    
    try {
      debugLog('all', `Fetching messages for conversation: ${conversationId}`);
      
      // Always check for database messages first
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      console.log('💾 Database message fetch result:', {
        conversationId,
        messageCount: data?.length || 0,
        hasError: !!error,
        error: error?.message
      });
        
      if (error) {
        console.error('❌ Error fetching messages:', error);
        setError(`Failed to fetch messages: ${error.message}`);
        return;
      }
      
      // If we have database messages, format and display them
      if (data && data.length > 0) {
        console.log('📨 Found existing database messages:', {
          messageCount: data.length,
          messages: data.map(msg => ({
            id: msg.id,
            role: msg.role,
            contentType: typeof msg.content,
            contentKeys: msg.content && typeof msg.content === 'object' ? Object.keys(msg.content) : []
          }))
        });

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
        console.log('🎯 No database messages found, generating welcome message for participant');
        console.log('🎯 Welcome message generation context:', {
          conversationId,
          hasConversation: !!memoizedConversation,
          facilitatorDetails: memoizedConversation?.sessions?.facilitator_details,
          sessionObjective: memoizedConversation?.sessions?.objective,
          participantDescription: memoizedConversation?.participant_description,
          conversationDataAvailable: !!memoizedConversation
        });
        
        // Only proceed if we have conversation data or if this is the initial fetch
        if (!memoizedConversation && !isInitialFetch) {
          console.log('⚠️ Waiting for conversation data before generating welcome message');
          return;
        }
        
        // Clear outdated cache for sessions to force fresh generation when we have data
        const cachedWelcomeMsg = getCachedWelcomeMessage();
        if (cachedWelcomeMsg && cachedWelcomeMsg.id === 'welcome-static' && !cachedWelcomeMsg.isEnhanced) {
          console.log('🗑️ Clearing outdated cached welcome message to force fresh generation');
          clearCachedWelcomeMessage();
        }
        
        // Generate welcome message with available data
        console.log('🤖 Generating welcome message with available context...');
        const welcomeMsg = await createWelcomeMessageWithFallback();
        console.log('✅ Welcome message generation completed:', {
          hasMessage: !!welcomeMsg,
          messageId: welcomeMsg?.id,
          contentLength: welcomeMsg?.content?.length,
          isAIGenerated: welcomeMsg?.isAIGenerated,
          isFallback: welcomeMsg?.isFallback,
          isEnhanced: welcomeMsg?.isEnhanced,
          hasAvatar: !!welcomeMsg?.avatar
        });

        if (welcomeMsg) {
          setMessages([welcomeMsg]);
          // Save to database for other participants to see
          console.log('💾 Attempting to save welcome message to database...');
          await saveWelcomeMessageToDb(welcomeMsg);
        } else {
          console.error('❌ Failed to generate welcome message');
        }
      } else {
        // For admin, just show empty state until session starts
        console.log('👨‍💼 Admin view - showing empty state until session starts');
        setMessages([]);
      }
      
    } catch (err) {
      console.error('💥 Exception in fetchMessages:', err);
      setError('Failed to load session messages');
      
      // Even on error, try to show a fallback welcome message for participants
      if (!isAdmin) {
        console.log('🔄 Attempting fallback welcome message after error...');
        try {
          const cachedWelcomeMsg = getCachedWelcomeMessage();
          if (cachedWelcomeMsg) {
            console.log('💾 Using cached fallback welcome message');
            setMessages([cachedWelcomeMsg]);
          }
        } catch (fallbackError) {
          console.error('💥 Failed to show fallback welcome message:', fallbackError);
        }
      }
    } finally {
      fetchInProgressRef.current = false;
      setIsInitialFetch(false);
    }
  }, [
    conversationId,
    welcomeMessage,
    memoizedConversation,
    isAdmin,
    getCachedWelcomeMessage,
    createWelcomeMessageWithFallback,
    clearCachedWelcomeMessage,
    formatDatabaseMessages,
    saveWelcomeMessageToDb,
    handleFacilitatorQuestion,
    generateFetchKey,
    isInitialFetch
  ]);

  // Reset initial fetch flag when conversation ID changes
  useEffect(() => {
    setIsInitialFetch(true);
    lastFetchRef.current = '';
  }, [conversationId]);

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
