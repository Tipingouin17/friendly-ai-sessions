
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

export function useSessionLoadingState(
  sessionMountedRef: React.RefObject<boolean>,
  recoveryTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  connectionAttempts: number,
  hasInitializedProvider: boolean
) {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Set up recovery timer for stuck loading state
  useEffect(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
    }
    
    // Only set the recovery timer if we're still loading and the session is mounted
    if (isLoading && sessionMountedRef.current) {
      recoveryTimerRef.current = setTimeout(() => {
        if (isLoading && sessionMountedRef.current && !hasInitializedProvider) {
          console.log("Session page appears stuck in loading state, triggering recovery");
          if (connectionAttempts === 0) {
            toast({
              title: "Connection issue detected",
              description: "The session is taking longer than expected to load.",
              variant: "destructive",
            });
          }
        }
      }, 10000); // Check after 10 seconds
    }

    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, [isLoading, toast, connectionAttempts, hasInitializedProvider, recoveryTimerRef, sessionMountedRef]);

  return { isLoading, setIsLoading };
}
