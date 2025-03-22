import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";

interface UseConnectionMonitorProps {
  conversationId: number | null;
  isConnected: boolean;
  performConnectionCheck: () => Promise<boolean>;
}

export function useConnectionMonitor({
  conversationId,
  isConnected,
  performConnectionCheck
}: UseConnectionMonitorProps) {
  const [lastPingSuccess, setLastPingSuccess] = useState<number>(Date.now());
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up lifecycle
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
    };
  }, []);

  // Setup ping system to keep connection alive and verify connectivity
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;
    
    // Initial connection check with slight delay to allow other systems to initialize
    connectionCheckTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        performConnectionCheck().then(success => {
          if (success) setLastPingSuccess(Date.now());
        });
      }
    }, 1500);
    
    // Set up regular ping interval (30s)
    pingIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      
      // Check if it's been too long since last successful ping
      const timeSinceLastSuccess = Date.now() - lastPingSuccess;
      if (timeSinceLastSuccess > 60000) { // 60 seconds
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
        performConnectionCheck().then(success => {
          if (success) setLastPingSuccess(Date.now());
        });
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      if (connectionCheckTimeoutRef.current !== null) {
        clearTimeout(connectionCheckTimeoutRef.current);
        connectionCheckTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current !== null) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [conversationId, isConnected, lastPingSuccess, performConnectionCheck, toast]);

  return {
    lastPingSuccess,
    setLastPingSuccess
  };
}
