
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionContextProps } from "@/types/session";
import { useSessionProviderState } from "@/hooks/useSessionProviderState";
import { useSessionParticipantSetup } from "@/hooks/useSessionParticipantSetup";
import { useSessionMonitoring } from "@/hooks/useSessionMonitoring";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";

interface SessionProviderProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
}

export const SessionProvider = ({ 
  children, 
  handleSessionFull, 
  onError 
}: SessionProviderProps) => {
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  
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
  if (providerError || error) {
    return (
      <SessionProviderErrorFallback 
        errorMessage={providerError || error}
        isAdmin={false}
        onRetry={() => refetch()}
      >
        <div>Error loading session</div>
      </SessionProviderErrorFallback>
    );
  }

  // Ensure roomState has all required properties
  const enhancedRoomState = {
    messages: roomState.messages || [],
    inputMessage: roomState.inputMessage || "",
    setInputMessage: roomState.setInputMessage || (() => {}),
    currentParticipant: roomState.currentParticipant || 0,
    isRecording: roomState.isRecording || false,
    setIsRecording: roomState.setIsRecording || (() => {}),
    handleGenerateReport: roomState.handleGenerateReport || (async () => Promise.resolve()),
    isGeneratingReport: roomState.isGeneratingReport || false,
    setMessages: roomState.setMessages || (() => {}),
    hasAnswered: roomState.hasAnswered || false,
    totalResponses: roomState.totalResponses || 0,
    viewMode: roomState.viewMode || "participant",
    setViewMode: roomState.setViewMode || (() => {}),
    recordResponse: roomState.recordResponse || (() => {}),
    error: roomState.error || null
  };

  // Build session context
  const sessionContext: SessionContextProps = {
    isLoading,
    conversation,
    currentConversationId,
    sessionState: enhancedRoomState,
    participants,
    participantColors,
    isWaitingForResponse: roomState.isWaitingForResponse || false,
    handleStartSession: enhancedHandleStartSession,
    handleSendMessage: roomState.handleSendMessage || (async () => Promise.resolve()),
    showQrCodeView,
    sessionLink,
    currentUserParticipantId,
    anonymousState: roomState.anonymousState || {
      isAnonymous: false,
      toggleAnonymous: () => {}
    },
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
