/**
 * use Session Page Effects
 *
 * Hook for the AIfacilitator application.
 */

import { useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

export function useSessionPageEffects({
  isLoading,
  hasInitializedProvider,
  setIsLoading,
  retryConnection,
  isAdmin,
  isOnAdminPath
}: {
  isLoading: boolean;
  hasInitializedProvider: boolean;
  setIsLoading: (loading: boolean) => void;
  retryConnection: () => void;
  isAdmin: boolean;
  isOnAdminPath: boolean;
}) {
  const { toast } = useToast();
  const sessionMountedRef = useRef(true);
  const stateRef = useRef({
    pageLoadTime: Date.now(),
    hasShownToast: false,
    hasSetupTimeout: false,
    initializeTimeout: null as NodeJS.Timeout | null,
    connectionAttempts: 0
  });

  // Set up initialization and safety timeouts
  useEffect(() => {
    if (stateRef.current.hasSetupTimeout) return;
    stateRef.current.hasSetupTimeout = true;
    
    // Different timeouts based on user role
    // PERF FIX: Reduced participant toast timeout from 8s to 4s — the loading
    // screen was silent for too long before giving any feedback to the user.
    const initialTimeout = isOnAdminPath ? 3000 : 4000;
    
    // Set a timeout to check if initialization takes too long
    stateRef.current.initializeTimeout = setTimeout(() => {
      if (sessionMountedRef.current && !stateRef.current.hasShownToast) {
        
        if (isLoading && !hasInitializedProvider) {
          stateRef.current.hasShownToast = true;
          
          // Skip toast for admin
          if (!isOnAdminPath && !isAdmin) {
            toast({
              title: "Loading your session",
              description: "Please wait while we connect you to the session.",
            });
          }
        }
      }
    }, initialTimeout);
    
    // Critical safety timeout:
    // - Admins: 10s (they need the UI to appear quickly)
    // - Participants: 60s (Railway cold-start can take 30-60s; SessionConnecting shows progress UI)
    // NOTE: We do NOT call setIsLoading(false) for participants — that causes the blank page.
    // The SessionConnecting component handles the UX during the cold-start wait.
    const criticalTimeout = isOnAdminPath ? 10000 : 60000;
    
    const criticalTimer = setTimeout(() => {
      if (sessionMountedRef.current && isLoading && !hasInitializedProvider) {
        
        if (isOnAdminPath || isAdmin) {
          // For admins: show a toast and force loading off so they see the UI
          if (!stateRef.current.hasShownToast) {
            stateRef.current.hasShownToast = true;
            toast({
              title: "Connection issue",
              description: "Having trouble loading the session. We'll keep trying to connect.",
              variant: "destructive"
            });
          }
          if (isLoading && sessionMountedRef.current) {
            setIsLoading(false);
          }
        }
        // For participants: just trigger one final retry; SessionConnecting already shows progress
        if (sessionMountedRef.current) {
          retryConnection();
        }
      }
    }, criticalTimeout);
    
    return () => {
      if (stateRef.current.initializeTimeout) {
        clearTimeout(stateRef.current.initializeTimeout);
        stateRef.current.initializeTimeout = null;
      }
      clearTimeout(criticalTimer);
      sessionMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessionMountedRef
  };
}
