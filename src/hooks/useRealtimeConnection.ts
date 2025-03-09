
import { useState, useCallback, useRef, useEffect } from "react";

export function useRealtimeConnection(
  conversationId: number | null,
  refetch: () => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Retry function for reconnection attempts
  const attemptReconnection = useCallback(() => {
    if (connectionAttempts < 3 && conversationId) {
      console.log(`Attempting reconnection (attempt ${connectionAttempts + 1}/3) for ID:`, conversationId);
      setConnectionAttempts(prev => prev + 1);
      refetch();
    } else if (connectionAttempts >= 3) {
      setError("Unable to establish a stable connection after multiple attempts");
    }
  }, [connectionAttempts, conversationId, refetch]);

  // Connection recovery mechanism
  useEffect(() => {
    let recoveryTimeout: number | null = null;
    
    if (!isConnected && conversationId && !error) {
      recoveryTimeout = window.setTimeout(() => {
        console.log("Connection not established, attempting recovery");
        attemptReconnection();
      }, 5000);
    }
    
    return () => {
      if (recoveryTimeout !== null) {
        clearTimeout(recoveryTimeout);
      }
    };
  }, [isConnected, conversationId, error, attemptReconnection]);

  return {
    isConnected,
    setIsConnected,
    connectionAttempts,
    setConnectionAttempts,
    error,
    setError,
    attemptReconnection
  };
}
