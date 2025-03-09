
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSessionErrorHandler } from "@/hooks/useSessionErrorHandler";
import { useRefactoredSessionData } from "@/hooks/useRefactoredSessionData";
import { useSessionParticipantManager } from "@/hooks/useSessionParticipantManager";
import { useSessionStartMonitor } from "@/hooks/useSessionStartMonitor";
import { useSessionRoomState } from "@/hooks/useSessionRoomState";
import { SessionContextProps } from "@/types/session";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";
import { useToast } from "@/components/ui/use-toast";

interface RefactoredSessionProviderProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
}

export const RefactoredSessionProvider = ({ 
  children, 
  handleSessionFull, 
  onError 
}: RefactoredSessionProviderProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const locationState = location.state as { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean 
  } | null;
  
  // Set up error handling
  const { providerError, handleError } = useSessionErrorHandler({ onError });
  
  // Load session data
  const {
    currentConversationId,
    conversation,
    isLoading,
    refetch,
    showQrCodeView,
    sessionLink,
    handleStartSession,
    isSessionStarted,
    error: dataError
  } = useRefactoredSessionData();

  // Handle data errors
  useEffect(() => {
    if (dataError) {
      console.error("Session data error:", dataError);
      handleError(dataError);
    }
  }, [dataError, handleError]);

  // Monitor session start status
  const isSessionStartedInDB = useSessionStartMonitor({ conversation });

  // Log session start status for debugging
  useEffect(() => {
    console.log("Session start monitoring:", { 
      isSessionStartedInDB,
      conversationStarted: conversation?.session_started
    });
  }, [isSessionStartedInDB, conversation?.session_started]);

  // Set up participant management
  const {
    participants,
    currentUserParticipantId,
    error: participantError
  } = useSessionParticipantManager({
    conversationId: currentConversationId,
    conversation,
    locationState,
    refetch,
    onSessionFull: handleSessionFull
  });

  // Handle participant errors
  useEffect(() => {
    if (participantError) {
      console.error("Participant error:", participantError);
      handleError(participantError);
    }
  }, [participantError, handleError]);

  // Set up session room state 
  const roomState = useSessionRoomState({
    conversationId: currentConversationId,
    conversation,
    currentUserParticipantId,
    participants,
    welcomeMessage: conversation?.sessions?.welcome_message ?? null
  });

  // Handle room state errors
  useEffect(() => {
    if (roomState.error) {
      console.error("Room state error:", roomState.error);
      handleError(roomState.error);
    }
  }, [roomState.error, handleError]);

  // Handler for starting session with better error handling
  const enhancedHandleStartSession = () => {
    try {
      console.log("Enhanced handleStartSession called from RefactoredSessionProvider");
      handleStartSession();
      toast({
        title: "Starting session",
        description: "The session is now starting...",
      });
      
      // Force refetch after a short delay to ensure we get the latest state
      setTimeout(() => {
        console.log("Forcing refetch after session start");
        refetch();
      }, 1000);
      
    } catch (error) {
      console.error("Error in handleStartSession:", error);
      handleError("Failed to start session. Please try again.");
    }
  };

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
    error: providerError
  };

  // Return children with context
  return children(sessionContext);
};
