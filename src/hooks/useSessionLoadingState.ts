
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

  // Track loading state changes to help with debugging
  useEffect(() => {
    if (lastLoadingState.current !== isLoading) {
      console.log(`Loading state changed: ${lastLoadingState.current} -> ${isLoading}`);
      lastLoadingState.current = isLoading;
    }
  }, [isLoading]);

  // Ensure we don't get stuck in loading state - force it to false after a reasonable timeout
  // Use a more aggressive approach for admin sessions
  useEffect(() => {
    if (!sessionMountedRef.current) return;
    
    const timeoutDuration = isAdminSession.current ? 5000 : 10000;
    
    // Set a maximum time that the loading state can remain true
    forceTimeoutRef.current = setTimeout(() => {
      if (isLoading && sessionMountedRef.current) {
        console.log(`Maximum loading time of ${timeoutDuration}ms reached, forcing loading state to false`);
        setIsLoading(false);
        
        // For admin sessions, make sure we inform about admin status
        if (isAdminSession.current) {
          toast({
            title: "Admin Dashboard Ready",
            description: "You can now manage the session."
          });
        } else {
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
    console.log(`Loading state: loading=${isLoading}, hasInitializedProvider=${hasInitializedProvider}, attempts=${connectionAttempts}, recoveryAttempts=${recoveryAttemptsMade.current}, isAdmin=${isAdminSession.current}`);
    
    // Check if we should cancel loading - either we're not loading anymore or provider is initialized
    if (!isLoading || hasInitializedProvider) {
      console.log("No need for recovery timer - loading completed or provider initialized");
      return;
    }
    
    // Use even more aggressive recovery timing for admin sessions
    const baseRecoveryTime = isAdminSession.current ? 1500 : 2000;
    const recoveryTime = Math.min(baseRecoveryTime + (recoveryAttemptsMade.current * 1000), isAdminSession.current ? 3000 : 5000);
    const loadingTime = Date.now() - loadingStartTime;
    
    // Only set the recovery timer if we're still loading and the session is mounted
    recoveryTimerRef.current = setTimeout(() => {
      if (!sessionMountedRef.current) return;
      
      if (isLoading && !hasInitializedProvider) {
        recoveryAttemptsMade.current += 1;
        
        console.log(`Session loading stuck for ${loadingTime/1000}s, recovery attempt ${recoveryAttemptsMade.current}, isAdmin=${isAdminSession.current}`);
        
        // Show toast on first recovery attempt or after significant time
        if (connectionAttempts === 0 || recoveryAttemptsMade.current === 1) {
          toast({
            title: isAdminSession.current ? "Loading admin session" : "Connecting to session",
            description: isAdminSession.current ? 
              "Please wait while we set up your admin dashboard..." : 
              "Please wait while we connect you to the session...",
          });
        }
        
        // Force loading state to false more aggressively for admin sessions
        const forceThreshold = isAdminSession.current ? 1 : 2;
        const timeThreshold = isAdminSession.current ? 3000 : 5000;
        
        if (recoveryAttemptsMade.current >= forceThreshold || loadingTime > timeThreshold) {
          console.log(`Forcing loading state to false after ${recoveryAttemptsMade.current} recovery attempts or ${loadingTime}ms of loading`);
          setIsLoading(false);
          
          // Reinforce admin status if needed
          if (isAdminSession.current) {
            sessionStorage.setItem('isAdminSession', 'true');
          }
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
