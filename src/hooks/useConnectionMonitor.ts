
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
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastShownRef = useRef(false);

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

  // Setup enhanced ping system with quality monitoring
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;
    
    // Initial connection check with delay to allow initialization
    connectionCheckTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        performConnectionCheck().then(success => {
          if (success) {
            setLastPingSuccess(Date.now());
            setConnectionQuality('good');
          }
        });
      }
    }, 3000); // Increased initial delay
    
    // Set up regular ping interval (45s instead of 30s)
    pingIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      
      const timeSinceLastSuccess = Date.now() - lastPingSuccess;
      
      // Update connection quality based on time since last success
      if (timeSinceLastSuccess > 120000) { // 2 minutes
        setConnectionQuality('offline');
      } else if (timeSinceLastSuccess > 60000) { // 1 minute
        setConnectionQuality('poor');
      } else {
        setConnectionQuality('good');
      }
      
      // Only perform active check if connection appears poor
      if (connectionQuality === 'poor' || timeSinceLastSuccess > 90000) {
        performConnectionCheck().then(success => {
          if (success) {
            setLastPingSuccess(Date.now());
            setConnectionQuality('good');
            toastShownRef.current = false; // Reset toast flag on success
          } else if (timeSinceLastSuccess > 120000 && !toastShownRef.current) {
            // Only show toast for extended issues, not temporary hiccups
            toastShownRef.current = true;
            toast({
              title: "Connection quality poor",
              description: "Session may be experiencing connectivity issues.",
              variant: "destructive",
            });
          }
        });
      }
    }, 45000); // Check every 45 seconds
    
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
  }, [conversationId, isConnected, lastPingSuccess, performConnectionCheck, toast, connectionQuality]);

  return {
    lastPingSuccess,
    setLastPingSuccess,
    connectionQuality
  };
}
