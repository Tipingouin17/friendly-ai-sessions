import { useEffect, useCallback, useState, useRef } from "react";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";
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
    setError
  } = useRealtimeConnection(conversationId, refetch);

  const { toast } = useToast();
  
  // Track last successful connection time
  const [lastPingSuccess, setLastPingSuccess] = useState<number>(Date.now());
  const [isPerformingConnectionCheck, setIsPerformingConnectionCheck] = useState(false);
  const mountedRef = useRef(true);

  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle connection errors
  useEffect(() => {
    if (connectionError && onConnectionError && mountedRef.current) {
      console.error("Connection error detected:", connectionError);
      onConnectionError(connectionError);
    }
  }, [connectionError, onConnectionError]);

  // Function to perform a connection check
  const performConnectionCheck = useCallback(async () => {
    if (!conversationId || isPerformingConnectionCheck || !mountedRef.current) return false;
    
    setIsPerformingConnectionCheck(true);
    
    try {
      console.log("Performing connection check...");
      
      // Simple ping to check connection with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const { data, error } = await supabase.from('conversations')
        .select('id, current_participants, session_started')
        .eq('id', conversationId)
        .limit(1)
        .maybeSingle()
        .abortSignal(controller.signal);
        
      clearTimeout(timeoutId);
      
      if (!mountedRef.current) return false;
      
      if (error) {
        console.error("Connection check failed:", error);
        setError("Connection to server lost");
        attemptReconnection();
        setIsPerformingConnectionCheck(false);
        return false;
      } 
      
      if (data) {
        console.log("Connection check successful, data:", data);
        setIsConnected(true);
        setLastPingSuccess(Date.now());
        
        // If we got data, might as well refresh our state
        refetch();
        setIsPerformingConnectionCheck(false);
        return true;
      }
      
      setIsPerformingConnectionCheck(false);
      return false;
    } catch (err) {
      if (!mountedRef.current) return false;
      
      console.error("Error in performConnectionCheck:", err);
      setError("Unable to check connection status");
      setIsPerformingConnectionCheck(false);
      return false;
    }
  }, [conversationId, setIsConnected, setError, attemptReconnection, refetch, isPerformingConnectionCheck]);

  // Setup ping system to keep connection alive and verify connectivity
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;
    
    // Initial connection check with slight delay to allow other systems to initialize
    const initialCheckTimeout = setTimeout(() => {
      if (mountedRef.current) {
        performConnectionCheck();
      }
    }, 1500);
    
    const pingInterval = setInterval(() => {
      if (!mountedRef.current) return;
      
      // Check if it's been too long since last successful ping
      const timeSinceLastSuccess = Date.now() - lastPingSuccess;
      if (timeSinceLastSuccess > 30000) { // 30 seconds
        console.log("Long time since last successful ping:", timeSinceLastSuccess / 1000, "seconds");
        
        // Show toast for extended connection issues
        if (timeSinceLastSuccess > 45000 && isConnected && mountedRef.current) {
          toast({
            title: "Connection issues detected",
            description: "Trying to reconnect to the session...",
            variant: "destructive",
          });
        }
      }
      
      // If we think we're disconnected or it's been a while, do a check
      if ((!isConnected || timeSinceLastSuccess > 30000) && mountedRef.current) {
        console.log("Connection appears to be down or stale, attempting ping...");
        performConnectionCheck();
      }
    }, 15000); // Check every 15 seconds
    
    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(pingInterval);
    };
  }, [conversationId, isConnected, lastPingSuccess, performConnectionCheck, toast]);

  return {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    connectionError,
    performConnectionCheck
  };
}
