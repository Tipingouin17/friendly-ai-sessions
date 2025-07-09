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
    hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective),
    canGenerateWelcome: isAdmin && !!conversation && !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective)
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
      sessions_id: conversation.sessions_id,
      welcome_message_status: conversation.welcome_message_status
    };
  }, [
    conversation?.id, 
    conversation?.sessions, 
    conversation?.participant_description, 
    conversation?.language, 
    conversation?.session_started, 
    conversation?.current_participants, 
    conversation?.participants, 
    conversation?.sessions_id,
    conversation?.welcome_message_status
  ]);
  
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
    // For participants, generate locally without saving to DB
    // For admin/host, generate and save to DB

    if (!conversationId || !memoizedConversation || welcomeGenerationRef.current) {
      console.log('⚠️ Skipping AI welcome generation:', {
        hasConversationId: !!conversationId,
        hasConversation: !!memoizedConversation,
        alreadyGenerated: welcomeGenerationRef.current
      });
      return null;
    }

    // Enhanced context validation - ensure we have rich context
    const hasRichContext = !!(
      memoizedConversation?.sessions?.facilitator_details?.title && 
      memoizedConversation?.sessions?.objective &&
      memoizedConversation?.sessions?.facilitator_details?.details
    );

    if (!hasRichContext) {
      console.log('⚠️ Insufficient context for AI generation:', {
        hasFacilitatorTitle: !!memoizedConversation?.sessions?.facilitator_details?.title,
        hasObjective: !!memoizedConversation?.sessions?.objective,
        hasFacilitatorDetails: !!memoizedConversation?.sessions?.facilitator_details?.details
      });
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

  // Enhanced session start monitoring for immediate welcome message generation
  useEffect(() => {
    // Enhanced AI generation tracking logs
    console.log('🔍 [AI-TRACKING] Session start monitoring effect triggered:', {
      conversationId,
      hasConversation: !!memoizedConversation,
      sessionStarted: memoizedConversation?.session_started,
      welcomeMessageStatus: memoizedConversation?.welcome_message_status,
      messageCount: messages.length,
      isInitialFetch,
      welcomeGenerated: welcomeGenerationRef.current,
      facilitatorTitle: memoizedConversation?.sessions?.facilitator_details?.title,
      sessionObjective: memoizedConversation?.sessions?.objective,
      hasRichContext: !!(
        memoizedConversation?.sessions?.facilitator_details?.title && 
        memoizedConversation?.sessions?.objective &&
        memoizedConversation?.sessions?.facilitator_details?.details
      )
    });

    // Ensure we have conversation data with rich context before generating
    const hasRichContext = !!(
      memoizedConversation?.sessions?.facilitator_details?.title && 
      memoizedConversation?.sessions?.objective &&
      memoizedConversation?.sessions?.facilitator_details?.details
    );

    console.log('🤖 [AI-TRACKING] Rich context analysis:', {
      hasRichContext,
      hasFacilitatorTitle: !!memoizedConversation?.sessions?.facilitator_details?.title,
      hasObjective: !!memoizedConversation?.sessions?.objective,
      hasFacilitatorDetails: !!memoizedConversation?.sessions?.facilitator_details?.details,
      facilitatorTitle: memoizedConversation?.sessions?.facilitator_details?.title,
      objective: memoizedConversation?.sessions?.objective?.substring(0, 100) + '...'
    });

    // Generate welcome message when session starts OR when we have rich context and no messages
    const shouldGenerateWelcome = (memoizedConversation?.session_started || 
      (hasRichContext && messages.length === 0 && !isInitialFetch)) && 
      !welcomeGenerationRef.current;

    console.log('🚀 [AI-TRACKING] Should generate welcome decision:', {
      shouldGenerateWelcome,
      sessionStarted: memoizedConversation?.session_started,
      hasRichContextAndNoMessages: hasRichContext && messages.length === 0 && !isInitialFetch,
      welcomeAlreadyGenerated: welcomeGenerationRef.current,
      messageCount: messages.length,
      isInitialFetch
    });

    if (shouldGenerateWelcome) {
      console.log('🔄 Enhanced AI generation trigger detected:', {
        conversationId,
        isAdmin,
        sessionStarted: memoizedConversation?.session_started,
        hasRichContext,
        messageCount: messages.length,
        isInitialFetch,
        facilitatorName: memoizedConversation?.sessions?.facilitator_details?.title,
        objective: memoizedConversation?.sessions?.objective
      });

      console.log('🚀 [useMessageFetching] [AI-TRACKING] Triggering AI welcome generation via edge function...');
      console.log('📋 [useMessageFetching] [AI-TRACKING] AI Generation Request Details:', {
        conversationId,
        isAdmin,
        facilitatorName: memoizedConversation?.sessions?.facilitator_details?.title,
        sessionTitle: memoizedConversation?.sessions?.title,
        objective: memoizedConversation?.sessions?.objective,
        participantDescription: memoizedConversation?.participant_description,
        sessionStarted: memoizedConversation?.session_started,
        timestamp: new Date().toISOString()
      });
      
      const startTime = Date.now();
      
      // Use edge function for consistent AI generation
      supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false,
          conversation: memoizedConversation
        }
      }).then(({ data, error }) => {
        const duration = Date.now() - startTime;
        
        console.log('📡 [AI-TRACKING] Edge function response received:', {
          duration,
          success: !error,
          hasData: !!data,
          error: error?.message || null,
          dataKeys: data ? Object.keys(data) : null
        });
        
        if (error) {
          console.error('❌ [useMessageFetching] [AI-TRACKING] Edge function AI generation failed:', {
            error,
            duration,
            conversationId,
            isAdmin,
            errorDetails: error.message || error,
            errorType: typeof error,
            fullError: error
          });
          
          console.log('🔄 [useMessageFetching] Attempting fallback client-side generation...');
          // Fallback to client-side generation
          generateAIWelcomeForAutoStart().then(aiMessage => {
            if (aiMessage) {
              console.log('📝 [useMessageFetching] Fallback: Adding AI welcome message to session:', {
                contentLength: aiMessage.content?.length || 0,
                hasAvatar: !!aiMessage.avatar
              });
              setMessages([aiMessage]);
              if (isAdmin) {
                console.log('💾 [useMessageFetching] Saving fallback AI message to database...');
                saveWelcomeMessageToDb(aiMessage);
              }
            } else {
              console.error('❌ [useMessageFetching] Fallback AI generation also failed');
            }
          }).catch(fallbackError => {
            console.error('💥 [useMessageFetching] Fallback generation exception:', fallbackError);
          });
        } else {
          console.log('✅ [useMessageFetching] [AI-TRACKING] Edge function AI generation successful:', {
            duration,
            conversationId,
            responseData: data,
            hasContent: !!data?.content,
            contentLength: data?.content?.length || 0,
            generationMethod: data?.generationMethod,
            avatar: data?.avatar,
            facilitatorContext: data?.facilitator_context,
            sessionContext: data?.session_context,
            metrics: data?.metrics
          });

          console.log('🔍 [AI-TRACKING] Checking if database trigger handled message generation...');
          
          // Check welcome message status after AI generation
          const checkWelcomeStatus = async () => {
            try {
              const { data: conversationData, error: convError } = await supabase
                .from('conversations')
                .select('welcome_message_status')
                .eq('id', conversationId)
                .single();
                
              console.log('📊 [AI-TRACKING] Welcome message status check:', {
                status: conversationData?.welcome_message_status,
                error: convError?.message || null
              });
            } catch (statusError) {
              console.error('❌ [AI-TRACKING] Error checking welcome status:', statusError);
            }
          };
          
          checkWelcomeStatus();
          
          console.log('⏳ [useMessageFetching] [AI-TRACKING] Waiting for message to be saved and fetching...');
          // The message will be picked up by real-time subscription or next fetch
          setTimeout(() => {
            console.log('🔍 [useMessageFetching] Force checking for new AI-generated messages...');
            // Force fetch messages to get the AI-generated welcome
            const forceCheck = async () => {
              try {
                const { data: newMessages, error: fetchError } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('conversation_id', conversationId)
                  .order('created_at', { ascending: true });
                
                if (fetchError) {
                  console.error('❌ [useMessageFetching] Error fetching new messages:', fetchError);
                  return;
                }
                
                console.log('📨 [useMessageFetching] [AI-TRACKING] Fetched messages after AI generation:', {
                  messageCount: newMessages?.length || 0,
                  messages: newMessages?.map(m => ({
                    id: m.id,
                    role: m.role,
                    contentLength: typeof m.content === 'object' && m.content && (m.content as any).text 
                      ? (m.content as any).text.length 
                      : 0,
                    created_at: m.created_at,
                    hasAvatar: !!(m.content as any)?.avatar,
                    participant_id: m.participant_id,
                    isAIGenerated: (m.content as any)?.text?.includes('Welcome') || m.role === 'assistant'
                  }))
                });
                
                // Check for AI-generated messages
                const aiMessages = newMessages?.filter(m => m.role === 'assistant') || [];
                console.log('🤖 [AI-TRACKING] AI-generated messages found:', {
                  aiMessageCount: aiMessages.length,
                  aiMessages: aiMessages.map(m => ({
                    id: m.id,
                    role: m.role,
                    name: m.name,
                    contentPreview: typeof m.content === 'object' && m.content && (m.content as any).text 
                      ? (m.content as any).text.substring(0, 100) + '...'
                      : 'No text content',
                    hasAvatar: !!(m.content as any)?.avatar
                  }))
                });
                
                if (newMessages && newMessages.length > 0) {
                  const formattedMessages = await formatDatabaseMessages(newMessages);
                  console.log('✅ [useMessageFetching] [AI-TRACKING] Updated messages state with AI-generated content:', {
                    formattedMessageCount: formattedMessages.length,
                    hasWelcomeMessages: formattedMessages.some(m => m.isWelcomeMessage || m.sender === 'assistant')
                  });
                  setMessages(formattedMessages);
                } else {
                  console.warn('⚠️ [useMessageFetching] [AI-TRACKING] No messages found after AI generation - database trigger may have failed');
                  
                  // Check session events for any generation failures
                  const checkSessionEvents = async () => {
                    try {
                      const { data: events, error: eventsError } = await supabase
                        .from('session_events')
                        .select('*')
                        .eq('conversation_id', conversationId)
                        .in('event_type', ['welcome_message_generated', 'ai_generation_failed', 'ai_generation_error'])
                        .order('created_at', { ascending: false })
                        .limit(5);
                        
                      console.log('📋 [AI-TRACKING] Recent session events:', {
                        events: events?.map(e => ({
                          event_type: e.event_type,
                          data: e.data,
                          created_at: e.created_at
                        })) || [],
                        error: eventsError?.message || null
                      });
                    } catch (eventError) {
                      console.error('❌ [AI-TRACKING] Error checking session events:', eventError);
                    }
                  };
                  
                  checkSessionEvents();
                }
              } catch (fetchException) {
                console.error('💥 [useMessageFetching] Exception during force message check:', fetchException);
              }
            };
            forceCheck();
          }, 2000);
        }
      }).catch(error => {
        const duration = Date.now() - startTime;
        console.error('💥 [useMessageFetching] Exception calling edge function:', {
          error: error.message,
          duration,
          conversationId,
          stack: error.stack
        });
      });
      
      welcomeGenerationRef.current = true; // Mark as processed
    }
  }, [memoizedConversation?.session_started, memoizedConversation?.sessions, isAdmin, generateAIWelcomeForAutoStart, messages.length, conversationId, saveWelcomeMessageToDb]);

  // Generate stable fetch key to prevent unnecessary re-fetches
  const generateFetchKey = useCallback(() => {
    return `${conversationId}-${!!memoizedConversation}-${isAdmin}-${isInitialFetch}`;
  }, [conversationId, memoizedConversation, isAdmin, isInitialFetch]);

  // Enhanced main fetch function with improved deduplication
  const fetchMessages = useCallback(async (forceRefetch = false) => {
    if (!conversationId) {
      console.log('⚠️ fetchMessages: No conversation ID provided, skipping message fetch');
      return;
    }

    // Only fetch if we have conversation data or this is the initial fetch
    if (!memoizedConversation && !isInitialFetch && !forceRefetch) {
      console.log('⚠️ fetchMessages: Waiting for conversation data to load...');
      return;
    }

    const fetchKey = generateFetchKey();
    // Allow forced refetch or if no previous fetch
    if (!forceRefetch && lastFetchRef.current === fetchKey || fetchInProgressRef.current) {
      console.log('⚠️ fetchMessages: Skipping duplicate fetch or fetch in progress');
      return;
    }

    lastFetchRef.current = fetchKey;
    fetchInProgressRef.current = true;
    
    console.log('🚀 Enhanced fetchMessages started for conversation:', conversationId);
    
    try {
      debugLog('all', `Fetching messages for conversation: ${conversationId}`);
      
      // RLS policies now handle participant privacy automatically
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
      
      // No database messages found - handle welcome generation strategy
      console.log('📭 No database messages found, determining welcome generation strategy');
      
      // Enhanced context validation
      const hasRichContext = !!(
        memoizedConversation?.sessions?.facilitator_details?.title && 
        memoizedConversation?.sessions?.objective &&
        memoizedConversation?.sessions?.facilitator_details?.details
      );

      // For admin views with auto-started sessions and rich context, try AI generation
      if (isAdmin && memoizedConversation?.session_started && hasRichContext) {
        console.log('🎯 Admin view with started session and rich context, attempting AI welcome generation...');
        const aiMessage = await generateAIWelcomeForAutoStart();
        if (aiMessage) {
          setMessages([aiMessage]);
          await saveWelcomeMessageToDb(aiMessage);
          return;
        }
      }
      
      // For participants, wait for host to generate welcome message OR show fallback
      if (!isAdmin) {
        console.log('🎯 Participant view - checking for host-generated welcome message');
        
        // If session has started but no welcome message, try to get one more time
        if (memoizedConversation?.session_started) {
          console.log('🔄 Session started for participant - checking for host welcome message...');
          // Wait a bit for host to generate and save welcome message
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try fetching messages again to see if host generated one
          const { data: retryData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
            
          if (retryData && retryData.length > 0) {
            const formattedMessages = await formatDatabaseMessages(retryData);
            setMessages(formattedMessages);
            return;
          }
        }
        
        // Only generate fallback if we have conversation context
        if (hasRichContext) {
          console.log('🤖 Generating enhanced fallback welcome message with context...');
          const welcomeMsg = await createWelcomeMessageWithFallback();
          
          if (welcomeMsg) {
            setMessages([welcomeMsg]);
            // Don't save to DB - only host should save
          } else {
            console.error('❌ Failed to generate welcome message');
          }
        } else {
          console.log('⚠️ Waiting for conversation context to load...');
        }
      } else {
        // For admin, just show empty state until session starts or context loads
        console.log('👨‍💼 Admin view - showing empty state until session starts with full context');
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
    forceFetchMessages: () => fetchMessages(true), // Force refetch for participants
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
