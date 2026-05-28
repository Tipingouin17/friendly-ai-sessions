/**
 * use Session Loading State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useRef } from "react";

export function useSessionLoadingState(
  sessionMountedRef: React.RefObject<boolean>,
  recoveryTimerRef: React.RefObject<NodeJS.Timeout | null>,
  connectionAttempts: number,
  hasInitializedProvider: boolean
) {
  const [isLoading, setIsLoading] = useState(true);
  const stateRef = useRef({
    initialLoadingSetRef: false,
    loadingUpdateInProgress: false,
    previousConnectionAttempts: connectionAttempts,
    previousInitialized: hasInitializedProvider
  });
  
  // Safer setIsLoading function that prevents rapid state changes
  const safeSetIsLoading = (newLoadingState: boolean) => {
    // Skip setting the same state again
    if (newLoadingState === isLoading) return;
    
    // Prevent concurrent state updates
    if (stateRef.current.loadingUpdateInProgress) return;
    
    stateRef.current.loadingUpdateInProgress = true;
    setIsLoading(newLoadingState);
    
    // Reset the guard after a small delay
    setTimeout(() => {
      stateRef.current.loadingUpdateInProgress = false;
    }, 100);
  };
  
  // Clear loading state under specific conditions
  useEffect(() => {
    const shouldUpdate = 
      connectionAttempts !== stateRef.current.previousConnectionAttempts || 
      hasInitializedProvider !== stateRef.current.previousInitialized;
    
    if (!shouldUpdate) return;
    
    stateRef.current.previousConnectionAttempts = connectionAttempts;
    stateRef.current.previousInitialized = hasInitializedProvider;
    
    // If provider is initialized, we're no longer loading
    if (hasInitializedProvider && isLoading) {
      safeSetIsLoading(false);
    }
    
    // Special case for when the connection attempt changes
    if (connectionAttempts > 0 && !stateRef.current.initialLoadingSetRef) {
      stateRef.current.initialLoadingSetRef = true;
      
      // Handle loading for reconnects - delay by reconnection attempts
      const loadingTimeout = setTimeout(() => {
        if (sessionMountedRef.current && !hasInitializedProvider) {
          // Only show loading if needed
          safeSetIsLoading(true);
        }
      }, Math.min(connectionAttempts * 500, 1500));
      
      return () => clearTimeout(loadingTimeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [connectionAttempts, hasInitializedProvider, isLoading, sessionMountedRef]);
  
  return { isLoading, setIsLoading: safeSetIsLoading };
}
