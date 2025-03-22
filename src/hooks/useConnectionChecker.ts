
import { useState, useCallback, useRef } from "react";
import { createPingChannel, performDatabasePing } from "@/utils/connectionPingUtils";

interface UseConnectionCheckerProps {
  conversationId: number | null;
  refetch: () => void;
  setIsConnected: () => void;
  setError: (error: string) => void;
}

export function useConnectionChecker({
  conversationId,
  refetch,
  setIsConnected,
  setError
}: UseConnectionCheckerProps) {
  const [isPerformingConnectionCheck, setIsPerformingConnectionCheck] = useState(false);
  const mountedRef = useRef(true);
  
  // Set up lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Function to perform a connection check
  const performConnectionCheck = useCallback(async () => {
    if (!conversationId || isPerformingConnectionCheck || !mountedRef.current) return false;
    
    setIsPerformingConnectionCheck(true);
    
    try {
      console.log("Performing connection check...");
      
      // Try channel-based ping first
      const pingResult = await createPingChannel(conversationId);
      
      if (!mountedRef.current) return false;
      
      if (pingResult) {
        console.log("Connection check successful (channel subscription worked)");
        setIsConnected();
        
        // If we got a successful ping, might as well refresh our state
        refetch();
        setIsPerformingConnectionCheck(false);
        return true;
      }
      
      // Fallback to database query if channel approach fails
      const databasePingResult = await performDatabasePing(conversationId);
      
      if (!mountedRef.current) return false;
      
      if (databasePingResult) {
        console.log("Connection check successful (query worked)");
        setIsConnected();
        
        // If we got data, might as well refresh our state
        refetch();
        setIsPerformingConnectionCheck(false);
        return true;
      }
      
      // If we get here, all connection checks failed
      console.log("All connection checks failed");
      setError("Connection to server lost");
      setIsPerformingConnectionCheck(false);
      return false;
    } catch (err) {
      if (!mountedRef.current) return false;
      
      console.error("Error in performConnectionCheck:", err);
      setError("Unable to check connection status");
      setIsPerformingConnectionCheck(false);
      return false;
    }
  }, [conversationId, setIsConnected, setError, refetch, isPerformingConnectionCheck]);

  return {
    performConnectionCheck,
    isPerformingConnectionCheck
  };
}

// Add missing imports
import { useEffect } from "react";
