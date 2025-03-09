
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SessionContextProps } from "@/types/session";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";
import { useSessionProviderState } from "@/hooks/useSessionProviderState";
import { useSessionParticipantSetup } from "@/hooks/useSessionParticipantSetup";
import { useSessionMonitoring } from "@/hooks/useSessionMonitoring";

interface SessionProviderCoreProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
}

export const SessionProviderCore = ({ 
  children, 
  handleSessionFull, 
  onError 
}: SessionProviderCoreProps) => {
  const location = useLocation();
  const locationState = location.state as { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean 
  } | null;
  
  // Load core provider state
  const {
    currentConversationId,
    conversation,
    isLoading,
    refetch,
    showQrCodeView,
    sessionLink,
    isSessionStarted,
    dataError,
    providerError,
    handleError,
    enhancedHandleStartSession
  } = useSessionProviderState({ onError });

  // Handle data errors
  useEffect(() => {
    if (dataError) {
      console.error("Session data error:", dataError);
      handleError(dataError);
    }
  }, [dataError, handleError]);

  // Set up participant management
  const {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession
  } = useSessionParticipantSetup({
    conversationId: currentConversationId,
    conversation,
    locationState,
    refetch,
    onError: handleError,
    onSessionFull: handleSessionFull
  });

  // Set up session monitoring
  const {
    isSessionStartedInDB,
    roomState
  } = useSessionMonitoring({
    conversation,
    conversationId: currentConversationId,
    currentUserParticipantId,
    participants,
    onError: handleError
  });

  // If we have serious errors, return error fallback
  if (providerError) {
    return (
      <SessionProviderErrorFallback errorMessage={providerError}>
        {children}
      </SessionProviderErrorFallback>
    );
  }

  // Build session context
  const sessionContext: SessionContextProps = {
    isLoading,
    conversation,
    currentConversationId,
    sessionState: {
      messages: roomState.messages,
      inputMessage: roomState.inputMessage,
      setInputMessage: roomState.setInputMessage,
      currentParticipant: roomState.currentParticipant,
      isRecording: roomState.isRecording,
      setIsRecording: roomState.setIsRecording,
      handleGenerateReport: roomState.handleGenerateReport,
      isGeneratingReport: roomState.isGeneratingReport,
      setMessages: roomState.setMessages,
      hasAnswered: roomState.hasAnswered,
      totalResponses: roomState.totalResponses,
      viewMode: roomState.viewMode,
      setViewMode: roomState.setViewMode,
      recordResponse: roomState.recordResponse,
      error: roomState.error
    },
    participants,
    participantColors,
    isWaitingForResponse: roomState.isWaitingForResponse,
    handleStartSession: enhancedHandleStartSession,
    handleSendMessage: roomState.handleSendMessage,
    handleLikeMessage: roomState.handleLikeMessage,
    showQrCodeView,
    sessionLink,
    currentUserParticipantId,
    anonymousState: roomState.anonymousState,
    isSessionStartedInDB,
    error: providerError,
    
    // Add connection properties
    isConnected: true, // Default to true, will be updated by connection hooks
    connectionAttempts: 0,
    refetch
  };

  // Return children with context
  return children(sessionContext);
};
