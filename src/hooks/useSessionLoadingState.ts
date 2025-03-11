
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";

export function useSessionLoadingState(
  sessionMountedRef: React.RefObject<boolean>,
  recoveryTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  connectionAttempts: number,
  hasInitializedProvider: boolean
) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStartTime] = useState(Date.now());
  const recoveryAttemptsMade = useRef(0);
  const { toast } = useToast();
  const lastLoadingState = useRef<boolean>(true);
  const forceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track loading state changes to help with debugging
  useEffect(() => {
    if (lastLoadingState.current !== isLoading) {
      console.log(`Loading state changed: ${lastLoadingState.current} -> ${isLoading}`);
      lastLoadingState.current = isLoading;
    }
  }, [isLoading]);

  // Ensure we don't get stuck in loading state - force it to false after a reasonable timeout
  useEffect(() => {
    if (!sessionMountedRef.current) return;
    
    // Set a maximum time that the loading state can remain true
    forceTimeoutRef.current = setTimeout(() => {
      if (isLoading && sessionMountedRef.current) {
        console.log("Maximum loading time reached, forcing loading state to false");
        setIsLoading(false);
        toast({
          title: "Session Ready",
          description: "You can now participate in the session."
        });
      }
    }, 10000); // Max 10 seconds of loading
    
    return () => {
      if (forceTimeoutRef.current) {
        clearTimeout(forceTimeoutRef.current);
        forceTimeoutRef.current = null;
      }
    };
  }, [isLoading, toast, sessionMountedRef]);

  // Set up recovery timer for stuck loading state with shorter timeouts
  useEffect(() => {
    // Skip if not mounted yet
    if (!sessionMountedRef.current) return;
    
    // Clear any existing timers to prevent duplicates
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    
    // Log current loading state
    console.log(`Loading state: loading=${isLoading}, hasInitializedProvider=${hasInitializedProvider}, attempts=${connectionAttempts}, recoveryAttempts=${recoveryAttemptsMade.current}`);
    
    // Check if we should cancel loading - either we're not loading anymore or provider is initialized
    if (!isLoading || hasInitializedProvider) {
      console.log("No need for recovery timer - loading completed or provider initialized");
      return;
    }
    
    // More aggressive recovery timing to prevent long loading states
    const recoveryTime = Math.min(2000 + (recoveryAttemptsMade.current * 1000), 5000);
    const loadingTime = Date.now() - loadingStartTime;
    
    // Only set the recovery timer if we're still loading and the session is mounted
    recoveryTimerRef.current = setTimeout(() => {
      if (!sessionMountedRef.current) return;
      
      if (isLoading && !hasInitializedProvider) {
        recoveryAttemptsMade.current += 1;
        
        console.log(`Session loading stuck for ${loadingTime/1000}s, recovery attempt ${recoveryAttemptsMade.current}`);
        
        // Show toast on first recovery attempt or after significant time
        if (connectionAttempts === 0 || recoveryAttemptsMade.current === 1 || recoveryAttemptsMade.current % 2 === 0) {
          toast({
            title: "Connecting to session",
            description: "Please wait while we connect you to the session...",
          });
        }
        
        // Force loading state to false after multiple recovery attempts or after a long time
        if (recoveryAttemptsMade.current >= 2 || loadingTime > 5000) {
          console.log("Forcing loading state to false after multiple recovery attempts");
          setIsLoading(false);
        }
      }
    }, recoveryTime);

    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    };
  }, [isLoading, toast, connectionAttempts, hasInitializedProvider, recoveryTimerRef, sessionMountedRef, loadingStartTime]);

  return { isLoading, setIsLoading };
}
