
import { useState, useEffect, useRef } from "react";

export function useSessionLoadingState(
  sessionMountedRef: React.RefObject<boolean>,
  recoveryTimerRef: React.RefObject<NodeJS.Timeout | null>,
  connectionAttempts: number,
  hasInitializedProvider: boolean
) {
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadingSetRef = useRef(false);
  const loadingUpdateInProgressRef = useRef(false);
  
  // Guards against infinite updates by using useRef
  const previousConnectionAttemptsRef = useRef(connectionAttempts);
  const previousInitializedRef = useRef(hasInitializedProvider);
  
  // Safer setIsLoading function that prevents rapid state changes
  const safeSetIsLoading = (newLoadingState: boolean) => {
    // Skip setting the same state again
    if (newLoadingState === isLoading) return;
    
    // Prevent concurrent state updates
    if (loadingUpdateInProgressRef.current) return;
    
    loadingUpdateInProgressRef.current = true;
    setIsLoading(newLoadingState);
    
    // Reset the guard after a small delay
    setTimeout(() => {
      loadingUpdateInProgressRef.current = false;
    }, 50);
  };
  
  // Clear loading state under specific conditions
  useEffect(() => {
    const shouldUpdate = 
      connectionAttempts !== previousConnectionAttemptsRef.current || 
      hasInitializedProvider !== previousInitializedRef.current;
    
    if (!shouldUpdate) return;
    
    previousConnectionAttemptsRef.current = connectionAttempts;
    previousInitializedRef.current = hasInitializedProvider;
    
    // If provider is initialized, we're no longer loading
    if (hasInitializedProvider && isLoading) {
      console.log("Provider initialized, clearing loading state");
      safeSetIsLoading(false);
    }
    
    // Special case for when the connection attempt changes
    if (connectionAttempts > 0 && !initialLoadingSetRef.current) {
      initialLoadingSetRef.current = true;
      
      // Handle loading for reconnects - delay by reconnection attempts
      const loadingTimeout = setTimeout(() => {
        if (sessionMountedRef.current && !hasInitializedProvider) {
          // Only show loading if needed
          console.log(`Setting loading state to true after connection attempt ${connectionAttempts}`);
          safeSetIsLoading(true);
        }
      }, Math.min(connectionAttempts * 500, 1500));
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [connectionAttempts, hasInitializedProvider, isLoading, sessionMountedRef]);
  
  return { isLoading, setIsLoading: safeSetIsLoading };
}
