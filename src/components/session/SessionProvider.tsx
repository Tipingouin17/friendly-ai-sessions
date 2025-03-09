
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSessionState } from "@/hooks/useSessionState";
import { useSessionData } from "@/hooks/useSessionData";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionContextProps } from "@/types/session";
import { ConversationWithSession } from "@/types/database";
import { getCurrentParticipantId } from "@/utils/participantUtils";

interface SessionProviderProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
}

export const SessionProvider = ({ children, handleSessionFull, onError }: SessionProviderProps) => {
  const location = useLocation();
  const locationState = location.state as { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean 
  } | null;
  
  const [isSessionStartedInDB, setIsSessionStartedInDB] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  
  // Handle all errors in one place
  const handleInternalError = (errorMessage: string) => {
    console.error("Session provider error:", errorMessage);
    setProviderError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
  };
  
  const {
    currentConversationId,
    participants,
    setParticipants,
    sessionLink,
    showQrCodeView,
    conversation,
    isLoading: dataLoading,
    refetch,
    handleStartSession,
    error: dataError
  } = useSessionData();

  console.log("SessionProvider - conversation data:", conversation);
  console.log("SessionProvider - currentConversationId:", currentConversationId);
  console.log("SessionProvider - isLoading:", dataLoading);
  
  // Handle data errors
  useEffect(() => {
    if (dataError) {
      console.error("Session data error:", dataError.message);
      handleInternalError(dataError.message);
    }
  }, [dataError]);

  // Type assertion to ensure conversation is of the right type
  const typedConversation = conversation as ConversationWithSession | null;
  
  // Check if the session is marked as started in DB
  useEffect(() => {
    if (typedConversation?.session_started) {
      console.log("Session is marked as started in DB:", typedConversation.session_started);
      setIsSessionStartedInDB(true);
    } else {
      console.log("Session not marked as started in DB:", typedConversation);
    }
  }, [typedConversation]);

  // Determine the current participant ID based on user role
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState<number | null>(null);
  
  useEffect(() => {
    if (typedConversation) {
      const participantId = getCurrentParticipantId(locationState, typedConversation);
      console.log("Setting current participant ID:", participantId, "from state:", locationState);
      setCurrentUserParticipantId(participantId);
    }
  }, [typedConversation, locationState]);

  // Set up realtime updates for participants
  const { error: realtimeError } = useSessionRealtime({
    currentConversationId,
    participants,
    setParticipants,
    conversation: typedConversation,
    refetch,
    handleSessionFull,
    onSessionStarted: () => {
      console.log("Session started event received from realtime updates");
      setIsSessionStartedInDB(true);
    }
  });

  // Handle realtime errors
  useEffect(() => {
    if (realtimeError) {
      console.error("Session realtime error:", realtimeError);
      handleInternalError(realtimeError);
    }
  }, [realtimeError]);

  // Set up session state
  const sessionState = useSessionState({
    conversationId: currentConversationId,
    welcomeMessage: typedConversation?.sessions?.welcome_message ?? null,
    currentUserParticipantId
  });

  // Handle session state errors
  useEffect(() => {
    if (sessionState.error) {
      console.error("Session state error:", sessionState.error);
      handleInternalError(sessionState.error);
    }
  }, [sessionState.error]);

  // Set up anonymous state
  const anonymousState = useAnonymousState({
    conversationId: currentConversationId,
    currentParticipantId: currentUserParticipantId
  });

  // Set up message handling and interactions
  const {
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage,
    error: interactionsError
  } = useSessionInteractions({
    currentConversationId,
    sessionState,
    conversation: typedConversation,
    participants,
    isAnonymous: anonymousState.isAnonymous
  });

  // Handle interactions errors
  useEffect(() => {
    if (interactionsError) {
      console.error("Session interactions error:", interactionsError);
      handleInternalError(interactionsError);
    }
  }, [interactionsError]);

  // Combined loading state
  const isLoading = dataLoading;

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
    sessionLink,
    currentUserParticipantId,
    anonymousState,
    isSessionStartedInDB
  };

  // Provide error if we have one
  if (providerError) {
    sessionContext.error = providerError;
  }

  return (
    <>
      {children && children(sessionContext)}
    </>
  );
};
