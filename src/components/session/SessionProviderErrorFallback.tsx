/**
 * Session Provider Error Fallback
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { isNetworkError, isAbortError } from "@/utils/networkUtils";
import SessionConnecting from "./SessionConnecting";
import api from "@/lib/api";

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
  
  const isSessionFullError = errorMessage.includes("session is full") || 
                            errorMessage.includes("maximum capacity");
  const isNetworkErr = isNetworkError({ message: errorMessage });
  const isAbortErr = isAbortError({ message: errorMessage });
  const isConnectionLostError = errorMessage.includes("Connection to server lost");
  
  // Circuit breaker: prevent infinite retry loops
  useEffect(() => {
    if (autoRetryCount >= 3) {
      setIsCircuitBreakerOpen(true);
      
      // Reset circuit breaker after 30 seconds
      const resetTimeout = setTimeout(() => {
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
      const minimumRetryDelay = 5000;
      
      if (timeSinceLastRetry < minimumRetryDelay) {
        return;
      }
      
      const retryDelay = Math.min(2000 * Math.pow(2, autoRetryCount), 10000);
      
      const timeoutId = setTimeout(() => {
        setAutoRetryCount(prev => prev + 1);
        setLastRetryTime(Date.now());
        onRetry();
      }, retryDelay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isNetworkErr, isAbortErr, onRetry, autoRetryCount, isCircuitBreakerOpen, lastRetryTime]);
  
  // For abort errors, retry silently once
  useEffect(() => {
    if (isAbortErr && onRetry && autoRetryCount === 0) {
      const timeoutId = setTimeout(() => {
        setAutoRetryCount(1);
        onRetry();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAbortErr, onRetry, autoRetryCount]);
  
  // For connection lost errors, auto-retry with exponential backoff
  useEffect(() => {
    if (isConnectionLostError && !isAdmin && autoRetryCount < 3 && onRetry) {
      const timeSinceLastRetry = Date.now() - lastRetryTime;
      const retryDelay = Math.min(3000 * Math.pow(2, autoRetryCount), 15000);
      if (timeSinceLastRetry > retryDelay) {
        setLastRetryTime(Date.now());
        setAutoRetryCount(prev => prev + 1);
        onRetry();
      }
    }
  }, [isConnectionLostError, isAdmin, autoRetryCount, onRetry, lastRetryTime]);
  
  // Force set admin status in session storage and auto-retry for admin session full
  useEffect(() => {
    if (isAdmin) {
      sessionStorage.setItem('isAdminSession', 'true');
      
      if (onRetry && isSessionFullError && autoRetryCount === 0) {
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
      
      if (isCircuitBreakerOpen) {
        setIsCircuitBreakerOpen(false);
        setAutoRetryCount(0);
      }
      
      // Force the shared WebSocket to reconnect immediately, resetting backoff.
      api.forceReconnect();
      
      try {
        await onRetry();
      } finally {
        setTimeout(() => setIsRetrying(false), 2000);
      }
    }
  }, [onRetry, isRetrying, isCircuitBreakerOpen]);

  // ─── All hooks above — early returns below ────────────────────────────────

  // For abort errors, don't show any error UI - just render children
  if (isAbortErr) {
    return <>{children}</>;
  }

  // For connection lost / cold-start: show the SessionConnecting UI instead of blank
  // This replaces the old `return <>{children}</>` which rendered null (blank page).
  if (isConnectionLostError && !isAdmin && autoRetryCount < 3) {
    return (
      <SessionConnecting
        timeoutSeconds={60}
        onRetry={autoRetryCount >= 2 ? handleManualRetry : undefined}
        isColdStart={true}
      />
    );
  }
  
  // Determine display error
  const displayError = isAdmin && isSessionFullError
    ? "You are an admin - overriding session full restriction" 
    : errorMessage;

  // For network errors with active auto-retry, show connection status
  if (isNetworkErr && autoRetryCount < 3 && !isCircuitBreakerOpen) {
    return (
      <SessionConnecting
        timeoutSeconds={30}
        onRetry={handleManualRetry}
        isColdStart={false}
      />
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
          <p className="text-sm text-indigo-600">
            Too many retry attempts. Circuit breaker is active for 30 seconds.
          </p>
        )}
      </div>
    </div>
  );
};
