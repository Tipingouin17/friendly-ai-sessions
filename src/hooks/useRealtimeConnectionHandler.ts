
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
    setError,
    isConnecting
  } = useRealtimeConnection(conversationId, refetch);

  const { toast } = useToast();
  
  // Track last successful connection time
  const [lastPingSuccess, setLastPingSuccess] = useState<number>(Date.now());
  const [isPerformingConnectionCheck, setIsPerformingConnectionCheck] = useState(false);
  const mountedRef = useRef(true);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingChannelRef = useRef<any>(null);

  // Set up cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      
      // Clear all intervals and timeouts
      if (pingIntervalRef.current !== null) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      if (connectionCheckTimeoutRef.current !== null) {
        clearTimeout(connectionCheckTimeoutRef.current);
        connectionCheckTimeoutRef.current = null;
      }
      
      // Clean up ping channel
      if (pingChannelRef.current) {
        removeChannel(pingChannelRef.current);
        pingChannelRef.current = null;
      }
    };
  }, []);

  // Handle connection errors
  useEffect(() => {
    if (connectionError && onConnectionError && mountedRef.current) {
      console.error("Connection error detected:", connectionError);
      onConnectionError(connectionError);
    }
  }, [connectionError, onConnectionError]);

  // Function to perform a connection check using a lightweight channel
  const performConnectionCheck = useCallback(async () => {
    if (!conversationId || isPerformingConnectionCheck || !mountedRef.current) return false;
    
    setIsPerformingConnectionCheck(true);
    
    try {
      console.log("Performing connection check...");
      
      // Clean up existing ping channel if it exists
      if (pingChannelRef.current) {
        removeChannel(pingChannelRef.current);
        pingChannelRef.current = null;
      }
      
      // Create a lightweight ping channel to test connection
      const channelName = `ping-${conversationId}-${Date.now()}`;
      let pingSuccess = false;
      
      // Create a promise that resolves when subscription succeeds
      const pingPromise = new Promise<boolean>((resolve) => {
        const timeoutId = setTimeout(() => resolve(false), 5000);
        
        try {
          const channel = supabase
            .channel(channelName)
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                clearTimeout(timeoutId);
                pingSuccess = true;
                resolve(true);
              } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                clearTimeout(timeoutId);
                resolve(false);
              }
            });
          
          pingChannelRef.current = channel;
        } catch (err) {
          clearTimeout(timeoutId);
          resolve(false);
        }
      });
      
      // Wait for ping result
      const pingResult = await pingPromise;
      
      if (!mountedRef.current) return false;
      
      if (pingResult) {
        console.log("Connection check successful (channel subscription worked)");
        setIsConnected();
        setLastPingSuccess(Date.now());
        
        // If we got a successful ping, might as well refresh our state
        refetch();
        setIsPerformingConnectionCheck(false);
        return true;
      }
      
      // Fallback to simple database query if channel approach fails
      try {
        // Simple ping to check connection with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Create the request but don't execute it immediately
        const query = supabase.from('conversations')
          .select('id')
          .eq('id', conversationId)
          .limit(1)
          .maybeSingle();
          
        // Manually handle the AbortController
        const signal = controller.signal;
        const abortPromise = new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Request aborted due to timeout'));
          });
        });
        
        // Race the query against the abort promise
        const { data, error } = await Promise.race([
          query,
          abortPromise.then(() => {
            throw new Error('Request timed out');
          })
        ]).catch(err => {
          console.error("Connection check error:", err);
          return { data: null, error: err };
        }) as { data: any, error: any };
        
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
          console.log("Connection check successful (query worked):", data);
          setIsConnected();
          setLastPingSuccess(Date.now());
          
          // If we got data, might as well refresh our state
          refetch();
          setIsPerformingConnectionCheck(false);
          return true;
        }
      } catch (err) {
        console.error("Error in fallback connection check:", err);
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
    connectionCheckTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        performConnectionCheck();
      }
    }, 1500);
    
    // Set up regular ping interval with reduced frequency (15s → 30s)
    // to prevent possible rate limiting issues with Supabase
    pingIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      
      // Check if it's been too long since last successful ping
      const timeSinceLastSuccess = Date.now() - lastPingSuccess;
      if (timeSinceLastSuccess > 60000) { // 60 seconds - increased from 30s
        console.log("Long time since last successful ping:", timeSinceLastSuccess / 1000, "seconds");
        
        // Show toast for extended connection issues
        if (timeSinceLastSuccess > 90000 && isConnected && mountedRef.current) {
          toast({
            title: "Connection issues detected",
            description: "Trying to reconnect to the session...",
            variant: "destructive",
          });
        }
      }
      
      // If we think we're disconnected or it's been a while, do a check
      if ((!isConnected || timeSinceLastSuccess > 60000) && mountedRef.current) {
        console.log("Connection appears to be down or stale, attempting ping...");
        performConnectionCheck();
      }
    }, 30000); // Check every 30 seconds (increased from 15s)
    
    return () => {
      if (connectionCheckTimeoutRef.current !== null) {
        clearTimeout(connectionCheckTimeoutRef.current);
        connectionCheckTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current !== null) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Clean up ping channel
      if (pingChannelRef.current) {
        removeChannel(pingChannelRef.current);
        pingChannelRef.current = null;
      }
    };
  }, [conversationId, isConnected, lastPingSuccess, performConnectionCheck, toast]);

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
