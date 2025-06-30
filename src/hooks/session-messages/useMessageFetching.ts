
import { useState, useCallback, useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { useWelcomeMessageWithFallback } from './useWelcomeMessageWithFallback';
import { useWelcomeMessageSaver } from './useWelcomeMessageSaver';
import { useMessageRealtime } from '../useMessageRealtime';
import { createLogger } from '@/utils/debugLogger';
import { supabase } from '@/integrations/supabase/client';

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
  const [isWaitingForResponses, setIsWaitingForResponses] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const hasInitializedWelcome = useRef(false);
  const logger = createLogger('MessageFetching', 'messages');

  const {
    getCachedWelcomeMessage,
    createWelcomeMessageWithFallback,
    isGenerating: isGeneratingWelcome
  } = useWelcomeMessageWithFallback({
    conversationId,
    welcomeMessage,
    isAdmin,
    conversation
  });

  const { saveWelcomeMessageToDb } = useWelcomeMessageSaver({
    conversationId,
    isAdmin
  });

  // Enhanced message fetching with welcome message handling
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      logger.category('messages', `🔍 Fetching messages for conversation ${conversationId}`);
      
      // Check session context for debugging
      const sessionContext = {
        facilitatorName: conversation?.sessions?.facilitator_details?.title || conversation?.facilitator?.title,
        facilitatorDetails: conversation?.sessions?.facilitator_details?.details || conversation?.facilitator?.details,
        sessionTitle: conversation?.sessions?.title,
        sessionObjective: conversation?.sessions?.objective,
        participantDescription: conversation?.participant_description,
        participantCount: conversation?.participants,
        hasWelcomeMessage: !!welcomeMessage
      };
      
      logger.category('messages', '📋 Session context for message generation:', sessionContext);

      // Fetch existing messages from database
      const { data: existingMessages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        logger.error('❌ Error fetching messages:', fetchError);
        throw fetchError;
      }

      logger.category('messages', `📨 Found ${existingMessages?.length || 0} existing messages in database`);

      // Convert database messages to UI format
      const formattedMessages: Message[] = (existingMessages || []).map(msg => ({
        id: msg.id.toString(),
        content: typeof msg.content === 'string' ? msg.content : msg.content?.text || '',
        sender: msg.role === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date(msg.created_at),
        created_at: msg.created_at,
        avatar: typeof msg.content === 'object' && msg.content?.avatar ? msg.content.avatar : undefined,
        participant: msg.name || undefined
      }));

      // Check if we have a welcome message in the existing messages
      const hasWelcomeInDb = formattedMessages.some(msg => 
        msg.sender === 'assistant' && 
        (msg.content.toLowerCase().includes('welcome') || msg.isWelcomeMessage)
      );

      logger.category('messages', `🎯 Welcome message status:`, {
        hasWelcomeInDb,
        hasWelcomeMessageProp: !!welcomeMessage,
        conversationHasSessions: !!conversation?.sessions,
        isAdmin,
        hasInitialized: hasInitializedWelcome.current
      });

      // If no welcome message exists and we have session context, create one
      if (!hasWelcomeInDb && !hasInitializedWelcome.current && conversation?.sessions) {
        logger.category('messages', '🚀 No welcome message found, generating enhanced welcome with full context');
        hasInitializedWelcome.current = true;

        try {
          // First try to get cached welcome message
          let welcomeMsg = getCachedWelcomeMessage();
          
          if (!welcomeMsg) {
            logger.category('messages', '🤖 No cached welcome message, generating new one with AI/fallback');
            welcomeMsg = await createWelcomeMessageWithFallback();
          }

          if (welcomeMsg) {
            logger.category('messages', `✅ Welcome message created:`, {
              messageId: welcomeMsg.id,
              contentLength: welcomeMsg.content.length,
              contentPreview: welcomeMsg.content.substring(0, 150) + '...',
              hasAvatar: !!welcomeMsg.avatar,
              isAIGenerated: welcomeMsg.isAIGenerated,
              isFallback: welcomeMsg.isFallback
            });

            // Add welcome message to the beginning of messages
            setMessages([welcomeMsg, ...formattedMessages]);

            // Save to database if admin (for other participants to see)
            if (isAdmin) {
              logger.category('messages', '💾 Admin saving welcome message to database for other participants');
              await saveWelcomeMessageToDb(welcomeMsg);
            }
          } else {
            logger.error('❌ Failed to create welcome message - no message returned');
            setMessages(formattedMessages);
          }
        } catch (welcomeError) {
          logger.error('💥 Error creating welcome message:', welcomeError);
          setMessages(formattedMessages);
        }
      } else {
        logger.category('messages', '📨 Using existing messages from database');
        setMessages(formattedMessages);
      }

      setError(null);
    } catch (err: any) {
      logger.error('💥 Error in fetchMessages:', err);
      setError(err.message || 'Failed to fetch messages');
    }
  }, [conversationId, welcomeMessage, isAdmin, conversation, getCachedWelcomeMessage, createWelcomeMessageWithFallback, saveWelcomeMessageToDb, logger]);

  // Set up realtime message subscription
  useMessageRealtime({
    currentConversationId: conversationId,
    viewMode: 'participant',
    setMessages
  });

  // Process new incoming messages
  const processNewMessage = useCallback((message: Message) => {
    logger.category('messages', '📨 Processing new message:', {
      messageId: message.id,
      sender: message.sender,
      contentLength: message.content.length
    });

    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });

    // Track responses for aggregation
    if (message.sender === 'user') {
      setResponseCount(prev => prev + 1);
    }
  }, [logger]);

  // Generate aggregated facilitator response
  const generateAggregatedResponse = useCallback(async () => {
    if (!conversationId || responseCount === 0) return;

    setIsGeneratingResponse(true);
    setIsWaitingForResponses(false);

    try {
      logger.category('messages', `🔄 Generating aggregated response for ${responseCount} participant responses`);

      // Get recent participant responses for aggregation
      const participantResponses = messages
        .filter(msg => msg.sender === 'user' && msg.timestamp && msg.timestamp > new Date(Date.now() - 300000)) // Last 5 minutes
        .slice(-responseCount);

      const { data, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: messages.map(msg => ({
            content: msg.content,
            role: msg.sender === 'user' ? 'user' : 'assistant',
            participant: msg.participant
          })),
          conversationId,
          aggregateResponses: true,
          responseContext: {
            totalResponses: responseCount,
            participantResponses: participantResponses.map(msg => ({
              content: msg.content,
              participant: msg.participant
            }))
          },
          conversation // Pass full conversation context
        }
      });

      if (error) {
        logger.error('❌ Error generating aggregated response:', error);
        throw error;
      }

      if (data?.content) {
        const facilitatorResponse: Message = {
          id: `facilitator-${Date.now()}`,
          content: data.content,
          sender: 'assistant',
          timestamp: new Date(),
          created_at: new Date().toISOString(),
          avatar: data.avatar
        };

        logger.category('messages', '✅ Generated aggregated facilitator response:', {
          contentLength: data.content.length,
          responseCount,
          hasAvatar: !!data.avatar
        });

        processNewMessage(facilitatorResponse);
      }

      setResponseCount(0);
    } catch (err: any) {
      logger.error('💥 Error generating aggregated response:', err);
      setError(err.message || 'Failed to generate facilitator response');
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [conversationId, responseCount, messages, processNewMessage, logger]);

  // Reset when conversation changes
  useEffect(() => {
    if (conversationId) {
      hasInitializedWelcome.current = false;
      setMessages([]);
      setError(null);
      setResponseCount(0);
      setIsWaitingForResponses(false);
    }
  }, [conversationId]);

  return {
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
  };
};
