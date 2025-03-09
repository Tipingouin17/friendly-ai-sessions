
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
  
  // Log initialization on mount
  useEffect(() => {
    console.log("Session page mounted", {
      time: new Date().toISOString(),
      isAdmin,
      hasError: !!error,
      noSessionFound,
      isLoading
    });
    
    // Set a timeout to check if initialization takes too long
    const timeoutId = setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.warn("Session initialization taking longer than expected");
        toast({
          title: "Slow connection detected",
          description: "We're having trouble connecting to the session. You may need to refresh the page.",
        });
      }
    }, 15000); // 15 seconds is very generous
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isAdmin, error, noSessionFound, isLoading, hasInitializedProvider, toast]);

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
          setHasInitializedProvider(true);
        }}
        onLoading={setIsLoading}
        onError={handleError}
        handleSessionFull={handleSessionFull}
        retryConnection={retryConnection}
        connectionAttempts={connectionAttempts}
        error={error}
        sessionMountedRef={sessionMountedRef}
      />
    </SessionErrorBoundary>
  );
};

export default Session;
