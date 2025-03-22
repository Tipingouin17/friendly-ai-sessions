
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
  const pageLoadTime = useRef(Date.now());
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownToastRef = useRef(false);
  
  // Check for admin status from URL path - most reliable method
  const isOnAdminPath = window.location.pathname.includes('/admin');
  
  // Log initialization on mount and set up safety timeouts
  useEffect(() => {
    console.log("Session page mounted", {
      time: new Date().toISOString(),
      isAdmin,
      hasError: !!error,
      noSessionFound,
      isLoading,
      path: window.location.pathname
    });
    
    sessionMountedRef.current = true;
    
    // Different timeouts based on user role - shorter for both
    const initialTimeout = isOnAdminPath ? 3000 : 5000;
    
    // Set a timeout to check if initialization takes too long
    initializeTimeoutRef.current = setTimeout(() => {
      if (isLoading && !hasInitializedProvider && sessionMountedRef.current && !hasShownToastRef.current) {
        console.log("Session initialization taking longer than expected");
        hasShownToastRef.current = true;
        
        // Skip toast for admin
        if (!isOnAdminPath && !isAdmin) {
          toast({
            title: "Loading your session",
            description: "Please wait while we connect you to the session.",
          });
        }
      }
    }, initialTimeout);
    
    // Additional critical safety timeout - MUCH shorter now
    const criticalTimeout = isOnAdminPath ? 5000 : 8000;
    
    setTimeout(() => {
      if (isLoading && !hasInitializedProvider && sessionMountedRef.current) {
        console.log("Critical timeout reached, session may be stuck");
        
        // Skip toast for admin
        if (!isOnAdminPath && !isAdmin && !hasShownToastRef.current) {
          hasShownToastRef.current = true;
          toast({
            title: "Connection issue",
            description: "Having trouble loading the session. We'll keep trying to connect.",
            variant: "destructive"
          });
        }
        
        // Force clean state to allow UI to render
        setIsLoading(false);
        setHasInitializedProvider(true);
        
        // Try to reconnect
        retryConnection();
      }
    }, criticalTimeout);
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
        initializeTimeoutRef.current = null;
      }
      sessionMountedRef.current = false;
    };
  }, [isAdmin, error, noSessionFound, isLoading, hasInitializedProvider, toast, 
     setIsLoading, setHasInitializedProvider, sessionMountedRef, retryConnection, isOnAdminPath]);

  // Render the session page
  return (
    <SessionErrorBoundary
      error={error}
      noSessionFound={noSessionFound}
      retryConnection={retryConnection}
      connectionAttempts={connectionAttempts}
      isLoading={isLoading}
      hasInitializedProvider={hasInitializedProvider}
      lastAttemptTime={lastAttemptTime}
      isAdmin={isAdmin || isOnAdminPath}
    >
      <SessionProviderWrapper
        onInitialized={() => {
          console.log(`Provider initialized after ${Date.now() - pageLoadTime.current}ms`);
          
          // Clear initialization timeout
          if (initializeTimeoutRef.current) {
            clearTimeout(initializeTimeoutRef.current);
            initializeTimeoutRef.current = null;
          }
          
          setHasInitializedProvider(true);
          
          // For admin, ensure we're not stuck in loading
          if ((isAdmin || isOnAdminPath) && isLoading) {
            console.log("Admin detected, clearing loading state");
            setIsLoading(false);
          }
        }}
        onLoading={setIsLoading}
        onError={handleError}
        handleSessionFull={handleSessionFull}
        retryConnection={retryConnection}
        connectionAttempts={connectionAttempts}
        error={error}
        sessionMountedRef={sessionMountedRef}
        isAdmin={isAdmin || isOnAdminPath}
      />
    </SessionErrorBoundary>
  );
};

export default Session;
