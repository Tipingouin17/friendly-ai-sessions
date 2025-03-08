
import React from "react";
import { useSessionState } from "@/hooks/useSessionState";
import { useSessionData } from "@/hooks/useSessionData";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionContextProps } from "@/types/session";

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

  // Set up realtime updates for participants
  useSessionRealtime({
    currentConversationId,
    participants,
    setParticipants,
    conversation,
    refetch,
    handleSessionFull
  });

  // Set up session state
  const sessionState = useSessionState({
    conversationId: currentConversationId,
    welcomeMessage: conversation?.sessions?.welcome_message ?? null
  });

  // Set up message handling and interactions
  const {
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage
  } = useSessionInteractions({
    currentConversationId,
    sessionState,
    conversation,
    participants
  });

  const sessionContext: SessionContextProps = {
    isLoading,
    conversation,
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
