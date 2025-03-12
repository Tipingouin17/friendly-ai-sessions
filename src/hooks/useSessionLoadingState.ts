
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
  const isAdminSession = useRef(sessionStorage.getItem('isAdminSession') === 'true');
  const hasToastShown = useRef(false);

  // Track loading state changes
  useEffect(() => {
    if (lastLoadingState.current !== isLoading) {
      console.log(`Loading state changed: ${lastLoadingState.current} -> ${isLoading}`);
      lastLoadingState.current = isLoading;
    }
  }, [isLoading]);

  // Handle loading timeout
  useEffect(() => {
    if (!sessionMountedRef.current) return;
    
    // Don't force loading state changes for admin sessions
    if (isAdminSession.current) {
      console.log("Admin session: Not forcing loading state changes");
      return;
    }
    
    const timeoutDuration = 10000;
    
    forceTimeoutRef.current = setTimeout(() => {
      if (isLoading && sessionMountedRef.current && !hasToastShown.current) {
        hasToastShown.current = true;
        setIsLoading(false);
        
        if (!hasToastShown.current) {
          toast({
            title: "Session Ready",
            description: "You can now participate in the session."
          });
        }
      }
    }, timeoutDuration);
    
    return () => {
      if (forceTimeoutRef.current) {
        clearTimeout(forceTimeoutRef.current);
      }
    };
  }, [isLoading, toast, sessionMountedRef]);

  return { isLoading, setIsLoading };
}
