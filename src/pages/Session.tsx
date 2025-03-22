
import React, { useRef, useEffect } from "react";
import { useSessionPage } from "@/hooks/useSessionPage";
import SessionProviderWrapper from "@/components/session/SessionProviderWrapper";
import SessionErrorBoundary from "@/components/session/SessionErrorBoundary";
import { useToast } from "@/components/ui/use-toast";

const Session = () => {
  // Use our custom hook for session page state
  const {
    isAdmin,
    sessionStarted,
    setSessionStarted,
    isLoading,
    setIsLoading,
    error,
    noSessionFound,
    connectionAttempts,
    lastAttemptTime,
    hasInitializedProvider,
    setHasInitializedProvider,
    sessionMountedRef,
    handleError,
    handleSessionFull,
    retryConnection
  } = useSessionPage();
  
  const { toast } = useToast();
  
  // Use refs for state that doesn't need to trigger re-renders
  const stateRef = useRef({
    pageLoadTime: Date.now(),
    hasShownToast: false,
    hasSetupTimeout: false,
    initializeTimeout: null as NodeJS.Timeout | null,
    isOnAdminPath: window.location.pathname.includes('/admin'),
    // Store admin status in ref to prevent loops
    effectiveAdminStatus: isAdmin
  });
  
  // Log initialization on mount and set up safety timeouts - run only once
  useEffect(() => {
    if (stateRef.current.hasSetupTimeout) return;
    stateRef.current.hasSetupTimeout = true;
    
    console.log("Session page mounted", {
      time: new Date().toISOString(),
      isAdmin: stateRef.current.effectiveAdminStatus,
      hasError: !!error,
      noSessionFound,
      isLoading,
      path: window.location.pathname
    });
    
    sessionMountedRef.current = true;
    
    // Different timeouts based on user role
    const initialTimeout = stateRef.current.effectiveAdminStatus ? 3000 : 5000;
    
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
          if (!stateRef.current.effectiveAdminStatus) {
            toast({
              title: "Loading your session",
              description: "Please wait while we connect you to the session.",
            });
          }
        }
      }
    }, initialTimeout);
    
    // Additional critical safety timeout - force loading state to complete if stuck
    const criticalTimeout = stateRef.current.effectiveAdminStatus ? 5000 : 8000;
    
    setTimeout(() => {
      if (sessionMountedRef.current && isLoading && !hasInitializedProvider) {
        console.log("Critical timeout reached, session may be stuck");
        
        // Skip toast for admin
        if (!stateRef.current.effectiveAdminStatus && !stateRef.current.hasShownToast) {
          stateRef.current.hasShownToast = true;
          toast({
            title: "Connection issue",
            description: "Having trouble loading the session. We'll keep trying to connect.",
            variant: "destructive"
          });
        }
        
        // Force clean state to allow UI to render - ONLY if still needed
        if (isLoading) {
          setIsLoading(false);
        }
        
        if (!hasInitializedProvider) {
          setHasInitializedProvider(true);
        }
        
        // Try to reconnect
        retryConnection();
      }
    }, criticalTimeout);
    
    return () => {
      if (stateRef.current.initializeTimeout) {
        clearTimeout(stateRef.current.initializeTimeout);
        stateRef.current.initializeTimeout = null;
      }
      sessionMountedRef.current = false;
    };
  }, [error, noSessionFound, isLoading, hasInitializedProvider, toast, 
     setIsLoading, setHasInitializedProvider, sessionMountedRef, retryConnection]);

  const handleProviderInitialized = () => {
    console.log(`Provider initialized after ${Date.now() - stateRef.current.pageLoadTime}ms`);
    
    // Clear initialization timeout
    if (stateRef.current.initializeTimeout) {
      clearTimeout(stateRef.current.initializeTimeout);
      stateRef.current.initializeTimeout = null;
    }
    
    // Use callback pattern for state updates
    if (!hasInitializedProvider) {
      setHasInitializedProvider(true);
    }
    
    // For admin, ensure we're not stuck in loading
    if (stateRef.current.effectiveAdminStatus && isLoading) {
      console.log("Admin detected, clearing loading state");
      setIsLoading(false);
    }
  };

  // Render the session page with simplified props
  return (
    <SessionErrorBoundary
      error={error}
      noSessionFound={noSessionFound}
      retryConnection={retryConnection}
      connectionAttempts={connectionAttempts}
      isLoading={isLoading}
      hasInitializedProvider={hasInitializedProvider}
      lastAttemptTime={lastAttemptTime}
      isAdmin={stateRef.current.effectiveAdminStatus}
    >
      <SessionProviderWrapper
        onInitialized={handleProviderInitialized}
        onLoading={setIsLoading}
        onError={handleError}
        handleSessionFull={handleSessionFull}
        retryConnection={retryConnection}
        connectionAttempts={connectionAttempts}
        error={error}
        sessionMountedRef={sessionMountedRef}
        isAdmin={stateRef.current.effectiveAdminStatus}
      />
    </SessionErrorBoundary>
  );
};

export default Session;
