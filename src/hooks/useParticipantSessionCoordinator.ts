
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
  const logger = createLogger('ParticipantCoordinator', 'participant');

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
    logger.category('participant', 'Session started - participant view updating');
    setSessionStarted(true);
    // Refresh data to get welcome message
    refetch();
  }, [refetch, logger]);

  // Handle new messages
  const handleNewMessage = useCallback((message: Message) => {
    logger.category('participant', 'New message received via realtime');
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, [logger]);

  // Set up real-time coordination
  const { connectionStatus, isConnected } = useSessionRealtime({
    conversationId,
    onSessionStart: handleSessionStart,
    onNewMessage: handleNewMessage,
    isAdmin: false
  });

  // Sync with coordinated messages
  useEffect(() => {
    if (coordinatedMessages.length > 0) {
      setMessages(coordinatedMessages);
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
