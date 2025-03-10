
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
  
  // Log initialization on mount and set up safety timeouts
  useEffect(() => {
    console.log("Session page mounted", {
      time: new Date().toISOString(),
      isAdmin,
      hasError: !!error,
      noSessionFound,
      isLoading
    });
    
    // Different timeouts based on user role
    const initialTimeout = isAdmin ? 5000 : 8000;
    const criticalTimeout = isAdmin ? 8000 : 12000;
    
    // Set a timeout to check if initialization takes too long
    initializeTimeoutRef.current = setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.warn("Session initialization taking longer than expected");
        toast({
          title: "Slow connection detected",
          description: "We're having trouble connecting to the session. Please wait or refresh if needed.",
        });
      }
    }, initialTimeout);
    
    // Additional critical safety timeout
    setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.error("Critical timeout reached, session may be stuck");
        toast({
          title: "Connection problem",
          description: "Unable to establish connection. Please try refreshing the page.",
          variant: "destructive"
        });
        
        // Force clean state to allow UI to render
        setIsLoading(false);
        setHasInitializedProvider(true);
      }
    }, criticalTimeout);
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
        initializeTimeoutRef.current = null;
      }
    };
  }, [isAdmin, error, noSessionFound, isLoading, hasInitializedProvider, toast, setIsLoading, setHasInitializedProvider]);

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
    >
      <SessionProviderWrapper
        onInitialized={() => {
          console.log(`Provider initialized after ${Date.now() - pageLoadTime.current}ms`);
          
          // Clear initialization timeout since we've successfully initialized
          if (initializeTimeoutRef.current) {
            clearTimeout(initializeTimeoutRef.current);
            initializeTimeoutRef.current = null;
          }
          
          setHasInitializedProvider(true);
          
          // If we're in admin mode, ensure we're not stuck in loading
          if (isAdmin && isLoading) {
            console.log("Admin detected, ensuring loading state is properly cleared");
            // Use shorter timeout for admin users
            setTimeout(() => {
              setIsLoading(false);
            }, 300);
          }
        }}
        onLoading={setIsLoading}
        onError={handleError}
        handleSessionFull={handleSessionFull}
        retryConnection={retryConnection}
        connectionAttempts={connectionAttempts}
        error={error}
        sessionMountedRef={sessionMountedRef}
        isAdmin={isAdmin}
      />
    </SessionErrorBoundary>
  );
};

export default Session;
