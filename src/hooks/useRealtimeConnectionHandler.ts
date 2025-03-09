import { useEffect, useCallback, useState } from "react";
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

  // Track last successful connection time
  const [lastPingSuccess, setLastPingSuccess] = useState<number>(Date.now());

  // Handle connection errors
  useEffect(() => {
    if (connectionError && onConnectionError) {
      onConnectionError(connectionError);
    }
  }, [connectionError, onConnectionError]);

  // Function to perform a connection check
  const performConnectionCheck = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      console.log("Performing connection check...");
      
      // Simple ping to check connection
      const { data, error } = await supabase.from('conversations')
        .select('id, current_participants, session_started')
        .eq('id', conversationId)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Connection check failed:", error);
        setError("Connection to server lost");
        attemptReconnection();
        return false;
      } 
      
      if (data) {
        console.log("Connection check successful, data:", data);
        setIsConnected(true);
        setLastPingSuccess(Date.now());
        
        // If we got data, might as well refresh our state
        refetch();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Error in performConnectionCheck:", err);
      setError("Unable to check connection status");
      return false;
    }
  }, [conversationId, setIsConnected, setError, attemptReconnection, refetch]);

  // Setup ping system to keep connection alive and verify connectivity
  useEffect(() => {
    if (!conversationId) return;
    
    // Initial connection check
    performConnectionCheck();
    
    const pingInterval = setInterval(() => {
      // Check if it's been too long since last successful ping
      const timeSinceLastSuccess = Date.now() - lastPingSuccess;
      if (timeSinceLastSuccess > 30000) { // 30 seconds
        console.log("Long time since last successful ping:", timeSinceLastSuccess / 1000, "seconds");
      }
      
      // If we think we're disconnected or it's been a while, do a check
      if (!isConnected || timeSinceLastSuccess > 30000) {
        console.log("Connection appears to be down or stale, attempting ping...");
        performConnectionCheck();
      }
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(pingInterval);
  }, [conversationId, isConnected, lastPingSuccess, performConnectionCheck]);

  return {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    connectionError,
    performConnectionCheck
  };
}
