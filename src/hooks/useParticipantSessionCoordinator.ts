
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
    connectionHealthy
  } = useCoordinatedSessionData({
    conversationId,
    isAdmin: false
  });

  // Handle session start
  const handleSessionStart = useCallback(() => {
    logger.category('participants', 'Session started - participant view updating');
    setSessionStarted(true);
    // Refresh data to get welcome message
    setTimeout(() => refetch(), 500); // Small delay to ensure message is saved
  }, [refetch, logger]);

  // Handle new messages with immediate update
  const handleNewMessage = useCallback((message: Message) => {
    logger.category('participants', `New message received via realtime: ${message.content?.substring(0, 50)}...`);
    
    // Add message immediately for real-time feel
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      const newMessages = [...prev, message].sort((a, b) => 
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );
      return newMessages;
    });
    
    // Also refresh coordinated data to ensure consistency
    setTimeout(() => refetch(), 100);
  }, [logger, refetch]);

  // Set up real-time coordination
  const { connectionStatus, isConnected } = useSessionRealtime({
    conversationId,
    onSessionStart: handleSessionStart,
    onNewMessage: handleNewMessage,
    isAdmin: false
  });

  // Sync with coordinated messages (but don't replace real-time updates)
  useEffect(() => {
    if (coordinatedMessages.length > 0) {
      setMessages(prevMessages => {
        // Merge coordinated messages with any real-time messages
        const allMessages = [...coordinatedMessages];
        
        // Add any real-time messages that might not be in coordinated data yet
        prevMessages.forEach(rtMessage => {
          if (!allMessages.some(m => m.id === rtMessage.id)) {
            allMessages.push(rtMessage);
          }
        });
        
        // Sort by timestamp
        return allMessages.sort((a, b) => 
          new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
        );
      });
    }
  }, [coordinatedMessages]);

  // Check if session is already started
  useEffect(() => {
    if (conversation?.session_started && !sessionStarted) {
      setSessionStarted(true);
    }
  }, [conversation?.session_started, sessionStarted]);

  return {
    sessionStarted,
    messages,
    conversation,
    isLoading,
    error,
    connectionHealthy,
    isConnected,
    connectionStatus,
    refetch
  };
};
