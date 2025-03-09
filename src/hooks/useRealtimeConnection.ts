
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
  const [lastConnectionTime, setLastConnectionTime] = useState<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  // Check for cross-origin context on mount
  useEffect(() => {
    setIsCrossOrigin(isInCrossOriginContext());
    
    // Set mounted flag for cleanup
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Reset connection state when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      console.log(`Connection setup for conversation ID: ${conversationId}`);
      // Reset state for new conversation
      if (lastConnectionTime === 0) {
        setLastConnectionTime(Date.now());
      }
    }
  }, [conversationId, lastConnectionTime]);
  
  // Retry function for reconnection attempts with backoff strategy
  const attemptReconnection = useCallback(() => {
    if (!mountedRef.current) return;

    if (connectionAttempts < 5 && conversationId) {
      console.log(`Attempting reconnection (attempt ${connectionAttempts + 1}/5) for ID:`, conversationId);
      setConnectionAttempts(prev => prev + 1);
      
      // Clear any existing timers
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      // Use exponential backoff for retries
      const backoffTime = Math.min(1000 * Math.pow(2, connectionAttempts), 10000);
      console.log(`Using backoff time of ${backoffTime}ms`);
      
      reconnectTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          console.log(`Executing reconnection attempt ${connectionAttempts + 1}`);
          refetch();
          setLastConnectionTime(Date.now());
        }
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
      // Only attempt recovery if we have a conversation ID and no current connection
      const timeoutId = window.setTimeout(() => {
        if (mountedRef.current) {
          console.log("Connection not established, attempting recovery");
          attemptReconnection();
        }
      }, 5000);
      
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
    
    return undefined;
  }, [isConnected, conversationId, error, attemptReconnection]);

  // Handle successful connection
  const handleConnectionEstablished = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log("Connection established successfully");
    setIsConnected(true);
    setConnectionAttempts(0);
    setLastConnectionTime(Date.now());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);

  return {
    isConnected,
    setIsConnected: handleConnectionEstablished,
    connectionAttempts,
    setConnectionAttempts,
    error,
    setError,
    attemptReconnection,
    isCrossOrigin,
    lastConnectionTime,
    isConnecting: !isConnected && connectionAttempts > 0
  };
}
