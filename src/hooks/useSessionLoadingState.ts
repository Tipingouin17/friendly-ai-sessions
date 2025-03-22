
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
  const hasTriedForceUnlock = useRef(false);

  // Debug loading state
  useEffect(() => {
    console.log(`Session loading state initialized at ${new Date().toISOString()}`, {
      loadingStartTime,
      connectionAttempts,
      hasInitializedProvider,
      isAdmin: isAdminSession.current,
      pathName: window.location.pathname
    });
    
    // Critical timeout for ALL sessions - after this, we must show content
    const criticalTime = isAdminSession.current ? 7000 : 10000;
    
    criticalTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.log("CRITICAL TIMEOUT: Forcing loading state to false after", criticalTime, "ms");
        setIsLoading(false);
        
        toast({
          title: "Session loaded",
          description: "The session took longer than expected to load, but should be ready now.",
        });
      }
    }, criticalTime);
    
    return () => {
      if (criticalTimeoutRef.current) {
        clearTimeout(criticalTimeoutRef.current);
      }
    };
  }, [loadingStartTime, connectionAttempts, toast]);

  // Track loading state changes
  useEffect(() => {
    if (lastLoadingState.current !== isLoading) {
      console.log(`Loading state changed: ${lastLoadingState.current} -> ${isLoading}`, {
        timeElapsed: Date.now() - loadingStartTime,
        connectionAttempts,
        hasInitializedProvider
      });
      lastLoadingState.current = isLoading;
    }
  }, [isLoading, loadingStartTime, connectionAttempts, hasInitializedProvider]);

  // Force unlock loading state if stuck for too long
  useEffect(() => {
    if (!isLoading || hasTriedForceUnlock.current) return;
    
    const timeElapsed = Date.now() - loadingStartTime;
    
    // If we've been loading for more than 5 seconds and have provider initialized
    if (timeElapsed > 5000 && hasInitializedProvider && isLoading) {
      console.log("Force unlocking loading state after 5s with initialized provider");
      setIsLoading(false);
      hasTriedForceUnlock.current = true;
    }
    
    // For participant sessions that have attempted connections
    if (timeElapsed > 8000 && connectionAttempts > 0 && isLoading && !isAdminSession.current) {
      console.log("Force unlocking loading state after 8s for participant with connection attempts");
      setIsLoading(false);
      hasTriedForceUnlock.current = true;
      
      if (!hasToastShown.current) {
        toast({
          title: "Session Ready",
          description: "You can now participate in the session."
        });
        hasToastShown.current = true;
      }
    }
  }, [isLoading, loadingStartTime, hasInitializedProvider, connectionAttempts, toast]);

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
    const timeoutDuration = isAdminSession.current ? 2000 : 4000;
    
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
  }, [isLoading, toast, sessionMountedRef, hasInitializedProvider, connectionAttempts, loadingStartTime]);

  // Detect and handle potential deadlocks
  useEffect(() => {
    const timeSinceStart = Date.now() - loadingStartTime;
    
    // If we're still loading after 12 seconds regardless of state, force refresh
    if (isLoading && timeSinceStart > 12000) {
      console.log("DEADLOCK DETECTED: Session has been loading for too long, forcing page reload");
      toast({
        title: "Session Issue",
        description: "We detected a problem with loading. Refreshing the page...",
        variant: "destructive"
      });
      
      // Set a timeout to reload the page
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isLoading, loadingStartTime, toast]);

  return { isLoading, setIsLoading };
}
