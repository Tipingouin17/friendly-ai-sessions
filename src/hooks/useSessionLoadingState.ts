
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
  const isAdminSession = useRef(sessionStorage.getItem('isAdminSession') === 'true' || 
                              window.location.pathname.includes('/admin'));
  const hasToastShown = useRef(false);
  const criticalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track loading state changes
  useEffect(() => {
    if (lastLoadingState.current !== isLoading) {
      console.log(`Loading state changed: ${lastLoadingState.current} -> ${isLoading}`);
      lastLoadingState.current = isLoading;
    }
  }, [isLoading]);

  // Handle loading timeout and initialization - different handling for admin
  useEffect(() => {
    if (!sessionMountedRef.current) return;
    
    // For admin users, set loading to false much faster
    if (isAdminSession.current && isLoading) {
      console.log("Admin session detected - expediting loading state");
      
      // Almost immediate loading state clearing for admin
      forceTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 1000); // Very short timeout for admin sessions
      
      return () => {
        if (forceTimeoutRef.current) {
          clearTimeout(forceTimeoutRef.current);
        }
      };
    }
    
    // Force loading state to false if provider is initialized
    if (hasInitializedProvider && isLoading) {
      console.log("Provider initialized, setting loading to false");
      setIsLoading(false);
      return;
    }
    
    // Regular timeout for participant sessions
    const timeoutDuration = isAdminSession.current ? 3000 : 5000;
    
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

  // Critical timeout to ensure admin is never stuck in loading
  useEffect(() => {
    if (isAdminSession.current && isLoading) {
      console.log("Setting up critical admin loading timeout");
      
      criticalTimeoutRef.current = setTimeout(() => {
        console.log("Critical admin timeout reached - forcing loading to false");
        setIsLoading(false);
      }, 2000); // Very short critical timeout for admin
      
      return () => {
        if (criticalTimeoutRef.current) {
          clearTimeout(criticalTimeoutRef.current);
        }
      };
    }
  }, [isLoading]);

  // Clear loading state when provider is initialized
  useEffect(() => {
    if (hasInitializedProvider && isLoading) {
      console.log("Provider initialized, clearing loading state");
      setIsLoading(false);
    }
  }, [hasInitializedProvider, isLoading]);

  return { isLoading, setIsLoading };
}
