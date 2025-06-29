
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
  totalParticipants?: number;
}

export const useSessionMessages = ({
  conversationId,
  currentUserParticipantId,
  isAdmin,
  welcomeMessage,
  conversation,
  totalParticipants = 1
}: UseSessionMessagesProps) => {
  // Use enhanced message fetching with database-first approach
  const {
    messages,
    setMessages,
    error,
    fetchMessages,
    isGeneratingWelcome,
    processNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse,
    clearWelcomeMessageCache
  } = useMessageFetching({
    conversationId,
    welcomeMessage,
    isAdmin,
    conversation,
    totalParticipants
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
  
  // Fetch messages when the conversation ID changes or session starts
  useEffect(() => {
    if (conversationId) {
      console.log("🔍 useSessionMessages - Fetching messages for conversation:", conversationId);
      fetchMessages();
    }
  }, [conversationId, welcomeMessage, conversation?.session_started, fetchMessages]);
  
  // Clear cache when conversation changes (ensures fresh AI generation for new sessions)
  useEffect(() => {
    if (conversationId && !isAdmin) {
      clearWelcomeMessageCache();
    }
  }, [conversationId, isAdmin, clearWelcomeMessageCache]);
  
  // Enhanced message handler that includes response processing
  const handleNewMessage = (message: Message) => {
    console.log("🔍 useSessionMessages - Processing new message:", {
      id: message.id,
      sender: message.sender,
      participant: message.participant,
      contentPreview: message.content.substring(0, 50) + "..."
    });
    
    processNewMessage(message);
    
    // Record response for tracking
    if (message.sender === 'user' && message.participant) {
      const participantId = parseInt(message.participant.replace('P', ''));
      recordResponse(participantId, true);
    }
  };
  
  // Auto-generate aggregated response when all participants respond
  useEffect(() => {
    if (isWaitingForResponses && responseCount >= totalParticipants && responseCount > 0) {
      console.log("🤖 All participants responded, generating aggregated AI response");
      generateAggregatedResponse().then((aggregatedMessage) => {
        if (aggregatedMessage) {
          console.log("✅ Generated aggregated response:", aggregatedMessage.content.substring(0, 100) + "...");
          handleNewMessage(aggregatedMessage);
        }
      }).catch((error) => {
        console.error("❌ Failed to generate aggregated response:", error);
      });
    }
  }, [isWaitingForResponses, responseCount, totalParticipants, generateAggregatedResponse]);
  
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
    isGeneratingWelcome,
    handleNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse
  };
};
