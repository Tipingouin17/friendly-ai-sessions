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
  // Full capacity is informational. Only the host-owned, persisted
  // start-session mutation may transition a room into the live state.
  const handleSessionFull = useCallback(() => undefined, []);

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
