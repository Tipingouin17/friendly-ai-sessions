
import { useState, useCallback, useMemo } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { processFacilitatorAvatar } from './utils/avatarProcessing';
import { resolveFacilitatorAvatar } from '@/utils/avatarUtils';
import { createLogger } from '@/utils/debugLogger';

interface UseWelcomeMessageWithFallbackProps {
  conversationId: number | null;
  welcomeMessage?: string | null;
  isAdmin: boolean;
  conversation?: any;
}

const WELCOME_MESSAGE_STORAGE_KEY = 'session_welcome_message_';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY = 1000; // 1 second

export const useWelcomeMessageWithFallback = ({
  conversationId,
  welcomeMessage,
  isAdmin,
  conversation
}: UseWelcomeMessageWithFallbackProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const logger = createLogger('WelcomeMessage', 'messages');

  // Memoize conversation data to prevent unnecessary re-computations
  const memoizedConversationData = useMemo(() => {
    if (!conversation) return null;
    return {
      id: conversation.id,
      sessions: conversation.sessions,
      participant_description: conversation.participant_description,
      language: conversation.language,
      participants: conversation.participants,
      facilitator: conversation.facilitator
    };
  }, [conversation?.id, conversation?.sessions, conversation?.participant_description, conversation?.language, conversation?.participants, conversation?.facilitator]);

  // Clear cached welcome message for new sessions or updated context
  const clearCachedWelcomeMessage = useCallback(() => {
    if (!conversationId) return;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      localStorage.removeItem(storageKey);
      console.log('🗑️ Cleared cached welcome message for session:', conversationId);
    } catch (e) {
      console.error('💥 Error clearing cached welcome message:', e);
    }
  }, [conversationId]);

  // Enhanced: Create static fallback template with complete facilitator context
  const createStaticFallbackMessage = useCallback(async (): Promise<Message | null> => {
    if (!conversationId) {
      console.log('⚠️ createStaticFallbackMessage: No conversation ID');
      return null;
    }

    const fallbackStart = performance.now();
    console.log('🎯 Creating enhanced static fallback for session:', conversationId);
    console.log('📋 Fallback generation - Full conversation context:', memoizedConversationData);

    // Enhanced facilitator context extraction with detailed debugging
    const facilitatorFromSession = memoizedConversationData?.sessions?.facilitator_details;
    const facilitatorDirect = memoizedConversationData?.facilitator;
    const facilitator = facilitatorFromSession || facilitatorDirect;

    console.log('👨‍🏫 Detailed facilitator context extraction:', {
      facilitatorFromSession,
      facilitatorDirect,
      finalFacilitator: facilitator,
      facilitatorKeys: facilitator ? Object.keys(facilitator) : [],
      sessionKeys: memoizedConversationData?.sessions ? Object.keys(memoizedConversationData.sessions) : [],
      conversationKeys: memoizedConversationData ? Object.keys(memoizedConversationData) : []
    });

    const facilitatorName = facilitator?.title || 'your facilitator';
    const facilitatorDetails = facilitator?.details || facilitator?.description || '';
    const facilitatorExpertise = facilitator?.expertise_level || '';
    const facilitatorSpecialties = Array.isArray(facilitator?.specialties) ? facilitator.specialties : [];

    // Session context with enhanced debugging
    const sessionTitle = memoizedConversationData?.sessions?.title || 'this session';
    const objective = memoizedConversationData?.sessions?.objective || 'facilitate meaningful discussion';
    const participantCount = memoizedConversationData?.participants || 1;
    const participantDescription = memoizedConversationData?.participant_description || 'participants';
    const sessionType = memoizedConversationData?.sessions?.session_type || 'workshop';

    console.log('📋 Enhanced fallback context extracted:', {
      facilitatorName,
      facilitatorDetails: facilitatorDetails.substring(0, 50) + '...',
      facilitatorExpertise,
      facilitatorSpecialtiesCount: facilitatorSpecialties.length,
      sessionTitle,
      objective: objective.substring(0, 50) + '...',
      participantCount,
      participantDescription,
      sessionType
    });

    // Create contextual static message with complete facilitator personality
    let staticContent = `Welcome to ${sessionTitle}! I'm ${facilitatorName}, and I'm excited to have you join us today.\n\n`;
    
    if (facilitatorDetails) {
      staticContent += `A bit about me: ${facilitatorDetails}\n\n`;
    }
    
    if (facilitatorExpertise) {
      staticContent += `With my ${facilitatorExpertise} level expertise`;
      if (facilitatorSpecialties.length > 0) {
        staticContent += ` in ${facilitatorSpecialties.join(', ')}`;
      }
      staticContent += `, I'm here to guide our discussion.\n\n`;
    }
    
    staticContent += `Our objective for today is: ${objective}\n\n`;
    
    if (participantCount > 1) {
      staticContent += `I see we have ${participantCount} ${participantDescription} here today. `;
    }
    
    // Enhanced: Tailor the message to the specific participant type
    if (participantDescription.toLowerCase().includes('squad') || participantDescription.toLowerCase().includes('team')) {
      staticContent += `To get us started, please introduce yourself and share your role in the team. What are you hoping to learn or contribute to improve our team dynamics?\n\n`;
    } else if (participantDescription.toLowerCase().includes('student') || participantDescription.toLowerCase().includes('learner')) {
      staticContent += `To get us started, please introduce yourself and share what brings you to this learning session. What are you hoping to learn or achieve?\n\n`;
    } else {
      staticContent += `To get us started, please introduce yourself and share what brings you to this session. What are you hoping to learn or contribute?\n\n`;
    }
    
    // Enhanced: Close with facilitator-specific context
    if (facilitatorDetails || facilitatorExpertise) {
      staticContent += `I'm looking forward to using my experience to help facilitate our discussion and learning from each of your unique perspectives!`;
    } else {
      staticContent += `I'm looking forward to our discussion and learning from each of your unique perspectives!`;
    }

    console.log('📝 Generated enhanced static fallback content:', {
      contentLength: staticContent.length,
      wordCount: staticContent.split(' ').length,
      includesFacilitatorName: staticContent.includes(facilitatorName),
      includesSessionTitle: staticContent.includes(sessionTitle),
      includesObjective: staticContent.includes(objective),
      includesFacilitatorDetails: facilitatorDetails ? staticContent.includes(facilitatorDetails.substring(0, 20)) : false
    });

    // Get facilitator avatar
    const avatarStart = performance.now();
    const mockResponse = { avatar: null };
    const facilitatorAvatarUrl = await resolveFacilitatorAvatar(mockResponse, memoizedConversationData);
    const processedAvatarUrl = processFacilitatorAvatar(facilitatorAvatarUrl);
    const avatarDuration = performance.now() - avatarStart;

    console.log('🖼️ Avatar processing completed:', {
      duration: avatarDuration.toFixed(2) + 'ms',
      originalUrl: facilitatorAvatarUrl,
      processedUrl: processedAvatarUrl
    });

    const fallbackMessage: Message = {
      id: 'welcome-static-enhanced',
      content: staticContent,
      sender: 'assistant',
      timestamp: new Date(),
      created_at: new Date().toISOString(),
      avatar: processedAvatarUrl,
      isWelcomeMessage: true,
      isFallback: true,
      isEnhanced: true // Mark as enhanced fallback
    };

    const fallbackDuration = performance.now() - fallbackStart;
    console.log('✅ Enhanced static fallback created:', {
      duration: fallbackDuration.toFixed(2) + 'ms',
      contentLength: staticContent.length,
      wordCount: staticContent.split(' ').length,
      hasAvatar: !!processedAvatarUrl,
      facilitatorName,
      sessionType,
      isEnhanced: true
    });

    return fallbackMessage;
  }, [conversationId, memoizedConversationData, welcomeMessage, logger]);

  // Enhanced: AI generation with complete facilitator and session context
  const attemptAIGeneration = useCallback(async (attempt: number = 1): Promise<Message | null> => {
    // Enhanced validation - ensure we have both conversation ID and conversation data
    if (!conversationId) {
      console.log('⚠️ attemptAIGeneration: Missing conversation ID');
      return null;
    }

    if (!memoizedConversationData) {
      console.log('⚠️ attemptAIGeneration: Missing conversation data - will use fallback');
      return null;
    }

    const aiStart = performance.now();
    
    try {
      console.log('🤖 AI generation attempt', attempt, 'of', MAX_RETRY_ATTEMPTS, 'for session', conversationId);
      console.log('🤖 AI generation - Full conversation context being sent:', {
        conversationStructure: {
          id: memoizedConversationData?.id,
          hasSession: !!memoizedConversationData?.sessions,
          sessionKeys: memoizedConversationData?.sessions ? Object.keys(memoizedConversationData.sessions) : [],
          hasFacilitatorDetails: !!memoizedConversationData?.sessions?.facilitator_details,
          facilitatorDetailsKeys: memoizedConversationData?.sessions?.facilitator_details ? Object.keys(memoizedConversationData.sessions.facilitator_details) : []
        }
      });

      // Enhanced: Prepare comprehensive context for AI generation with complete facilitator details
      const facilitatorFromSession = memoizedConversationData?.sessions?.facilitator_details;
      const facilitatorDirect = memoizedConversationData?.facilitator;
      const facilitator = facilitatorFromSession || facilitatorDirect;

      const sessionContext = {
        sessionTitle: memoizedConversationData?.sessions?.title,
        sessionObjective: memoizedConversationData?.sessions?.objective,
        sessionType: memoizedConversationData?.sessions?.session_type || 'workshop',
        
        // Enhanced: Complete facilitator context
        facilitatorName: facilitator?.title || 'Facilitator',
        facilitatorDetails: facilitator?.details || facilitator?.description || '',
        facilitatorExpertise: facilitator?.expertise_level || '',
        facilitatorSpecialties: Array.isArray(facilitator?.specialties) ? facilitator.specialties : [],
        
        participantCount: memoizedConversationData?.participants || 1,
        participantDescription: memoizedConversationData?.participant_description,
        language: memoizedConversationData?.language || 'en'
      };

      console.log('🎯 AI generation with complete session context:', sessionContext);

      const edgeFunctionParams = {
        messages: [],
        conversationId,
        sessionStart: true,
        generateReport: false,
        sessionContext,
        // Enhanced: Pass complete conversation data for facilitator context
        conversation: memoizedConversationData
      };

      console.log('📡 Calling edge function with enhanced params for session:', conversationId);

      const { data: aiResponse, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: edgeFunctionParams
      });

      const aiDuration = performance.now() - aiStart;

      console.log('📡 Edge function response for session', conversationId, ':', {
        duration: aiDuration.toFixed(2) + 'ms',
        hasError: !!error,
        error: error?.message,
        hasResponse: !!aiResponse,
        responseContent: aiResponse?.content ? aiResponse.content.substring(0, 100) + '...' : null,
        attempt
      });

      if (error) {
        console.error('❌ AI generation attempt', attempt, 'failed with error:', error);
        throw new Error(`AI generation failed: ${error.message}`);
      }

      if (!aiResponse?.content) {
        console.error('⚠️ AI response empty on attempt', attempt, '- response:', aiResponse);
        throw new Error('AI response is empty');
      }

      // Create AI-generated message with enhanced context
      const aiMessage: Message = {
        id: 'welcome-ai-enhanced',
        content: aiResponse.content,
        sender: 'assistant',
        timestamp: new Date(),
        created_at: new Date().toISOString(),
        avatar: aiResponse.avatar || '/api/avatar?name=Facilitator&variant=beam&palette=2',
        isWelcomeMessage: true,
        isAIGenerated: true
      };

      console.log('✅ AI welcome message generated successfully for session', conversationId, ':', {
        duration: aiDuration.toFixed(2) + 'ms',
        contentLength: aiResponse.content.length,
        generationMethod: aiResponse.metrics?.generationMethod,
        hasAvatar: !!aiResponse.avatar,
        facilitatorContext: !!aiResponse.facilitator_context,
        sessionContext: !!aiResponse.session_context
      });

      setLastError(null);
      return aiMessage;

    } catch (error) {
      const aiDuration = performance.now() - aiStart;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('💥 AI generation attempt', attempt, 'failed for session', conversationId, ':', {
        error: errorMessage,
        duration: aiDuration.toFixed(2) + 'ms',
        attempt,
        maxAttempts: MAX_RETRY_ATTEMPTS
      });
      
      setLastError(errorMessage);

      // Retry with exponential backoff
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
        console.log('🔄 Retrying AI generation for session', conversationId, 'in', delay + 'ms...');
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptAIGeneration(attempt + 1);
      }

      console.error('🚫 All AI generation attempts exhausted for session', conversationId);
      return null;
    }
  }, [conversationId, memoizedConversationData, logger]);

  // Retrieve cached welcome message with version checking
  const getCachedWelcomeMessage = useCallback(() => {
    if (!conversationId) return null;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      const cachedMessageData = localStorage.getItem(storageKey);
      if (cachedMessageData) {
        const cached = JSON.parse(cachedMessageData) as Message;
        
        // Check if cached message is outdated or generic
        const isGenericFallback = cached.id === 'welcome-static' && !cached.isEnhanced;
        
        if (isGenericFallback) {
          console.log('🗑️ Removing outdated cached welcome message for session', conversationId);
          localStorage.removeItem(storageKey);
          return null;
        }
        
        console.log('💾 Retrieved cached welcome message for session', conversationId, ':', {
          messageId: cached.id,
          contentLength: cached.content.length,
          isAIGenerated: cached.isAIGenerated,
          isFallback: cached.isFallback,
          isEnhanced: cached.isEnhanced
        });
        return cached;
      }
      console.log('📭 No cached welcome message found for session', conversationId);
      return null;
    } catch (e) {
      console.error('💥 Error retrieving cached welcome message for session', conversationId, ':', e);
      return null;
    }
  }, [conversationId, logger]);

  // Cache welcome message with session-specific versioning
  const cacheWelcomeMessage = useCallback((welcomeMsg: Message) => {
    if (!conversationId) return;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      // Add session context hash for cache invalidation
      const messageWithContext = {
        ...welcomeMsg,
        sessionVersion: conversationId,
        cachedAt: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(messageWithContext));
      console.log('💾 Cached welcome message for session', conversationId, ':', {
        messageId: welcomeMsg.id,
        isAIGenerated: welcomeMsg.isAIGenerated,
        isFallback: welcomeMsg.isFallback,
        isEnhanced: welcomeMsg.isEnhanced
      });
    } catch (e) {
      console.error('💥 Error caching welcome message for session', conversationId, ':', e);
    }
  }, [conversationId, logger]);

  // Main creation function with enhanced fallback and AI retry logic
  const createWelcomeMessageWithFallback = useCallback(async (): Promise<Message | null> => {
    if (!conversationId) {
      console.log('⚠️ createWelcomeMessageWithFallback: No conversation ID');
      return null;
    }

    const totalStart = performance.now();
    setIsGenerating(true);
    setLastError(null);

    console.log('🚀 Starting welcome message creation for session', conversationId);
    console.log('📋 Welcome message creation - Full context:', {
      conversationId,
      hasConversation: !!memoizedConversationData,
      conversationKeys: memoizedConversationData ? Object.keys(memoizedConversationData) : [],
      facilitatorPath: memoizedConversationData?.sessions?.facilitator_details ? 'sessions.facilitator_details' : 'direct',
      welcomeMessage,
      isAdmin
    });

    try {
      // Clear any outdated cache first
      const existingCache = getCachedWelcomeMessage();
      if (existingCache && existingCache.id === 'welcome-static' && !existingCache.isEnhanced) {
        console.log('🗑️ Clearing outdated cache for session', conversationId);
        clearCachedWelcomeMessage();
      }

      // Try AI generation first if we have conversation data
      if (memoizedConversationData) {
        console.log('🤖 Attempting AI generation for session', conversationId, '...');
        const aiMessage = await attemptAIGeneration();
        
        if (aiMessage) {
          cacheWelcomeMessage(aiMessage);
          const totalDuration = performance.now() - totalStart;
          console.log('🎉 Welcome message created via AI for session', conversationId, ':', {
            totalDuration: totalDuration.toFixed(2) + 'ms',
            contentLength: aiMessage.content.length
          });
          return aiMessage;
        }
      } else {
        console.log('⚠️ No conversation data available for AI generation, using fallback');
      }

      // If AI fails or no conversation data, use enhanced static fallback
      console.log('🔄 AI generation failed or unavailable for session', conversationId, ', using enhanced static fallback');
      const fallbackMessage = await createStaticFallbackMessage();
      
      if (fallbackMessage) {
        cacheWelcomeMessage(fallbackMessage);
        const totalDuration = performance.now() - totalStart;
        console.log('🎯 Welcome message created via enhanced fallback for session', conversationId, ':', {
          totalDuration: totalDuration.toFixed(2) + 'ms',
          contentLength: fallbackMessage.content.length,
          isEnhanced: true
        });
      }
      
      return fallbackMessage;

    } finally {
      const totalDuration = performance.now() - totalStart;
      console.log('⏱️ Welcome message creation completed for session', conversationId, ':', {
        duration: totalDuration.toFixed(2) + 'ms'
      });
      setIsGenerating(false);
    }
  }, [conversationId, attemptAIGeneration, createStaticFallbackMessage, cacheWelcomeMessage, getCachedWelcomeMessage, clearCachedWelcomeMessage, logger, memoizedConversationData]);

  return {
    getCachedWelcomeMessage,
    cacheWelcomeMessage,
    createWelcomeMessageWithFallback,
    clearCachedWelcomeMessage,
    isGenerating,
    lastError
  };
};
