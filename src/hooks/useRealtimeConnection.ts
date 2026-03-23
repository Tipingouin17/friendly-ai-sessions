
import { useState, useCallback, useEffect, useRef } from "react";
import { isInCrossOriginContext } from "@/utils/crossOriginUtils";
import { useConnectionRecovery } from "@/hooks/useConnectionRecovery";

export function useRealtimeConnection(
  conversationId: number | null,
  refetch: () => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCrossOrigin, setIsCrossOrigin] = useState(false);
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

  // Use connection recovery hook
  const {
    connectionAttempts,
    setConnectionAttempts,
    lastConnectionTime,
    attemptReconnection,
    handleConnectionEstablished
  } = useConnectionRecovery({
    conversationId,
    refetch,
    isCrossOrigin
  });

  // Connection recovery mechanism
  useEffect(() => {
    if (!isConnected && conversationId && !error) {
      // Only attempt recovery if we have a conversation ID and no current connection
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          console.log("Connection not established, attempting recovery");
          attemptReconnection();
        }
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [isConnected, conversationId, error, attemptReconnection]);

  // Wrapper for setting "connected" state
  const setConnectedState = useCallback((connected: boolean) => {
    if (!mountedRef.current) return;
    setIsConnected(connected);
    if (connected) {
      handleConnectionEstablished();
    }
  }, [handleConnectionEstablished]);

  // Update error state with cross-origin context info if needed
  useEffect(() => {
    if (isConnected) {
      setError(null);
      return;
    }

    if (connectionAttempts >= 5 && !error) {
      setError(isCrossOrigin
        ? "Unable to establish a connection. This may be due to cross-origin restrictions."
        : "Unable to establish a stable connection after multiple attempts");
    }
  }, [connectionAttempts, isCrossOrigin, error, isConnected]);

  return {
    isConnected,
    setIsConnected: setConnectedState,
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
