
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

  // Set up recovery timer for stuck loading state
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
    
    // Implement a progressive backoff for recovery attempts
    const recoveryTime = Math.min(5000 + (recoveryAttemptsMade.current * 2000), 15000);
    const loadingTime = Date.now() - loadingStartTime;
    
    // Only set the recovery timer if we're still loading and the session is mounted
    recoveryTimerRef.current = setTimeout(() => {
      if (!sessionMountedRef.current) return;
      
      if (isLoading && !hasInitializedProvider) {
        recoveryAttemptsMade.current += 1;
        
        console.log(`Session loading stuck for ${loadingTime/1000}s, recovery attempt ${recoveryAttemptsMade.current}`);
        
        // Only show toast on first recovery attempt or after significant time
        if (connectionAttempts === 0 || recoveryAttemptsMade.current === 1 || recoveryAttemptsMade.current % 3 === 0) {
          toast({
            title: "Connection issue detected",
            description: "The session is taking longer than expected to load. Attempting recovery...",
            variant: "destructive",
          });
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
