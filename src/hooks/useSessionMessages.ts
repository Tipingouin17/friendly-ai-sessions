
import { useEffect } from 'react';
import { Message } from '@/types/chat';
import { useResponseTracking } from './session-messages/useResponseTracking';
import { useMessageFetching } from './session-messages/useMessageFetching';
import { useViewMode } from './session-messages/useViewMode';

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
  // Use our more focused hooks
  const {
    messages,
    setMessages,
    error,
    fetchMessages,
    isGeneratingWelcome
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
  
  // Fetch messages when the conversation ID changes
  useEffect(() => {
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
    setViewMode,
    isGeneratingWelcome
  };
};
