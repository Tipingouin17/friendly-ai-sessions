/**
 * use Session State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useCallback } from "react";

export function useSessionState() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [hasInitializedProvider, setHasInitializedProvider] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Handle session full state
  const handleSessionFull = useCallback(() => {
    // Auto-start session when it's full
    setSessionStarted(true);
  }, []);

  return { 
    sessionStarted, 
    setSessionStarted, 
    hasInitializedProvider, 
    setHasInitializedProvider,
    error,
    setError,
    handleSessionFull 
  };
}
