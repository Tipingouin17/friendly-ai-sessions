import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { processFacilitatorAvatar } from './utils/avatarProcessing';
import { resolveFacilitatorAvatar } from '@/utils/avatarUtils';
import { debugLog } from '@/utils/debugLogger';

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

  // Create static fallback template with enhanced context
  const createStaticFallbackMessage = useCallback(async (): Promise<Message | null> => {
    if (!conversationId) return null;

    const sessionTitle = conversation?.sessions?.title || 'this session';
    const facilitatorName = conversation?.sessions?.facilitator_details?.title || 'your facilitator';
    const objective = conversation?.sessions?.objective || 'facilitate meaningful discussion';
    const participantCount = conversation?.participants || 1;
    const participantDescription = conversation?.participant_description || 'participants';
    const facilitatorDetails = conversation?.sessions?.facilitator_details?.details || '';

    // Create contextual static message with facilitator personality
    let staticContent = `Welcome to ${sessionTitle}! I'm ${facilitatorName}, and I'm excited to have you join us today.\n\n`;
    
    if (facilitatorDetails) {
      staticContent += `A bit about me: ${facilitatorDetails}\n\n`;
    }
    
    if (objective) {
      staticContent += `Our objective for today is: ${objective}\n\n`;
    }
    
    if (participantCount > 1) {
      staticContent += `I see we have ${participantCount} ${participantDescription} here today. `;
    }
    
    staticContent += `To get us started, please introduce yourself and share what brings you to this session. What are you hoping to learn or contribute?\n\n`;
    staticContent += `I'm looking forward to our discussion and learning from each of your unique perspectives!`;

    // Get facilitator avatar
    const mockResponse = { avatar: null };
    const facilitatorAvatarUrl = await resolveFacilitatorAvatar(mockResponse, conversation);
    const processedAvatarUrl = processFacilitatorAvatar(facilitatorAvatarUrl);

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

    debugLog('all', 'Created enhanced static fallback welcome message');
    return fallbackMessage;
  }, [conversationId, conversation, welcomeMessage]);

  // Enhanced AI generation with full context
  const attemptAIGeneration = useCallback(async (attempt: number = 1): Promise<Message | null> => {
    if (!conversationId || !conversation) return null;

    try {
      debugLog('all', `Attempting AI welcome message generation with full context (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);

      // Prepare comprehensive context for AI generation
      const sessionContext = {
        sessionTitle: conversation?.sessions?.title,
        sessionObjective: conversation?.sessions?.objective,
        facilitatorName: conversation?.sessions?.facilitator_details?.title,
        facilitatorDetails: conversation?.sessions?.facilitator_details?.details,
        participantCount: conversation?.participants || 1,
        participantDescription: conversation?.participant_description,
        language: conversation?.language || 'en',
        sessionType: conversation?.sessions?.session_type || 'workshop'
      };

      const { data: aiResponse, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false,
          sessionContext
        }
      });

      if (error) {
        throw new Error(`AI generation failed: ${error.message}`);
      }

      if (!aiResponse?.content) {
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

      debugLog('all', 'Successfully generated AI welcome message with full context');
      setLastError(null);
      return aiMessage;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      debugLog('all', `AI generation attempt ${attempt} failed: ${errorMessage}`);
      setLastError(errorMessage);

      // Retry with exponential backoff
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
        debugLog('all', `Retrying AI generation in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptAIGeneration(attempt + 1);
      }

      return null;
    }
  }, [conversationId, conversation]);

  // Retrieve cached welcome message
  const getCachedWelcomeMessage = useCallback(() => {
    if (!conversationId) return null;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      const cachedMessageData = localStorage.getItem(storageKey);
      if (cachedMessageData) {
        return JSON.parse(cachedMessageData) as Message;
      }
      return null;
    } catch (e) {
      console.error('Error retrieving cached welcome message:', e);
      return null;
    }
  }, [conversationId]);

  // Cache welcome message
  const cacheWelcomeMessage = useCallback((welcomeMsg: Message) => {
    if (!conversationId) return;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(welcomeMsg));
    } catch (e) {
      console.error('Error caching welcome message:', e);
    }
  }, [conversationId]);

  // Main creation function with fallback
  const createWelcomeMessageWithFallback = useCallback(async (): Promise<Message | null> => {
    if (!conversationId) return null;

    setIsGenerating(true);
    setLastError(null);

    try {
      // First, try AI generation with full context
      const aiMessage = await attemptAIGeneration();
      
      if (aiMessage) {
        cacheWelcomeMessage(aiMessage);
        return aiMessage;
      }

      // If AI fails, use enhanced static fallback
      debugLog('all', 'AI generation failed, using enhanced static fallback');
      const fallbackMessage = await createStaticFallbackMessage();
      
      if (fallbackMessage) {
        cacheWelcomeMessage(fallbackMessage);
      }
      
      return fallbackMessage;

    } finally {
      setIsGenerating(false);
    }
  }, [conversationId, attemptAIGeneration, createStaticFallbackMessage, cacheWelcomeMessage]);

  return {
    getCachedWelcomeMessage,
    cacheWelcomeMessage,
    createWelcomeMessageWithFallback,
    isGenerating,
    lastError
  };
};
