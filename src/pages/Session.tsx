
import React, { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import SessionProviderWrapper from "@/components/session/SessionProviderWrapper";
import SessionErrorBoundary from "@/components/session/SessionErrorBoundary";
import { useToast } from "@/components/ui/use-toast";

const Session = () => {
  const location = useLocation();
  const { toast } = useToast();
  const isOnAdminPath = location.pathname.includes('/admin');
  
  // Use refs for state that doesn't need to trigger re-renders
  const sessionMountedRef = useRef(true);
  const stateRef = useRef({
    pageLoadTime: Date.now(),
    hasShownToast: false,
    hasSetupTimeout: false,
    initializeTimeout: null as NodeJS.Timeout | null,
    isOnAdminPath,
    isAdmin: isOnAdminPath || sessionStorage.getItem('isAdminSession') === 'true',
    connectionAttempts: 0,
    error: null as string | null,
    noSessionFound: false
  });
  
  // Mutable state refs that can be updated without re-renders
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasInitializedProvider, setHasInitializedProvider] = React.useState(false);
  const [sessionStarted, setSessionStarted] = React.useState(false);
  
  // Handle error function that doesn't cause re-renders
  const handleError = React.useCallback((errorMessage: string) => {
    if (!sessionMountedRef.current) return;
    stateRef.current.error = errorMessage;
    console.error("Session error:", errorMessage);
    
    if (!stateRef.current.hasShownToast) {
      stateRef.current.hasShownToast = true;
      toast({
        title: "Session Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);
  
  // Session full handler
  const handleSessionFull = React.useCallback(() => {
    if (!sessionMountedRef.current) return;
    setSessionStarted(true);
    
    toast({
      title: "Session is full",
      description: "The maximum number of participants has joined. Starting session automatically.",
    });
  }, [toast]);
  
  // Retry connection handler
  const retryConnection = React.useCallback(() => {
    if (!sessionMountedRef.current) return;
    stateRef.current.connectionAttempts++;
    console.log(`Retrying connection (attempt ${stateRef.current.connectionAttempts})`);
    
    // Force loading state during retry
    setIsLoading(true);
    
    // Reset provider initialized state to trigger reconnection
    setHasInitializedProvider(false);
  }, []);
  
  // Log initialization on mount and set up safety timeouts - run only once
  useEffect(() => {
    if (stateRef.current.hasSetupTimeout) return;
    stateRef.current.hasSetupTimeout = true;
    
    console.log("Session page mounted", {
      time: new Date().toISOString(),
      isAdmin: stateRef.current.isAdmin,
      hasError: !!stateRef.current.error,
      noSessionFound: stateRef.current.noSessionFound,
      isLoading,
      path: location.pathname
    });
    
    // Different timeouts based on user role
    const initialTimeout = stateRef.current.isOnAdminPath ? 3000 : 5000;
    
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
          if (!stateRef.current.isOnAdminPath && !stateRef.current.isAdmin) {
            toast({
              title: "Loading your session",
              description: "Please wait while we connect you to the session.",
            });
          }
        }
      }
    }, initialTimeout);
    
    // Additional critical safety timeout - MUCH shorter now
    const criticalTimeout = stateRef.current.isOnAdminPath ? 5000 : 8000;
    
    setTimeout(() => {
      if (sessionMountedRef.current && isLoading && !hasInitializedProvider) {
        console.log("Critical timeout reached, session may be stuck");
        
        // Skip toast for admin
        if (!stateRef.current.isOnAdminPath && !stateRef.current.isAdmin && !stateRef.current.hasShownToast) {
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
        
        if (!hasInitializedProvider && sessionMountedRef.current) {
          setHasInitializedProvider(true);
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
  }, [isLoading, hasInitializedProvider, toast, retryConnection, location.pathname]);

  const handleProviderInitialized = React.useCallback(() => {
    if (!sessionMountedRef.current) return;
    
    console.log(`Provider initialized after ${Date.now() - stateRef.current.pageLoadTime}ms`);
    
    // Clear initialization timeout
    if (stateRef.current.initializeTimeout) {
      clearTimeout(stateRef.current.initializeTimeout);
      stateRef.current.initializeTimeout = null;
    }
    
    // Update provider initialization state
    if (!hasInitializedProvider && sessionMountedRef.current) {
      setHasInitializedProvider(true);
    }
    
    // For admin, ensure we're not stuck in loading
    if ((stateRef.current.isAdmin || stateRef.current.isOnAdminPath) && isLoading && sessionMountedRef.current) {
      console.log("Admin detected, clearing loading state");
      setIsLoading(false);
    }
  }, [hasInitializedProvider, isLoading]);

  // Render the session page
  return (
    <SessionErrorBoundary
      error={stateRef.current.error}
      noSessionFound={stateRef.current.noSessionFound}
      retryConnection={retryConnection}
      connectionAttempts={stateRef.current.connectionAttempts}
      isLoading={isLoading}
      hasInitializedProvider={hasInitializedProvider}
      isAdmin={stateRef.current.isAdmin}
      sessionMountedRef={sessionMountedRef}
    >
      <SessionProviderWrapper
        onInitialized={handleProviderInitialized}
        onLoading={setIsLoading}
        onError={handleError}
        handleSessionFull={handleSessionFull}
        retryConnection={retryConnection}
        connectionAttempts={stateRef.current.connectionAttempts}
        error={stateRef.current.error}
        sessionMountedRef={sessionMountedRef}
        isAdmin={stateRef.current.isAdmin}
        forceAdmin={stateRef.current.isOnAdminPath}
      />
    </SessionErrorBoundary>
  );
};

export default Session;
