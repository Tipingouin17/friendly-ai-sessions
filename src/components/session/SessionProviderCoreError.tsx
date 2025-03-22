
import React from "react";
import { SessionContextProps } from "@/types/session";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";
import { participantColors } from "@/utils/sessionHelpers";

interface SessionProviderCoreErrorProps {
  providerError: string | null;
  effectiveAdmin: boolean;
  refetch: () => void;
  children: (props: SessionContextProps) => React.ReactElement;
}

export const SessionProviderCoreError = ({
  providerError,
  effectiveAdmin,
  refetch,
  children
}: SessionProviderCoreErrorProps) => {
  // Create emergency fallback context
  const emergencyContext: SessionContextProps = {
    isLoading: false,
    conversation: null,
    currentConversationId: null,
    sessionState: {
      messages: [],
      inputMessage: "",
      setInputMessage: () => {},
      currentParticipant: 0,
      isRecording: false,
      setIsRecording: () => {},
      hasAnswered: false,
      totalResponses: 0,
      viewMode: "participant",
      setViewMode: () => {},
      handleGenerateReport: async () => { return Promise.resolve(); },
      isGeneratingReport: false,
      setMessages: () => {},
      recordResponse: () => {},
      error: null
    },
    participants: [],
    participantColors,
    isWaitingForResponse: false,
    handleStartSession: () => {},
    handleSendMessage: async () => { return Promise.resolve(); },
    handleLikeMessage: () => {},
    showQrCodeView: false,
    sessionLink: '',
    currentUserParticipantId: null,
    anonymousState: {
      isAnonymous: false,
      toggleAnonymous: () => {}
    },
    isSessionStartedInDB: false,
    error: providerError,
    isConnected: false,
    connectionAttempts: 0,
    refetch: () => {},
    isAdmin: effectiveAdmin
  };

  // If we have serious errors, return error fallback
  if (providerError && !effectiveAdmin) {
    return (
      <SessionProviderErrorFallback 
        errorMessage={providerError}
        isAdmin={effectiveAdmin}
        onRetry={() => {
          console.log("Retry requested from error fallback");
          refetch();
        }}
      >
        {() => children(emergencyContext)}
      </SessionProviderErrorFallback>
    );
  }

  // For admin or no errors, render children with emergency context
  return children(emergencyContext);
};
