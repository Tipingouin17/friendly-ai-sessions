
import { useState, useCallback, useRef, useEffect } from "react";
import { createPingChannel, performDatabasePing } from "@/utils/connectionPingUtils";

interface UseConnectionCheckerProps {
  conversationId: number | null;
  refetch: () => void;
  setIsConnected: (connected: boolean) => void;
  setError: (error: string) => void;
}

export function useConnectionChecker({
  conversationId,
  refetch,
  setIsConnected,
  setError
}: UseConnectionCheckerProps) {
  const [isPerformingConnectionCheck, setIsPerformingConnectionCheck] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const mountedRef = useRef(true);
  const lastSuccessfulCheckRef = useRef(Date.now());

  // Set up lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Enhanced connection check with resilience
  const performConnectionCheck = useCallback(async () => {
    if (!conversationId || isPerformingConnectionCheck || !mountedRef.current) return false;

    setIsPerformingConnectionCheck(true);

    try {

      // Try channel-based ping first
      const pingResult = await createPingChannel(conversationId);

      if (!mountedRef.current) return false;

      if (pingResult) {
        setIsConnected(true);
        setConsecutiveFailures(0);
        lastSuccessfulCheckRef.current = Date.now();

        // If we got a successful ping, refresh our state
        refetch();
        setIsPerformingConnectionCheck(false);
        return true;
      }

      // Fallback to database query if channel approach fails
      const databasePingResult = await performDatabasePing(conversationId);

      if (!mountedRef.current) return false;

      if (databasePingResult) {
        setIsConnected(true);
        setConsecutiveFailures(0);
        lastSuccessfulCheckRef.current = Date.now();

        // If we got data, refresh our state
        refetch();
        setIsPerformingConnectionCheck(false);
        return true;
      }

      // Handle failure with resilience
      const newFailureCount = consecutiveFailures + 1;
      setConsecutiveFailures(newFailureCount);

      // Only mark as "lost" after multiple consecutive failures AND significant time passed
      const timeSinceLastSuccess = Date.now() - lastSuccessfulCheckRef.current;
      const shouldMarkAsLost = newFailureCount >= 3 && timeSinceLastSuccess > 30000; // 30 seconds

      if (shouldMarkAsLost) {
        console.error("❌ Connection marked as lost after multiple failures");
        setError("Connection to server lost");
      } else { /* no-op */ }

      setIsPerformingConnectionCheck(false);
      return false;
    } catch (err) {
      if (!mountedRef.current) return false;

      const newFailureCount = consecutiveFailures + 1;
      setConsecutiveFailures(newFailureCount);

      console.error("💥 Error in performConnectionCheck:", err, {
        consecutiveFailures: newFailureCount
      });

      // Only set error after multiple failures
      if (newFailureCount >= 3) {
        setError("Unable to check connection status");
      }

      setIsPerformingConnectionCheck(false);
      return false;
    }
  }, [conversationId, setIsConnected, setError, refetch, isPerformingConnectionCheck, consecutiveFailures]);

  return {
    performConnectionCheck,
    isPerformingConnectionCheck,
    consecutiveFailures
  };
}
