
import { useState, useCallback, useRef, useEffect } from "react";

interface UseConnectionRecoveryProps {
  conversationId: number | null;
  refetch: () => void;
  isCrossOrigin: boolean;
}

export function useConnectionRecovery({
  conversationId,
  refetch,
  isCrossOrigin
}: UseConnectionRecoveryProps) {
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastConnectionTime, setLastConnectionTime] = useState<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  // Set mounted flag for cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);
  
  // Reset connection state when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      console.log(`Connection recovery setup for conversation ID: ${conversationId}`);
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
      
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log(`Executing reconnection attempt ${connectionAttempts + 1}`);
          refetch();
          setLastConnectionTime(Date.now());
        }
      }, backoffTime);
    }
  }, [connectionAttempts, conversationId, refetch]);

  // Handle successful connection
  const handleConnectionEstablished = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log("Connection established successfully");
    setConnectionAttempts(0);
    setLastConnectionTime(Date.now());
  }, []);

  return {
    connectionAttempts,
    setConnectionAttempts,
    lastConnectionTime,
    attemptReconnection,
    handleConnectionEstablished
  };
}
