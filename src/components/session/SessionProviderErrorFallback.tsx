import React, { useEffect } from "react";
import { SessionContextProps } from "@/types/session";

interface SessionProviderErrorFallbackProps {
  errorMessage: string;
  children: React.ReactNode;
  isAdmin?: boolean;
  onRetry?: () => void;
}

export const SessionProviderErrorFallback = ({ 
  errorMessage, 
  children,
  isAdmin = false,
  onRetry 
}: SessionProviderErrorFallbackProps) => {
  console.log("Rendering SessionProviderErrorFallback with error:", errorMessage, "isAdmin:", isAdmin);
  
  // For admin users, explicitly handle session full error
  const originalError = errorMessage;
  const isSessionFullError = errorMessage.includes("session is full") || 
                            errorMessage.includes("maximum capacity");
  
  // Keep a reference to the original error message while determining what to display
  const displayError = isAdmin && isSessionFullError
    ? "You are an admin - overriding session full restriction" 
    : errorMessage;
  
  // Force set admin status in session storage and auto-retry for admin session full
  useEffect(() => {
    if (isAdmin) {
      console.log("🔑 Admin detected in error fallback - enforcing admin status");
      sessionStorage.setItem('isAdminSession', 'true');
      
      // If it's a session full error and we're admin, auto-retry
      if (onRetry && isSessionFullError) {
        console.log("🔑 Admin detected with session full error - auto-retrying");
        setTimeout(() => {
          onRetry();
        }, 1000);
      }
    }
  }, [isAdmin, isSessionFullError, onRetry]);
  
  // Create safe default props for fallback context
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
    showQrCodeView: false,
    sessionLink: '',
    currentUserParticipantId: null,
    anonymousState: {
      isAnonymous: false,
      toggleAnonymous: () => {}
    },
    isSessionStartedInDB: false,
    error: displayError, // Use the potentially modified error message
    
    // Add missing properties required by SessionContextProps
    isConnected: false,
    connectionAttempts: 0,
    refetch: () => Promise.resolve({}),
    
    // Include isAdmin in the fallback context
    isAdmin: isAdmin
  };

  // Return error state with a retry button if onRetry is provided
  return (
    <div className="flex-1 flex flex-col">
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement, fallbackSessionContext)
        : children}
      
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
