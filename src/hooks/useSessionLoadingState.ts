
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

  // Handle loading timeout and initialization
  useEffect(() => {
    if (!sessionMountedRef.current) return;
    
    // Force loading state to false if provider is initialized
    if (hasInitializedProvider && isLoading) {
      console.log("Provider initialized, setting loading to false");
      setIsLoading(false);
      return;
    }
    
    const timeoutDuration = isAdminSession.current ? 8000 : 5000;
    
    forceTimeoutRef.current = setTimeout(() => {
      if (isLoading && sessionMountedRef.current) {
        console.log("Forcing loading state to false after timeout");
        setIsLoading(false);
        
        if (!hasToastShown.current) {
          hasToastShown.current = true;
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
  }, [isLoading, toast, sessionMountedRef, hasInitializedProvider]);

  // Clear loading state when provider is initialized
  useEffect(() => {
    if (hasInitializedProvider && isLoading) {
      console.log("Provider initialized, clearing loading state");
      setIsLoading(false);
    }
  }, [hasInitializedProvider, isLoading]);

  return { isLoading, setIsLoading };
}
