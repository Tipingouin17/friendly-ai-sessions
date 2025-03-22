
import { useRef, useEffect, useCallback } from "react";
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
    
    console.log("Session page mounted", {
      time: new Date().toISOString(),
      isAdmin,
      isLoading,
      path: window.location.pathname
    });
    
    // Different timeouts based on user role
    const initialTimeout = isOnAdminPath ? 3000 : 5000;
    
    // Set a timeout to check if initialization takes too long
    stateRef.current.initializeTimeout = setTimeout(() => {
      if (sessionMountedRef.current && !stateRef.current.hasShownToast) {
        console.log("Session initialization status:", {
          isLoading,
          hasInitializedProvider
        });
        
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
    
    // Additional critical safety timeout
    const criticalTimeout = isOnAdminPath ? 5000 : 8000;
    
    setTimeout(() => {
      if (sessionMountedRef.current && isLoading && !hasInitializedProvider) {
        console.log("Critical timeout reached, session may be stuck");
        
        // Skip toast for admin
        if (!isOnAdminPath && !isAdmin && !stateRef.current.hasShownToast) {
          stateRef.current.hasShownToast = true;
          toast({
            title: "Connection issue",
            description: "Having trouble loading the session. We'll keep trying to connect.",
            variant: "destructive"
          });
        }
        
        // Force clean state to allow UI to render - ONLY if still needed
        if (isLoading && sessionMountedRef.current) {
          setIsLoading(false);
        }
        
        // Try to reconnect
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
      sessionMountedRef.current = false;
    };
  }, [isLoading, hasInitializedProvider, toast, retryConnection, isAdmin, isOnAdminPath, setIsLoading]);

  return {
    sessionMountedRef
  };
}
