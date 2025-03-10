
import React from "react";
import { SessionContextProps } from "@/types/session";

interface SessionProviderErrorFallbackProps {
  errorMessage: string;
  children: (props: SessionContextProps) => React.ReactElement;
  isAdmin?: boolean; // This prop is already defined
  onRetry?: () => void;
}

export const SessionProviderErrorFallback = ({ 
  errorMessage, 
  children,
  isAdmin = false, // Default to false as in the original
  onRetry 
}: SessionProviderErrorFallbackProps) => {
  console.log("Rendering SessionProviderErrorFallback with error:", errorMessage, "isAdmin:", isAdmin);
  
  // Create safe default props
  const fallbackSessionContext: SessionContextProps = {
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
    error: errorMessage,
    
    // Add missing properties required by SessionContextProps
    isConnected: false,
    connectionAttempts: 0,
    refetch: () => {},
    
    // Include isAdmin in the fallback context
    isAdmin: isAdmin
  };

  // Return error state with a retry button if onRetry is provided
  return (
    <div className="flex-1 flex flex-col">
      {children(fallbackSessionContext)}
      
      {onRetry && (
        <div className="fixed bottom-4 right-4">
          <button 
            onClick={onRetry}
            className="bg-primary text-white px-4 py-2 rounded shadow-md hover:bg-primary/90"
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
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
