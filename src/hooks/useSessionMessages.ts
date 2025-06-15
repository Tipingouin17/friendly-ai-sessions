
import { useEffect, useState } from 'react';
import { Message } from '@/types/chat';
import { useResponseTracking } from './session-messages/useResponseTracking';
import { useMessageFetching } from './session-messages/useMessageFetching';
import { useViewMode } from './session-messages/useViewMode';
import { useSessionStartListener } from './useSessionStartListener';
import { useMessagePolling } from './useMessagePolling';
import { debugLog } from '@/utils/debugLogger';

interface UseSessionMessagesProps {
  conversationId: number | null;
  currentUserParticipantId: number | null;
  isAdmin: boolean;
  welcomeMessage?: string | null;
  conversation?: any;
}

export const useSessionMessages = ({
  conversationId,
  currentUserParticipantId,
  isAdmin,
  welcomeMessage,
  conversation
}: UseSessionMessagesProps) => {
  const [isSessionJustStarted, setIsSessionJustStarted] = useState(false);
  
  // Use our focused hooks
  const {
    messages,
    setMessages,
    error,
    fetchMessages,
    forceRefreshMessages
  } = useMessageFetching({
    conversationId,
    welcomeMessage,
    isAdmin,
    conversation
  });
  
  const {
    currentParticipant,
    hasAnswered,
    totalResponses,
    recordResponse
  } = useResponseTracking({
    currentUserParticipantId
  });
  
  const {
    viewMode,
    setViewMode
  } = useViewMode({
    isAdmin
  });
  
  // Handle session start for participants
  const handleSessionStarted = () => {
    debugLog('all', 'Session start detected - refreshing messages');
    setIsSessionJustStarted(true);
    
    // Immediately fetch messages
    forceRefreshMessages();
    
    // Stop the "just started" state after a delay
    setTimeout(() => {
      setIsSessionJustStarted(false);
    }, 30000); // 30 seconds
  };
  
  // Listen for session start events (participants only)
  useSessionStartListener({
    conversationId,
    onSessionStarted: handleSessionStarted,
    isParticipant: !isAdmin
  });
  
  // Use polling as backup for real-time failures
  useMessagePolling({
    fetchMessages: forceRefreshMessages,
    isSessionJustStarted,
    enabled: !isAdmin && !!conversationId
  });
  
  // Initial fetch when conversation ID changes
  useEffect(() => {
    debugLog('all', 'Conversation ID changed, fetching messages');
    fetchMessages();
  }, [conversationId, welcomeMessage, conversation, fetchMessages]);
  
  return {
    messages,
    setMessages,
    error,
    currentParticipant,
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode,
    setViewMode
  };
};
