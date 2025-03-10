
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
  forceAdmin?: boolean; // Added forceAdmin prop
}

export const SessionProviderCore = ({ 
  children, 
  handleSessionFull, 
  onError,
  forceAdmin 
}: SessionProviderCoreProps) => {
  const location = useLocation();
  const locationState = location.state as { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean;
    isAdmin?: boolean;
  } | null;
  
  // Force admin status if specified
  useEffect(() => {
    if (forceAdmin) {
      console.log("SessionProviderCore: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
    } else if (locationState?.isAdmin) {
      console.log("SessionProviderCore: Setting admin status from location state");
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [forceAdmin, locationState]);
  
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
  } = useSessionProviderState({ 
    onError, 
    forceAdmin: forceAdmin || Boolean(locationState?.isAdmin) 
  }); // Pass forceAdmin to provider state hook

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
    maxParticipantsForSession,
    isSessionFull
  } = useSessionParticipantSetup({
    conversationId: currentConversationId,
    conversation,
    locationState,
    refetch,
    onError: handleError,
    onSessionFull: handleSessionFull,
    forceAdmin: forceAdmin || Boolean(locationState?.isAdmin) // Pass forceAdmin to participant setup
  });

  // Log participant information for debugging
  useEffect(() => {
    console.log("SessionProviderCore participant info:", {
      currentConversationId,
      conversationParticipants: conversation?.current_participants,
      hookParticipants: currentParticipantCount,
      participants: participants.length,
      maxParticipants: maxParticipantsForSession,
      isSessionFull,
      forceAdmin,
      locationStateIsAdmin: locationState?.isAdmin
    });
    
    // If we're an admin, we should never see the session full error
    if (isSessionFull && (forceAdmin || locationState?.isAdmin)) {
      console.error("Admin user incorrectly marked as session full - this should never happen");
    }
  }, [currentConversationId, conversation, currentParticipantCount, participants.length, 
      maxParticipantsForSession, isSessionFull, forceAdmin, locationState]);

  // Set up session monitoring
  const {
    isSessionStartedInDB,
    roomState
  } = useSessionMonitoring({
    conversation,
    conversationId: currentConversationId,
    currentUserParticipantId,
    participants,
    onError: handleError,
    forceAdmin: forceAdmin || Boolean(locationState?.isAdmin) // Pass forceAdmin to session monitoring
  });

  // If we have serious errors, return error fallback
  if (providerError) {
    return (
      <SessionProviderErrorFallback 
        errorMessage={providerError}
        isAdmin={Boolean(forceAdmin || locationState?.isAdmin)}
        onRetry={() => {
          console.log("Retry requested from error fallback");
          refetch();
        }}
      >
        {children}
      </SessionProviderErrorFallback>
    );
  }

  // Determine effective admin status
  const effectiveIsAdmin = forceAdmin === true || locationState?.isAdmin === true;

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
    refetch,
    
    // Set admin status based on forceAdmin prop
    isAdmin: effectiveIsAdmin
  };

  // Return children with context
  return children(sessionContext);
};
