
import { useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export function useSessionPageState() {
  const location = useLocation();
  const { toast } = useToast();
  const isOnAdminPath = location.pathname.includes('/admin');
  
  // Use refs for state that doesn't need to trigger re-renders
  const stateRef = useRef({
    isOnAdminPath,
    isAdmin: isOnAdminPath || sessionStorage.getItem('isAdminSession') === 'true',
    connectionAttempts: 0,
    error: null as string | null,
    noSessionFound: false,
    hasShownToast: false,
    pageLoadTime: Date.now()
  });
  
  // Mutable state that requires re-renders
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitializedProvider, setHasInitializedProvider] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  
  // Handle error function that doesn't cause re-renders
  const handleError = useCallback((errorMessage: string) => {
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
  const handleSessionFull = useCallback(() => {
    setSessionStarted(true);
    
    toast({
      title: "Session is full",
      description: "The maximum number of participants has joined. Starting session automatically.",
    });
  }, [toast]);
  
  // Retry connection handler
  const retryConnection = useCallback(() => {
    stateRef.current.connectionAttempts++;
    console.log(`Retrying connection (attempt ${stateRef.current.connectionAttempts})`);
    
    // Force loading state during retry
    setIsLoading(true);
    
    // Reset provider initialized state to trigger reconnection
    setHasInitializedProvider(false);
  }, []);

  // Handler for provider initialization
  const handleProviderInitialized = useCallback(() => {
    console.log(`Provider initialized after ${Date.now() - stateRef.current.pageLoadTime}ms`);
    
    // Update provider initialization state
    setHasInitializedProvider(true);
    
    // For admin, ensure we're not stuck in loading
    if ((stateRef.current.isAdmin || stateRef.current.isOnAdminPath) && isLoading) {
      console.log("Admin detected, clearing loading state");
      setIsLoading(false);
    }
  }, [isLoading]);

  return {
    isLoading,
    setIsLoading,
    hasInitializedProvider,
    setHasInitializedProvider,
    sessionStarted,
    setSessionStarted,
    handleError,
    handleSessionFull,
    retryConnection,
    handleProviderInitialized,
    stateRef,
    isOnAdminPath
  };
}
