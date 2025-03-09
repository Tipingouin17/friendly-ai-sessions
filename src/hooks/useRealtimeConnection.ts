
import { useState, useCallback, useRef, useEffect } from "react";
import { isInCrossOriginContext } from "@/utils/crossOriginUtils";

export function useRealtimeConnection(
  conversationId: number | null,
  refetch: () => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCrossOrigin, setIsCrossOrigin] = useState(false);
  const reconnectTimerRef = useRef<number | null>(null);
  
  // Check for cross-origin context on mount
  useEffect(() => {
    setIsCrossOrigin(isInCrossOriginContext());
  }, []);
  
  // Retry function for reconnection attempts with backoff strategy
  const attemptReconnection = useCallback(() => {
    if (connectionAttempts < 5 && conversationId) {
      console.log(`Attempting reconnection (attempt ${connectionAttempts + 1}/5) for ID:`, conversationId);
      setConnectionAttempts(prev => prev + 1);
      
      // Clear any existing timers
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      
      // Use exponential backoff for retries
      const backoffTime = Math.min(1000 * Math.pow(2, connectionAttempts), 10000);
      console.log(`Using backoff time of ${backoffTime}ms`);
      
      reconnectTimerRef.current = window.setTimeout(() => {
        refetch();
      }, backoffTime);
    } else if (connectionAttempts >= 5) {
      setError(isCrossOrigin 
        ? "Unable to establish a connection. This may be due to cross-origin restrictions."
        : "Unable to establish a stable connection after multiple attempts");
    }
  }, [connectionAttempts, conversationId, refetch, isCrossOrigin]);

  // Connection recovery mechanism
  useEffect(() => {
    if (!isConnected && conversationId && !error) {
      reconnectTimerRef.current = window.setTimeout(() => {
        console.log("Connection not established, attempting recovery");
        attemptReconnection();
      }, 5000);
    }
    
    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [isConnected, conversationId, error, attemptReconnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    setIsConnected,
    connectionAttempts,
    setConnectionAttempts,
    error,
    setError,
    attemptReconnection,
    isCrossOrigin
  };
}
