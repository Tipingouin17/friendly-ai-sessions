
import React, { useEffect, useState, useCallback } from "react";
import { SessionContextProps } from "@/types/session";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { isNetworkError, isAbortError } from "@/utils/networkUtils";

interface SessionProviderErrorFallbackProps {
  errorMessage: string;
  children: React.ReactNode;
  isAdmin?: boolean;
  onRetry?: () => void;
  retryCount?: number;
}

export const SessionProviderErrorFallback = ({ 
  errorMessage, 
  children,
  isAdmin = false,
  onRetry,
  retryCount = 0
}: SessionProviderErrorFallbackProps) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  
  console.log("Rendering SessionProviderErrorFallback with error:", errorMessage, "isAdmin:", isAdmin);
  
  const originalError = errorMessage;
  const isSessionFullError = errorMessage.includes("session is full") || 
                            errorMessage.includes("maximum capacity");
  const isNetworkErr = isNetworkError({ message: errorMessage });
  const isAbortErr = isAbortError({ message: errorMessage });
  
  // Handle auto-retry for network errors (but not abort errors)
  useEffect(() => {
    if (isNetworkErr && !isAbortErr && onRetry && autoRetryCount < 3) {
      const retryDelay = Math.min(1000 * Math.pow(2, autoRetryCount), 10000);
      console.log(`Auto-retrying network error in ${retryDelay}ms (attempt ${autoRetryCount + 1})`);
      
      const timeoutId = setTimeout(() => {
        setAutoRetryCount(prev => prev + 1);
        onRetry();
      }, retryDelay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isNetworkErr, isAbortErr, onRetry, autoRetryCount]);
  
  // For abort errors, don't show error UI - just retry silently
  useEffect(() => {
    if (isAbortErr && onRetry) {
      console.log("AbortError detected - retrying silently");
      const timeoutId = setTimeout(() => {
        onRetry();
      }, 500); // Short delay for abort errors
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAbortErr, onRetry]);
  
  // Determine display error
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
  
  const handleManualRetry = useCallback(async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setTimeout(() => setIsRetrying(false), 1000);
      }
    }
  }, [onRetry, isRetrying]);
  
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
    participantColors: {
      P1: "#FCA5A5", P2: "#FDBA74", P3: "#BEF264", P4: "#86EFAC",
      P5: "#6EE7B7", P6: "#5EEAD4", P7: "#67E8F9", P8: "#7DD3FC",
    },
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
    error: displayError,
    isConnected: false,
    connectionAttempts: 0,
    refetch: () => Promise.resolve({}),
    isAdmin: isAdmin
  };

  // For abort errors, don't show any error UI - just render children
  if (isAbortErr) {
    return <>{children}</>;
  }

  // For network errors, show a different UI
  if (isNetworkErr) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            {autoRetryCount < 3 ? (
              <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
            ) : (
              <WifiOff className="h-12 w-12 text-red-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {autoRetryCount < 3 ? "Connecting..." : "Connection Problem"}
            </h3>
            <p className="text-gray-600">
              {autoRetryCount < 3 
                ? `Attempting to connect to the session... (${autoRetryCount + 1}/3)`
                : "Unable to connect to the session. Please check your internet connection."
              }
            </p>
          </div>
          
          {autoRetryCount >= 3 && onRetry && (
            <Button 
              onClick={handleManualRetry}
              disabled={isRetrying}
              className="flex items-center gap-2"
            >
              {isRetrying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              {isRetrying ? "Retrying..." : "Try Again"}
            </Button>
          )}
          
          {retryCount > 0 && (
            <p className="text-sm text-gray-500">
              Retry attempts: {retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Return error state with fallback context for other errors
  return (
    <div className="flex-1 flex flex-col">
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement, fallbackSessionContext)
        : children}
      
      {onRetry && !isNetworkErr && (
        <div className="fixed bottom-4 right-4">
          <Button 
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="bg-primary text-white px-4 py-2 rounded shadow-md hover:bg-primary/90 flex items-center gap-2"
          >
            {isRetrying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRetrying ? "Retrying..." : "Retry Connection"}
          </Button>
        </div>
      )}
    </div>
  );
};
