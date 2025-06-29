
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

export const useWelcomeMessageWithFallback = ({
  conversationId,
  welcomeMessage,
  isAdmin,
  conversation
}: UseWelcomeMessageWithFallbackProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const logger = createLogger('WelcomeMessage', 'messages');

  // Enhanced: Create static fallback only as last resort
  const createStaticFallbackMessage = useCallback(async (): Promise<Message | null> => {
    if (!conversationId) return null;

    const fallbackStart = performance.now();
    logger.category('messages', `🎯 Creating emergency static fallback for session: ${conversationId}`);

    // Enhanced facilitator context extraction
    const facilitatorFromSession = conversation?.sessions?.facilitator_details;
    const facilitatorDirect = conversation?.facilitator;
    const facilitator = facilitatorFromSession || facilitatorDirect;

    const facilitatorName = facilitator?.title || 'your facilitator';
    const facilitatorDetails = facilitator?.details || facilitator?.description || '';
    const sessionTitle = conversation?.sessions?.title || 'this session';
    const objective = conversation?.sessions?.objective || 'facilitate meaningful discussion';
    const participantCount = conversation?.participants || 1;
    const participantDescription = conversation?.participant_description || 'participants';

    // Create minimal contextual message as emergency fallback
    let staticContent = `Welcome to ${sessionTitle}! I'm ${facilitatorName}, and I'm excited to have you join us today.\n\n`;
    
    if (facilitatorDetails) {
      staticContent += `${facilitatorDetails}\n\n`;
    }
    
    staticContent += `Our objective for today is: ${objective}\n\n`;
    staticContent += `To get us started, please introduce yourself and share what brings you to this session.`;

    // Get facilitator avatar
    const mockResponse = { avatar: null };
    const facilitatorAvatarUrl = await resolveFacilitatorAvatar(mockResponse, conversation);
    const processedAvatarUrl = processFacilitatorAvatar(facilitatorAvatarUrl);

    const fallbackMessage: Message = {
      id: 'welcome-emergency-fallback',
      content: staticContent,
      sender: 'assistant',
      timestamp: new Date(),
      created_at: new Date().toISOString(),
      avatar: processedAvatarUrl,
      isWelcomeMessage: true,
      isFallback: true
    };

    const fallbackDuration = performance.now() - fallbackStart;
    logger.category('messages', `⚠️ Emergency static fallback created in ${fallbackDuration.toFixed(2)}ms`, {
      contentLength: staticContent.length,
      facilitatorName
    });

    return fallbackMessage;
  }, [conversationId, conversation, logger]);

  // Clear cache to force fresh generation
  const clearWelcomeMessageCache = useCallback(() => {
    if (!conversationId) return;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      localStorage.removeItem(storageKey);
      logger.category('messages', `🗑️ Cleared welcome message cache for session ${conversationId}`);
    } catch (e) {
      logger.error('💥 Error clearing welcome message cache:', e);
    }
  }, [conversationId, logger]);

  // Retrieve cached welcome message (only if recent and valid)
  const getCachedWelcomeMessage = useCallback(() => {
    if (!conversationId) return null;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      const cachedMessageData = localStorage.getItem(storageKey);
      if (cachedMessageData) {
        const cached = JSON.parse(cachedMessageData) as Message;
        // Only return cache if it's not an old static fallback
        if (!cached.isFallback || cached.isAIGenerated) {
          logger.category('messages', `💾 Retrieved valid cached welcome message for session ${conversationId}`);
          return cached;
        } else {
          // Clear old static fallback cache
          localStorage.removeItem(storageKey);
          logger.category('messages', `🗑️ Removed old static fallback cache for session ${conversationId}`);
        }
      }
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
      logger.category('messages', `💾 Cached welcome message for session ${conversationId}`);
    } catch (e) {
      logger.error('💥 Error caching welcome message:', e);
    }
  }, [conversationId, logger]);

  // AI generation should now happen during session start, not here
  // This hook primarily handles cache management and emergency fallbacks
  const createWelcomeMessageWithFallback = useCallback(async (): Promise<Message | null> => {
    if (!conversationId) return null;

    const totalStart = performance.now();
    setIsGenerating(true);
    setLastError(null);

    logger.category('messages', `🔍 Looking for welcome message for session ${conversationId}`);

    try {
      // First, check for valid cached message
      const cachedMessage = getCachedWelcomeMessage();
      if (cachedMessage && !cachedMessage.isFallback) {
        logger.category('messages', '💾 Using valid cached welcome message');
        return cachedMessage;
      }

      // For participants, we should primarily rely on database messages
      // If no database message exists, create emergency fallback
      logger.category('messages', '⚠️ No AI-generated welcome message found, creating emergency fallback');
      const fallbackMessage = await createStaticFallbackMessage();
      
      if (fallbackMessage) {
        // Don't cache emergency fallbacks permanently
        const totalDuration = performance.now() - totalStart;
        logger.category('messages', `⚠️ Emergency fallback created in ${totalDuration.toFixed(2)}ms`);
      }
      
      return fallbackMessage;

    } catch (error) {
      logger.error('💥 Error in welcome message creation:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      const totalDuration = performance.now() - totalStart;
      logger.category('messages', `⏱️ Welcome message process completed in ${totalDuration.toFixed(2)}ms`);
      setIsGenerating(false);
    }
  }, [conversationId, getCachedWelcomeMessage, createStaticFallbackMessage, logger]);

  return {
    getCachedWelcomeMessage,
    cacheWelcomeMessage,
    createWelcomeMessageWithFallback,
    clearWelcomeMessageCache,
    isGenerating,
    lastError
  };
};
