
import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types/chat';
import { useSessionRealtime } from './useSessionRealtime';
import { useCoordinatedSessionData } from './useCoordinatedSessionData';
import { createLogger } from '@/utils/debugLogger';

interface UseParticipantSessionCoordinatorProps {
  conversationId: number | null;
  currentUserParticipantId: number | null;
}

export const useParticipantSessionCoordinator = ({
  conversationId,
  currentUserParticipantId
}: UseParticipantSessionCoordinatorProps) => {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const logger = createLogger('ParticipantCoordinator', 'participants');

  // Get coordinated session data
  const {
    messages: coordinatedMessages,
    conversation,
    isLoading,
    error,
    refetch,
    refetchMessages,
    connectionHealthy
  } = useCoordinatedSessionData({
    conversationId,
    isAdmin: false
  });

  // Handle session start - just update state, don't navigate
  const handleSessionStart = useCallback(() => {
    logger.category('participants', 'Session started - updating participant view state');
    setSessionStarted(true);
    
    // Immediately refetch messages to get the welcome message
    refetchMessages();
  }, [refetchMessages, logger]);

  // Handle new messages with immediate update and coordination  
  const handleNewMessage = useCallback((message: Message) => {
    logger.category('participants', `New message received via realtime: ${message.content?.substring(0, 50)}...`);
    
    // Add message immediately for real-time feel
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      
      const newMessages = [...prev, message].sort((a, b) => 
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );
      
      logger.category('participants', `Updated messages count: ${newMessages.length}`);
      return newMessages;
    });
    
    // Also trigger a quick refetch to ensure consistency
    setTimeout(() => refetchMessages(), 200);
  }, [logger, refetchMessages]);

  // Set up real-time coordination
  const { connectionStatus, isConnected } = useSessionRealtime({
    conversationId,
    onSessionStart: handleSessionStart,
    onNewMessage: handleNewMessage,
    isAdmin: false
  });

  // Sync with coordinated messages and merge real-time updates
  useEffect(() => {
    if (coordinatedMessages.length > 0) {
      setMessages(prevMessages => {
        // Create a map of existing real-time messages
        const realtimeMessageIds = new Set(prevMessages.map(m => m.id));
        
        // Start with coordinated messages as base
        const mergedMessages = [...coordinatedMessages];
        
        // Add any real-time messages that aren't in coordinated data yet
        prevMessages.forEach(rtMessage => {
          if (!mergedMessages.some(m => m.id === rtMessage.id)) {
            mergedMessages.push(rtMessage);
          }
        });
        
        // Sort by timestamp
        const sortedMessages = mergedMessages.sort((a, b) => 
          new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
        );
        
        logger.category('participants', `Merged messages: ${sortedMessages.length} total (${coordinatedMessages.length} coordinated, ${prevMessages.length} realtime)`);
        return sortedMessages;
      });
    }
  }, [coordinatedMessages, logger]);

  // Check if session is already started
  useEffect(() => {
    if (conversation?.session_started && !sessionStarted) {
      logger.category('participants', 'Session already started - updating state');
      setSessionStarted(true);
    }
  }, [conversation?.session_started, sessionStarted, logger]);

  // Auto-refresh messages when session starts
  useEffect(() => {
    if (sessionStarted && conversationId) {
      logger.category('participants', 'Session started - triggering message refresh');
      // Wait a moment for the welcome message to be saved, then refetch
      setTimeout(() => refetchMessages(), 500);
    }
  }, [sessionStarted, conversationId, refetchMessages, logger]);

  return {
    sessionStarted,
    messages,
    conversation,
    isLoading,
    error,
    connectionHealthy,
    isConnected,
    connectionStatus,
    refetch,
    refetchMessages
  };
};
