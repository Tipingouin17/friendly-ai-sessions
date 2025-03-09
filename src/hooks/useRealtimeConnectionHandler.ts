import { useEffect, useCallback } from "react";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

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
    setError
  } = useRealtimeConnection(conversationId, refetch);

  // Handle connection errors
  useEffect(() => {
    if (connectionError && onConnectionError) {
      onConnectionError(connectionError);
    }
  }, [connectionError, onConnectionError]);

  // Setup ping system to keep connection alive
  useEffect(() => {
    if (!conversationId) return;
    
    const pingInterval = setInterval(() => {
      if (!isConnected) {
        console.log("Connection appears to be down, attempting ping...");
        // Simple ping to check connection
        supabase.from('conversations')
          .select('id')
          .eq('id', conversationId)
          .limit(1)
          .then(({ error }) => {
            if (error) {
              console.error("Ping failed:", error);
              setError("Connection to server lost");
              attemptReconnection();
            } else {
              console.log("Ping successful");
              setIsConnected(true);
            }
          });
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [conversationId, isConnected, setIsConnected, attemptReconnection, setError]);

  return {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    connectionError
  };
}
