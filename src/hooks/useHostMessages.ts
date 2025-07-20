
import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { ParticipantInfo } from '@/types/chat';
import { ConversationWithSession } from '@/types/database';
import { useMessageSender } from '@/hooks/useMessageSender';
import { useToast } from '@/components/ui/use-toast';

interface UseHostMessagesProps {
  conversationId: number | null;
  participants: ParticipantInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationData: ConversationWithSession | null;
  // NEW: Host participant context
  isHostPage?: boolean;
  canSendMessages?: boolean;
  currentUserParticipantId?: number | null;
}

export function useHostMessages({
  conversationId,
  participants,
  messages,
  setMessages,
  conversationData,
  isHostPage = false,
  canSendMessages = false,
  currentUserParticipantId = null
}: UseHostMessagesProps) {
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const { toast } = useToast();

  // Create session state for message sender
  const sessionState = {
    messages,
    setMessages,
    inputMessage: '',
    setInputMessage: () => {}, // This will be overridden by the component using this
    currentParticipant: currentUserParticipantId || 1, // Use host participant ID or default to 1
    recordResponse: (participantId: number, hasResponded: boolean) => {
      console.log("🔄 Recording response:", { participantId, hasResponded });
    },
    totalResponses: 0,
    hasAnswered: false,
    viewMode: "participant" as const // Hosts participate as participants
  };

  // Enhanced message sender with host context
  const {
    isWaitingForResponse,
    isWaitingForResponses,
    responseCount,
    totalParticipants,
    currentUserHasResponded,
    handleSendMessage,
    error,
    startResponseCollection
  } = useMessageSender({
    currentConversationId: conversationId,
    sessionState,
    participants,
    isAnonymous: false, // Hosts are not anonymous
    conversation: conversationData,
    // NEW: Pass host context
    isHostPage,
    canSendMessages
  });

  const toggleSessionState = useCallback(() => {
    setIsSessionPaused(prev => {
      const newState = !prev;
      toast({
        title: newState ? "Session Paused" : "Session Resumed",
        description: newState 
          ? "The session has been paused. Participants will see a pause message."
          : "The session has been resumed. Participants can continue.",
      });
      return newState;
    });
  }, [toast]);

  const handleHostMessage = useCallback((message: string) => {
    console.log("🎙️ Host sending message:", message);
    // This will be handled by the message sender
    return handleSendMessage();
  }, [handleSendMessage]);

  const handleSendHostMessage = useCallback((
    message: string, 
    isPinned: boolean = false, 
    recipientId?: string
  ) => {
    console.log("📤 Host sending message:", { 
      message: message.substring(0, 50), 
      isPinned, 
      recipientId,
      canSendMessages,
      currentUserParticipantId 
    });

    if (!canSendMessages) {
      toast({
        title: "Cannot Send Message",
        description: "Host participant mode is not enabled yet. Please wait a moment.",
        variant: "destructive"
      });
      return;
    }

    // For now, we'll use the standard message sending
    // In the future, this could be enhanced for directed messages
    return handleSendMessage();
  }, [handleSendMessage, canSendMessages, currentUserParticipantId, toast]);

  const triggerFacilitatorResponse = useCallback(async () => {
    console.log("🤖 Triggering facilitator response from host interface");
    
    if (!conversationId) {
      console.error("❌ No conversation ID for facilitator response");
      return;
    }

    try {
      // This could trigger an AI response or other facilitator actions
      // For now, we'll log it
      console.log("🎯 Host requested facilitator response");
      
      toast({
        title: "Facilitator Response",
        description: "Facilitator response has been triggered.",
      });
    } catch (error) {
      console.error("❌ Error triggering facilitator response:", error);
      toast({
        title: "Error",
        description: "Failed to trigger facilitator response.",
        variant: "destructive"
      });
    }
  }, [conversationId, toast]);

  return {
    isSessionPaused,
    toggleSessionState,
    handleHostMessage,
    handleSendHostMessage,
    isWaitingForResponse,
    isWaitingForResponses,
    responseCount,
    totalParticipants,
    currentUserHasResponded,
    triggerFacilitatorResponse,
    error
  };
}
