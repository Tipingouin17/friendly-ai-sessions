
import React from "react";
import { useSessionState } from "@/hooks/useSessionState";
import { useSessionData } from "@/hooks/useSessionData";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionContextProps } from "@/types/session";
import { ConversationWithSession } from "@/types/database";

interface SessionProviderProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
}

export const SessionProvider = ({ children, handleSessionFull }: SessionProviderProps) => {
  const {
    currentConversationId,
    participants,
    setParticipants,
    sessionLink,
    showQrCodeView,
    conversation,
    isLoading,
    refetch,
    handleStartSession,
  } = useSessionData();

  // Type assertion to ensure conversation is of the right type
  const typedConversation = conversation as ConversationWithSession | null;

  // Set up realtime updates for participants
  useSessionRealtime({
    currentConversationId,
    participants,
    setParticipants,
    conversation: typedConversation,
    refetch,
    handleSessionFull
  });

  // Set up session state
  const sessionState = useSessionState({
    conversationId: currentConversationId,
    welcomeMessage: typedConversation?.sessions?.welcome_message ?? null
  });

  // Set up message handling and interactions
  const {
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage
  } = useSessionInteractions({
    currentConversationId,
    sessionState,
    conversation: typedConversation,
    participants
  });

  const sessionContext: SessionContextProps = {
    isLoading,
    conversation: typedConversation,
    currentConversationId,
    sessionState,
    participants,
    participantColors,
    isWaitingForResponse,
    handleStartSession,
    handleSendMessage,
    handleLikeMessage,
    showQrCodeView,
    sessionLink
  };

  return (
    <>
      {children && children(sessionContext)}
    </>
  );
};
