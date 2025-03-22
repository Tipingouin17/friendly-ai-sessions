
import { useEffect, useCallback, useState } from "react";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useConnectionChecker } from "@/hooks/useConnectionChecker";
import { useConnectionMonitor } from "@/hooks/useConnectionMonitor";
import { useToast } from "@/components/ui/use-toast";

interface UseRealtimeConnectionHandlerProps {
  conversationId: number | null;
  refetch: () => void;
  onConnectionError?: (error: string) => void;
}

export function useRealtimeConnectionHandler({
  conversationId,
  refetch,
  onConnectionError
}: UseRealtimeConnectionHandlerProps) {
  // Use base realtime connection hook
  const {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    error: connectionError,
    setError,
    isConnecting
  } = useRealtimeConnection(conversationId, refetch);

  // Connection checker
  const { performConnectionCheck } = useConnectionChecker({
    conversationId,
    refetch,
    setIsConnected,
    setError
  });

  // Connection monitor
  useConnectionMonitor({
    conversationId,
    isConnected,
    performConnectionCheck
  });

  // Handle connection errors
  useEffect(() => {
    if (connectionError && onConnectionError) {
      console.error("Connection error detected:", connectionError);
      onConnectionError(connectionError);
    }
  }, [connectionError, onConnectionError]);

  return {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    connectionError,
    performConnectionCheck,
    isConnecting
  };
}
