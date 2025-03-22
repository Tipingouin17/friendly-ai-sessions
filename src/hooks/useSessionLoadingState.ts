
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export function useSessionLoadingState(
  sessionMountedRef: React.RefObject<boolean>,
  recoveryTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  connectionAttempts: number,
  hasInitializedProvider: boolean
) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStartTime] = useState(Date.now());
  const { toast } = useToast();
  const navigate = useNavigate();
  const lastLoadingState = useRef<boolean>(true);
  const forceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const criticalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriedForceUnlock = useRef(false);
  const timeoutSetRef = useRef(false);
  
  // Check for admin status in the URL path using a ref - most reliable method
  const isOnAdminPath = useRef(window.location.pathname.includes('/admin'));
  
  // For participant paths, don't use session storage to detect admin status in a way that causes re-renders
  // This prevents admin session conflicts affecting participant experience
  const isAdminSession = useRef(isOnAdminPath.current || window.location.search.includes('admin=true'));

  // Debug loading state
  useEffect(() => {
    // Don't set up timeouts if they've already been set
    if (timeoutSetRef.current) return;
    
    timeoutSetRef.current = true;
    
    console.log(`Session loading state initialized at ${new Date().toISOString()}`, {
      loadingStartTime,
      connectionAttempts,
      hasInitializedProvider,
      isAdmin: isAdminSession.current,
      pathName: window.location.pathname
    });
    
    // Critical timeout - different for admin vs participant
    const criticalTime = isAdminSession.current ? 5000 : 8000;
    
    criticalTimeoutRef.current = setTimeout(() => {
      if (isLoading && sessionMountedRef.current) {
        console.log("CRITICAL TIMEOUT: Forcing loading state to false after", criticalTime, "ms");
        setIsLoading(false);
        
        // Skip toast for admin sessions
        if (!isAdminSession.current) {
          toast({
            title: "Session loaded",
            description: "The session took longer than expected to load, but should be ready now.",
          });
        }
      }
    }, criticalTime);
    
    return () => {
      if (criticalTimeoutRef.current) {
        clearTimeout(criticalTimeoutRef.current);
      }
    };
  }, [loadingStartTime, connectionAttempts, toast, sessionMountedRef, isLoading]);

  // Track loading state changes
  useEffect(() => {
    if (lastLoadingState.current !== isLoading && sessionMountedRef.current) {
      console.log(`Loading state changed: ${lastLoadingState.current} -> ${isLoading}`, {
        timeElapsed: Date.now() - loadingStartTime,
        connectionAttempts,
        hasInitializedProvider
      });
      lastLoadingState.current = isLoading;
    }
  }, [isLoading, loadingStartTime, connectionAttempts, hasInitializedProvider, sessionMountedRef]);

  // Force unlock loading state if stuck for too long - but only once
  useEffect(() => {
    if (!isLoading || hasTriedForceUnlock.current || !sessionMountedRef.current) return;
    
    const timeElapsed = Date.now() - loadingStartTime;
    
    // If we've been loading for more than 4 seconds and have provider initialized
    if (timeElapsed > 4000 && hasInitializedProvider && isLoading) {
      console.log("Force unlocking loading state with initialized provider");
      setIsLoading(false);
      hasTriedForceUnlock.current = true;
    }
    
    // For participant sessions that have attempted connections
    if (timeElapsed > 6000 && connectionAttempts > 0 && isLoading && !isAdminSession.current) {
      console.log("Force unlocking loading state for participant with connection attempts");
      setIsLoading(false);
      hasTriedForceUnlock.current = true;
      
      toast({
        title: "Session Ready",
        description: "You can now participate in the session."
      });
    }
  }, [isLoading, loadingStartTime, hasInitializedProvider, connectionAttempts, toast, sessionMountedRef]);

  // Handle loading timeout and initialization - different handling for admin
  useEffect(() => {
    if (!sessionMountedRef.current) return;
    
    // Don't set up a new timeout if one exists
    if (forceTimeoutRef.current) return;
    
    // For admin, set loading to false immediately without changing state during render
    if (isAdminSession.current && isLoading) {
      console.log("Admin session detected - expediting loading state");
      setIsLoading(false);
      return;
    }
    
    // Force loading state to false if provider is initialized
    if (hasInitializedProvider && isLoading) {
      console.log("Provider initialized, setting loading to false");
      setIsLoading(false);
      return;
    }
    
    // Regular timeout for participant sessions (shorter now for better UX)
    const timeoutDuration = 3000;
    
    forceTimeoutRef.current = setTimeout(() => {
      if (isLoading && sessionMountedRef.current) {
        console.log("Forcing loading state to false after timeout");
        setIsLoading(false);
        
        toast({
          title: "Session Ready",
          description: "You can now participate in the session."
        });
      }
    }, timeoutDuration);
    
    return () => {
      if (forceTimeoutRef.current) {
        clearTimeout(forceTimeoutRef.current);
      }
    };
  }, [isLoading, toast, sessionMountedRef, hasInitializedProvider]);

  return { isLoading, setIsLoading };
}
