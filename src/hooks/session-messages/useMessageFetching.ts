import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';
import { useWelcomeMessageWithFallback } from './useWelcomeMessageWithFallback';
import { useMessageFormatting } from './useMessageFormatting';
import { useWelcomeMessageSaver } from './useWelcomeMessageSaver';
import { useResponseAggregation } from './useResponseAggregation';
import { requestDeduplicator } from '@/utils/requestDeduplication';

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
  
  // Enhanced refs for deduplication and state management
  const lastFetchRef = useRef<string>('');
  const fetchInProgressRef = useRef(false);
  const autoStartProcessedRef = useRef<boolean>(false);
  const welcomeGenerationRef = useRef<boolean>(false);
  
  // Enhanced logging for conversation context
  console.log('🔍 useMessageFetching - Enhanced Session Context Analysis:', {
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
    fetchInProgress: fetchInProgressRef.current,
    sessionStarted: conversation?.session_started,
    autoStartProcessed: autoStartProcessedRef.current,
    welcomeGenerated: welcomeGenerationRef.current,
    hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective)
  });
  
  // Memoize conversation data to prevent unnecessary re-renders
  const memoizedConversation = useMemo(() => {
    if (!conversation) return null;
    return {
      id: conversation.id,
      sessions: conversation.sessions,
      participant_description: conversation.participant_description,
      language: conversation.language,
      session_started: conversation.session_started,
      current_participants: conversation.current_participants,
      participants: conversation.participants,
      sessions_id: conversation.sessions_id
    };
  }, [conversation?.id, conversation?.sessions, conversation?.participant_description, conversation?.language, conversation?.session_started, conversation?.current_participants, conversation?.participants, conversation?.sessions_id]);
  
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

  // Enhanced auto-start detection with session events
  const checkIfAutoStarted = useCallback(async (convId: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('session_events')
        .select('*')
        .eq('conversation_id', convId)
        .eq('event_type', 'session_auto_started')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('❌ Error checking auto-start status:', error);
        return false;
      }
      
      const isAutoStarted = data && data.length > 0;
      console.log('🔍 Enhanced auto-start check result:', {
        conversationId: convId,
        isAutoStarted,
        eventData: data?.[0],
        eventTimestamp: data?.[0]?.created_at
      });
      
      return isAutoStarted;
    } catch (err) {
      console.error('💥 Exception checking auto-start status:', err);
      return false;
    }
  }, []);

  // Enhanced message processing with response tracking
  const processNewMessage = useCallback((message: Message) => {
    console.log('📨 Enhanced processNewMessage called:', {
      messageId: message.id,
      sender: message.sender,
      contentLength: message.content?.length,
      isWaitingForResponses
    });

    // Record participant responses for aggregation
    if (message.sender === 'user' && isWaitingForResponses) {
      recordParticipantResponse(message);
    }

    // Add message to the list with deduplication
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        console.log('⚠️ Duplicate message detected, skipping:', message.id);
        return prev;
      }
      return [...prev, message];
    });
  }, [isWaitingForResponses, recordParticipantResponse]);

  // Trigger response collection for facilitator questions
  const handleFacilitatorQuestion = useCallback((message: Message) => {
    console.log('❓ Enhanced handleFacilitatorQuestion called:', {
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

  // Enhanced AI welcome generation for auto-started sessions
  const generateAIWelcomeForAutoStart = useCallback(async () => {
    if (!conversationId || !memoizedConversation || welcomeGenerationRef.current) {
      console.log('⚠️ Skipping AI welcome generation:', {
        hasConversationId: !!conversationId,
        hasConversation: !!memoizedConversation,
        alreadyGenerated: welcomeGenerationRef.current
      });
      return null;
    }

    // Only proceed if we have rich context
    if (!memoizedConversation?.sessions?.facilitator_details?.title || !memoizedConversation?.sessions?.objective) {
      console.log('⚠️ Insufficient context for AI generation, using fallback');
      return null;
    }

    console.log('🚀 Enhanced AI welcome generation for auto-start with rich context:', {
      conversationId,
      sessionStarted: memoizedConversation.session_started,
      isAdmin,
      hasSessionData: !!memoizedConversation.sessions,
      facilitatorTitle: memoizedConversation.sessions.facilitator_details?.title,
      sessionTitle: memoizedConversation.sessions?.title
    });

    // Mark as processed to prevent duplicates
    welcomeGenerationRef.current = true;

    try {
      // Use deduplication to prevent multiple simultaneous generations
      const deduplicationKey = `ai-welcome-${conversationId}`;
      
      return await requestDeduplicator.deduplicate(deduplicationKey, async () => {
        console.log('🤖 Generating AI welcome message for auto-started session with rich context...');
        
        // Call the enhanced edge function with full context
        const { data: aiResponse, error } = await supabase.functions.invoke('handle-facilitator-response', {
          body: {
            messages: [],
            conversationId,
            sessionStart: true,
            generateReport: false,
            conversation: memoizedConversation
          }
        });

        if (error) {
          console.error('❌ AI welcome generation failed:', error);
          throw new Error(`AI generation failed: ${error.message}`);
        }

        if (!aiResponse?.content) {
          console.error('⚠️ AI response empty');
          throw new Error('AI response is empty');
        }

        // Create AI-generated message
        const aiMessage: Message = {
          id: `welcome-ai-auto-${Date.now()}`,
          content: aiResponse.content,
          sender: 'assistant',
          timestamp: new Date(),
          created_at: new Date().toISOString(),
          avatar: aiResponse.avatar || '/api/avatar?name=Facilitator&variant=beam&palette=2',
          isWelcomeMessage: true,
          isAIGenerated: true
        };

        console.log('✅ AI welcome message generated for auto-start:', {
          contentLength: aiResponse.content.length,
          generationMethod: aiResponse.metrics?.generationMethod,
          hasAvatar: !!aiResponse.avatar
        });

        return aiMessage;
      });

    } catch (error) {
      console.error('❌ Error generating AI welcome for auto-start:', error);
      welcomeGenerationRef.current = false; // Reset on error
      return null;
    }
  }, [conversationId, memoizedConversation]);

  // Enhanced session start monitoring for both admin and participant views
  useEffect(() => {
    if (memoizedConversation?.session_started && !welcomeGenerationRef.current) {
      console.log('🔄 Enhanced session start detected:', {
        conversationId,
        isAdmin,
        hasSessionData: !!memoizedConversation.sessions,
        currentMessages: messages.length
      });

      // For admin views, generate AI welcome if auto-started
      if (isAdmin) {
        console.log('👨‍💼 Admin view - checking for auto-start AI generation...');
        generateAIWelcomeForAutoStart().then(aiMessage => {
          if (aiMessage) {
            console.log('📝 Adding AI welcome message for admin view');
            setMessages([aiMessage]);
            saveWelcomeMessageToDb(aiMessage);
          }
        });
      }
    }
  }, [memoizedConversation?.session_started, isAdmin, generateAIWelcomeForAutoStart, messages.length, conversationId, saveWelcomeMessageToDb]);

  // Generate unique fetch key to prevent unnecessary re-fetches
  const generateFetchKey = useCallback(() => {
    return `${conversationId}-${!!memoizedConversation}-${isAdmin}-${messages.length}-${welcomeGenerationRef.current}`;
  }, [conversationId, memoizedConversation, isAdmin, messages.length]);

  // Enhanced main fetch function with improved deduplication
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
    
    console.log('🚀 Enhanced fetchMessages started for conversation:', conversationId);
    
    try {
      debugLog('all', `Fetching messages for conversation: ${conversationId}`);
      
      // Always check for database messages first
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      console.log('💾 Enhanced database message fetch result:', {
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
            contentType: typeof msg.content
          }))
        });

        const formattedMessages = await formatDatabaseMessages(data);
        debugLog('all', `Successfully fetched ${formattedMessages.length} database messages`);
        setMessages(formattedMessages);
        return;
      }
      
      // No database messages found - handle welcome generation for admin
      console.log('📭 No database messages found, determining welcome generation strategy');
      
      // For admin views with auto-started sessions, try AI generation
      if (isAdmin && memoizedConversation?.session_started) {
        console.log('🎯 Admin view with started session, attempting AI welcome generation...');
        const aiMessage = await generateAIWelcomeForAutoStart();
        if (aiMessage) {
          setMessages([aiMessage]);
          await saveWelcomeMessageToDb(aiMessage);
          return;
        }
      }
      
      // For participants, use existing welcome message logic
      if (!isAdmin) {
        console.log('🎯 Participant view - generating welcome message');
        
        // Clear outdated cache for sessions to force fresh generation when we have data
        const cachedWelcomeMsg = getCachedWelcomeMessage();
        if (cachedWelcomeMsg && cachedWelcomeMsg.id === 'welcome-static' && !cachedWelcomeMsg.isEnhanced) {
          console.log('🗑️ Clearing outdated cached welcome message to force fresh generation');
          clearCachedWelcomeMessage();
        }
        
        // Generate welcome message with available data
        console.log('🤖 Generating welcome message with available context...');
        const welcomeMsg = await createWelcomeMessageWithFallback();
        
        if (welcomeMsg) {
          setMessages([welcomeMsg]);
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
      console.error('💥 Exception in enhanced fetchMessages:', err);
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
    generateFetchKey,
    isInitialFetch,
    generateAIWelcomeForAutoStart
  ]);

  // Reset state when conversation ID changes
  useEffect(() => {
    setIsInitialFetch(true);
    lastFetchRef.current = '';
    autoStartProcessedRef.current = false;
    welcomeGenerationRef.current = false;
  }, [conversationId]);

  return {
    messages,
    setMessages,
    error: error || welcomeError,
    fetchMessages,
    isGeneratingWelcome,
    processNewMessage: useCallback((message: Message) => {
      console.log('📨 Enhanced processNewMessage called:', {
        messageId: message.id,
        sender: message.sender,
        contentLength: message.content?.length,
        isWaitingForResponses
      });

      // Record participant responses for aggregation
      if (message.sender === 'user' && isWaitingForResponses) {
        recordParticipantResponse(message);
      }

      // Add message to the list with deduplication
      setMessages(prev => {
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          console.log('⚠️ Duplicate message detected, skipping:', message.id);
          return prev;
        }
        return [...prev, message];
      });
    }, [isWaitingForResponses, recordParticipantResponse]),
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse
  };
};
