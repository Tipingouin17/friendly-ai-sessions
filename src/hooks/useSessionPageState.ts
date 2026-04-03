/**
 * use Session Page State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export function useSessionPageState() {
  const location = useLocation();
  const { toast } = useToast();
  
  // Use refs for state that doesn't need to trigger re-renders and browser-only detection
  const stateRef = useRef({
    isOnAdminPath: false,
    isOnHostPath: false,
    isAdmin: false,
    isHost: false,
    connectionAttempts: 0,
    error: null as string | null,
    noSessionFound: false,
    hasShownToast: false,
    pageLoadTime: 0 // Will be set in useEffect
  });
  
  // Mutable state that requires re-renders
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitializedProvider, setHasInitializedProvider] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Initialize client-only state after hydration
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    setIsClient(true);
    stateRef.current.pageLoadTime = Date.now();
    
    const isOnAdminPath = location.pathname.includes('/admin');
    const isOnHostPath = location.pathname.includes('/host');
    
    // CRITICAL FIX: Clear admin session storage when on participant URLs
    const urlParams = new URLSearchParams(location.search);
    const hasParticipantParams = urlParams.has('participantId') || urlParams.has('name');
    
    if (hasParticipantParams) {
      // Clear any admin flags when accessing participant URLs
      sessionStorage.removeItem('isAdminSession');
      sessionStorage.removeItem('isHostSession');
    }
    
    // Separate admin and host detection
    const storedIsAdmin = sessionStorage.getItem('isAdminSession') === 'true';
    const storedIsHost = sessionStorage.getItem('isHostSession') === 'true';
    
    stateRef.current.isOnAdminPath = isOnAdminPath;
    stateRef.current.isOnHostPath = isOnHostPath;
    stateRef.current.isAdmin = isOnAdminPath || (storedIsAdmin && !hasParticipantParams);
    stateRef.current.isHost = isOnHostPath || (storedIsHost && !hasParticipantParams);
    
  }, [location.pathname, location.search]);
  
  // Handle error function that doesn't cause re-renders
  const handleError = useCallback((errorMessage: string) => {
    stateRef.current.error = errorMessage;
    
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
    
    // Force loading state during retry
    setIsLoading(true);
    
    // Reset provider initialized state to trigger reconnection
    setHasInitializedProvider(false);
  }, []);

  // Handler for provider initialization
  const handleProviderInitialized = useCallback(() => {
    // Update provider initialization state
    setHasInitializedProvider(true);
    
    // For host, ensure we're not stuck in loading
    if ((stateRef.current.isHost || stateRef.current.isOnHostPath) && isLoading) {
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
    isOnAdminPath: stateRef.current.isOnAdminPath,
    isOnHostPath: stateRef.current.isOnHostPath,
    isHost: stateRef.current.isHost,
    isClient
  };
}
