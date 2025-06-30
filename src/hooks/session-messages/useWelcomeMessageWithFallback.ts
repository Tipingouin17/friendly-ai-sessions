
import { useState, useCallback } from 'react';
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

  // Enhanced: Create static fallback template with complete facilitator context
  const createStaticFallbackMessage = useCallback(async (): Promise<Message | null> => {
    if (!conversationId) return null;

    const fallbackStart = performance.now();
    logger.category('messages', `🎯 Creating enhanced static fallback for session: ${conversationId}`);

    // Enhanced facilitator context extraction
    const facilitatorFromSession = conversation?.sessions?.facilitator_details;
    const facilitatorDirect = conversation?.facilitator;
    const facilitator = facilitatorFromSession || facilitatorDirect;

    const facilitatorName = facilitator?.title || 'your facilitator';
    const facilitatorDetails = facilitator?.details || facilitator?.description || '';
    const facilitatorExpertise = facilitator?.expertise_level || '';
    const facilitatorSpecialties = Array.isArray(facilitator?.specialties) ? facilitator.specialties : [];

    // Session context
    const sessionTitle = conversation?.sessions?.title || 'this session';
    const objective = conversation?.sessions?.objective || 'facilitate meaningful discussion';
    const participantCount = conversation?.participants || 1;
    const participantDescription = conversation?.participant_description || 'participants';
    const sessionType = conversation?.sessions?.session_type || 'workshop';

    logger.category('messages', '📋 Enhanced fallback context extracted:', {
      facilitatorName,
      facilitatorDetails: facilitatorDetails.substring(0, 100) + '...',
      facilitatorExpertise,
      facilitatorSpecialtiesCount: facilitatorSpecialties.length,
      sessionTitle,
      objective: objective.substring(0, 100) + '...',
      participantCount,
      participantDescription,
      sessionType
    });

    // Create contextual static message with complete facilitator personality
    let staticContent = `Welcome to "${sessionTitle}"! I'm ${facilitatorName}, and I'm excited to have you join us today.\n\n`;
    
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

    // Get facilitator avatar
    const avatarStart = performance.now();
    const mockResponse = { avatar: null };
    const facilitatorAvatarUrl = await resolveFacilitatorAvatar(mockResponse, conversation);
    const processedAvatarUrl = processFacilitatorAvatar(facilitatorAvatarUrl);
    const avatarDuration = performance.now() - avatarStart;

    logger.category('messages', `🖼️ Avatar processing completed in ${avatarDuration.toFixed(2)}ms:`, {
      originalUrl: facilitatorAvatarUrl,
      processedUrl: processedAvatarUrl
    });

    const fallbackMessage: Message = {
      id: 'welcome-static',
      content: staticContent,
      sender: 'assistant',
      timestamp: new Date(),
      created_at: new Date().toISOString(),
      avatar: processedAvatarUrl,
      isWelcomeMessage: true,
      isFallback: true
    };

    const fallbackDuration = performance.now() - fallbackStart;
    logger.category('messages', `✅ Enhanced static fallback created in ${fallbackDuration.toFixed(2)}ms:`, {
      contentLength: staticContent.length,
      wordCount: staticContent.split(' ').length,
      hasAvatar: !!processedAvatarUrl,
      facilitatorName,
      sessionType
    });

    return fallbackMessage;
  }, [conversationId, conversation, logger]);

  // Enhanced: AI generation with complete facilitator and session context
  const attemptAIGeneration = useCallback(async (attempt: number = 1): Promise<Message | null> => {
    if (!conversationId || !conversation) return null;

    const aiStart = performance.now();
    
    try {
      logger.category('messages', `🤖 AI generation attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for session ${conversationId}`);

      // Enhanced: Prepare comprehensive context for AI generation with complete facilitator details
      const facilitatorFromSession = conversation?.sessions?.facilitator_details;
      const facilitatorDirect = conversation?.facilitator;
      const facilitator = facilitatorFromSession || facilitatorDirect;

      const sessionContext = {
        sessionTitle: conversation?.sessions?.title,
        sessionObjective: conversation?.sessions?.objective,
        sessionType: conversation?.sessions?.session_type || 'workshop',
        
        // Enhanced: Complete facilitator context
        facilitatorName: facilitator?.title || 'Facilitator',
        facilitatorDetails: facilitator?.details || facilitator?.description || '',
        facilitatorExpertise: facilitator?.expertise_level || '',
        facilitatorSpecialties: Array.isArray(facilitator?.specialties) ? facilitator.specialties : [],
        
        participantCount: conversation?.participants || 1,
        participantDescription: conversation?.participant_description,
        language: conversation?.language || 'en'
      };

      logger.category('messages', '🎯 AI generation with complete session context:', {
        ...sessionContext,
        facilitatorDetails: sessionContext.facilitatorDetails.substring(0, 100) + '...',
        sessionObjective: sessionContext.sessionObjective?.substring(0, 100) + '...'
      });

      const { data: aiResponse, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false,
          sessionContext,
          // Enhanced: Pass complete conversation data for facilitator context
          conversation: conversation
        }
      });

      const aiDuration = performance.now() - aiStart;

      if (error) {
        logger.error(`❌ AI generation attempt ${attempt} failed:`, {
          error,
          duration: aiDuration,
          sessionContext: sessionContext.facilitatorName
        });
        throw new Error(`AI generation failed: ${error.message}`);
      }

      if (!aiResponse?.content) {
        logger.error(`⚠️ AI response empty on attempt ${attempt}:`, {
          response: aiResponse,
          duration: aiDuration
        });
        throw new Error('AI response is empty');
      }

      // Create AI-generated message with enhanced context
      const aiMessage: Message = {
        id: 'welcome-ai',
        content: aiResponse.content,
        sender: 'assistant',
        timestamp: new Date(),
        created_at: new Date().toISOString(),
        avatar: aiResponse.avatar || '/api/avatar?name=Facilitator&variant=beam&palette=2',
        isWelcomeMessage: true,
        isAIGenerated: true
      };

      logger.category('messages', `✅ AI welcome message generated in ${aiDuration.toFixed(2)}ms:`, {
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
      
      logger.error(`💥 AI generation attempt ${attempt} failed in ${aiDuration.toFixed(2)}ms:`, {
        error: errorMessage,
        attempt,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        conversationId
      });
      
      setLastError(errorMessage);

      // Retry with exponential backoff
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
        logger.category('messages', `🔄 Retrying AI generation in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptAIGeneration(attempt + 1);
      }

      logger.error(`🚫 All AI generation attempts exhausted for session ${conversationId}`);
      return null;
    }
  }, [conversationId, conversation, logger]);

  // Retrieve cached welcome message
  const getCachedWelcomeMessage = useCallback(() => {
    if (!conversationId) return null;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      const cachedMessageData = localStorage.getItem(storageKey);
      if (cachedMessageData) {
        const cached = JSON.parse(cachedMessageData) as Message;
        logger.category('messages', `💾 Retrieved cached welcome message for session ${conversationId}:`, {
          messageId: cached.id,
          contentLength: cached.content.length,
          isAIGenerated: cached.isAIGenerated,
          isFallback: cached.isFallback
        });
        return cached;
      }
      logger.category('messages', `📭 No cached welcome message found for session ${conversationId}`);
      return null;
    } catch (e) {
      logger.error('💥 Error retrieving cached welcome message:', e);
      return null;
    }
  }, [conversationId, logger]);

  // Cache welcome message
  const cacheWelcomeMessage = useCallback((welcomeMsg: Message) => {
    if (!conversationId) return;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(welcomeMsg));
      logger.category('messages', `💾 Cached welcome message for session ${conversationId}:`, {
        messageId: welcomeMsg.id,
        isAIGenerated: welcomeMsg.isAIGenerated,
        isFallback: welcomeMsg.isFallback
      });
    } catch (e) {
      logger.error('💥 Error caching welcome message:', e);
    }
  }, [conversationId, logger]);

  // Main creation function with fallback
  const createWelcomeMessageWithFallback = useCallback(async (): Promise<Message | null> => {
    if (!conversationId) return null;

    const totalStart = performance.now();
    setIsGenerating(true);
    setLastError(null);

    logger.category('messages', `🚀 Starting welcome message creation for session ${conversationId}`);

    try {
      // First, try AI generation with complete context
      const aiMessage = await attemptAIGeneration();
      
      if (aiMessage) {
        cacheWelcomeMessage(aiMessage);
        const totalDuration = performance.now() - totalStart;
        logger.category('messages', `🎉 Welcome message created via AI in ${totalDuration.toFixed(2)}ms total`);
        return aiMessage;
      }

      // If AI fails, use enhanced static fallback with complete facilitator context
      logger.category('messages', '🔄 AI generation failed, using enhanced static fallback');
      const fallbackMessage = await createStaticFallbackMessage();
      
      if (fallbackMessage) {
        cacheWelcomeMessage(fallbackMessage);
        const totalDuration = performance.now() - totalStart;
        logger.category('messages', `🎯 Welcome message created via fallback in ${totalDuration.toFixed(2)}ms total`);
      }
      
      return fallbackMessage;

    } finally {
      const totalDuration = performance.now() - totalStart;
      logger.category('messages', `⏱️ Welcome message creation completed in ${totalDuration.toFixed(2)}ms`);
      setIsGenerating(false);
    }
  }, [conversationId, attemptAIGeneration, createStaticFallbackMessage, cacheWelcomeMessage, logger]);

  return {
    getCachedWelcomeMessage,
    cacheWelcomeMessage,
    createWelcomeMessageWithFallback,
    isGenerating,
    lastError
  };
};
