
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
  const [lastRetryTime, setLastRetryTime] = useState(0);
  const [isCircuitBreakerOpen, setIsCircuitBreakerOpen] = useState(false);
  
  console.log("🔍 SessionProviderErrorFallback state:", {
    errorMessage,
    isAdmin,
    retryCount,
    autoRetryCount,
    isCircuitBreakerOpen,
    timeSinceLastRetry: Date.now() - lastRetryTime
  });
  
  const originalError = errorMessage;
  const isSessionFullError = errorMessage.includes("session is full") || 
                            errorMessage.includes("maximum capacity");
  const isNetworkErr = isNetworkError({ message: errorMessage });
  const isAbortErr = isAbortError({ message: errorMessage });
  const isConnectionLostError = errorMessage.includes("Connection to server lost");
  
  // Circuit breaker: prevent infinite retry loops
  useEffect(() => {
    if (autoRetryCount >= 3) {
      console.log("🚫 Circuit breaker: Too many auto-retries, opening circuit");
      setIsCircuitBreakerOpen(true);
      
      // Reset circuit breaker after 30 seconds
      const resetTimeout = setTimeout(() => {
        console.log("🔄 Circuit breaker: Resetting after cooldown");
        setIsCircuitBreakerOpen(false);
        setAutoRetryCount(0);
      }, 30000);
      
      return () => clearTimeout(resetTimeout);
    }
  }, [autoRetryCount]);
  
  // Handle auto-retry for network errors (with circuit breaker)
  useEffect(() => {
    if (isNetworkErr && 
        !isAbortErr && 
        !isCircuitBreakerOpen &&
        onRetry && 
        autoRetryCount < 3) {
      
      const timeSinceLastRetry = Date.now() - lastRetryTime;
      const minimumRetryDelay = 5000; // 5 seconds minimum between retries
      
      if (timeSinceLastRetry < minimumRetryDelay) {
        console.log("⏰ Delaying auto-retry to prevent rapid cycling");
        return;
      }
      
      const retryDelay = Math.min(2000 * Math.pow(2, autoRetryCount), 10000); // Exponential backoff
      console.log(`🔄 Auto-retrying network error in ${retryDelay}ms (attempt ${autoRetryCount + 1}/3)`);
      
      const timeoutId = setTimeout(() => {
        setAutoRetryCount(prev => prev + 1);
        setLastRetryTime(Date.now());
        onRetry();
      }, retryDelay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isNetworkErr, isAbortErr, onRetry, autoRetryCount, isCircuitBreakerOpen, lastRetryTime]);
  
  // For abort errors, don't show error UI - just retry silently once
  useEffect(() => {
    if (isAbortErr && onRetry && autoRetryCount === 0) {
      console.log("🔄 AbortError detected - retrying silently once");
      const timeoutId = setTimeout(() => {
        setAutoRetryCount(1); // Prevent infinite abort retries
        onRetry();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAbortErr, onRetry, autoRetryCount]);
  
  // For connection lost errors, be more lenient for participants
  if (isConnectionLostError && !isAdmin && autoRetryCount < 2) {
    console.log("📡 Connection lost for participant - allowing retry before showing error");
    if (onRetry && Date.now() - lastRetryTime > 3000) {
      setLastRetryTime(Date.now());
      setAutoRetryCount(prev => prev + 1);
      onRetry();
    }
    return <>{children}</>; // Don't show error UI immediately
  }
  
  // Determine display error
  const displayError = isAdmin && isSessionFullError
    ? "You are an admin - overriding session full restriction" 
    : errorMessage;
  
  // Force set admin status in session storage and auto-retry for admin session full
  useEffect(() => {
    if (isAdmin) {
      console.log("🔑 Admin detected in error fallback - enforcing admin status");
      sessionStorage.setItem('isAdminSession', 'true');
      
      // If it's a session full error and we're admin, auto-retry once
      if (onRetry && isSessionFullError && autoRetryCount === 0) {
        console.log("🔑 Admin detected with session full error - auto-retrying once");
        setTimeout(() => {
          setAutoRetryCount(1);
          onRetry();
        }, 1000);
      }
    }
  }, [isAdmin, isSessionFullError, onRetry, autoRetryCount]);
  
  const handleManualRetry = useCallback(async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      setLastRetryTime(Date.now());
      
      // Reset circuit breaker on manual retry
      if (isCircuitBreakerOpen) {
        setIsCircuitBreakerOpen(false);
        setAutoRetryCount(0);
      }
      
      try {
        await onRetry();
      } finally {
        setTimeout(() => setIsRetrying(false), 2000);
      }
    }
  }, [onRetry, isRetrying, isCircuitBreakerOpen]);
  
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

  // For network errors with active auto-retry, show connection status
  if (isNetworkErr && autoRetryCount < 3 && !isCircuitBreakerOpen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Reconnecting...
            </h3>
            <p className="text-gray-600">
              Connection issue detected. Attempting to reconnect... ({autoRetryCount + 1}/3)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error UI for persistent issues
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <WifiOff className="h-12 w-12 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Connection Problem
          </h3>
          <p className="text-gray-600">
            {isCircuitBreakerOpen 
              ? "Multiple connection attempts failed. Please wait before trying again."
              : isConnectionLostError
                ? "Lost connection to the session. This might be temporary."
                : displayError
            }
          </p>
        </div>
        
        {onRetry && !isCircuitBreakerOpen && (
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
        
        {isCircuitBreakerOpen && (
          <p className="text-sm text-amber-600">
            Too many retry attempts. Circuit breaker is active for 30 seconds.
          </p>
        )}
      </div>
    </div>
  );
};
