
import React from "react";
import { SessionContextProps } from "@/types/session";

interface SessionProviderErrorFallbackProps {
  errorMessage: string;
  children: (props: SessionContextProps) => React.ReactElement;
}

export const SessionProviderErrorFallback = ({ 
  errorMessage, 
  children 
}: SessionProviderErrorFallbackProps) => {
  // Return basic error state
  return children({
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
      setMessages: (messages) => {},
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
    error: errorMessage
  });
};

// Import this from sessionHelpers to avoid circular dependencies
const participantColors: { [key: string]: string } = {
  P1: "#FCA5A5",
  P2: "#FDBA74",
  P3: "#BEF264",
  P4: "#86EFAC",
  P5: "#6EE7B7",
  P6: "#5EEAD4",
  P7: "#67E8F9",
  P8: "#7DD3FC",
};
