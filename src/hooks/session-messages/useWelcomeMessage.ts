
import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { processFacilitatorAvatar } from './utils/avatarProcessing';
import { resolveFacilitatorAvatar } from '@/utils/avatarUtils';
import { debugLog } from '@/utils/debugLogger';

interface UseWelcomeMessageProps {
  conversationId: number | null;
  welcomeMessage?: string | null;
  isAdmin: boolean;
  conversation?: any; // Add conversation data
}

const WELCOME_MESSAGE_STORAGE_KEY = 'session_welcome_message_';

export const useWelcomeMessage = ({
  conversationId,
  welcomeMessage,
  isAdmin,
  conversation
}: UseWelcomeMessageProps) => {
  // Retrieve a cached welcome message
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
  
  // Cache a welcome message
  const cacheWelcomeMessage = useCallback((welcomeMsg: Message) => {
    if (!conversationId) return;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(welcomeMsg));
    } catch (e) {
      console.error('Error caching welcome message:', e);
    }
  }, [conversationId]);
  
  // Create a welcome message with proper avatar
  const createWelcomeMessage = useCallback(async (): Promise<Message | null> => {
    if (!welcomeMessage || !conversationId) return null;
    
    debugLog('all', 'Creating welcome message with conversation data');
    
    // Create a mock response object for avatar resolution
    const mockResponse = { avatar: null };
    
    // Get the facilitator avatar URL using the conversation data
    const facilitatorAvatarUrl = await resolveFacilitatorAvatar(mockResponse, conversation);
    
    // Process the URL to ensure it's correctly formatted
    const processedAvatarUrl = processFacilitatorAvatar(facilitatorAvatarUrl);
    
    const welcomeMsg: Message = {
      id: 'welcome',
      content: welcomeMessage,
      sender: 'assistant',
      timestamp: new Date(),
      created_at: new Date().toISOString(),
      avatar: processedAvatarUrl,
      isWelcomeMessage: true
    };
    
    debugLog('all', `Welcome message created with avatar: ${processedAvatarUrl}`);
    
    // Cache the welcome message
    cacheWelcomeMessage(welcomeMsg);
    
    return welcomeMsg;
  }, [welcomeMessage, conversationId, conversation, cacheWelcomeMessage]);

  return {
    getCachedWelcomeMessage,
    cacheWelcomeMessage,
    createWelcomeMessage
  };
};
