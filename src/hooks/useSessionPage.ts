/**
 * use Session Page
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef, useState } from "react";
import { useSessionCrossOrigin } from "./useSessionCrossOrigin";
import { useSessionAdminStatus } from "./useSessionAdminStatus";
import { useSessionErrorHandling } from "./useSessionErrorHandling";
import { useSessionRecovery } from "./useSessionRecovery";
import { useSessionLoadingState } from "./useSessionLoadingState";
import { useSessionState } from "./useSessionState";
import { useSessionValidity } from "./useSessionValidity";
import { useLocation } from "react-router-dom";

export function useSessionPage() {
  // Use our custom smaller hooks
  const { noSessionFound, currentConversationId } = useSessionValidity();
  const { isAdmin } = useSessionAdminStatus();
  const { error, handleError } = useSessionErrorHandling();
  const { isCrossOrigin } = useSessionCrossOrigin();
  
  // Use refs instead of state for tracking render info to prevent loops
  const renderRef = useRef({
    initialRender: true,
    hasSetupInitialState: false,
    renderCount: 0,
    isOnAdminPath: window.location.pathname.includes('/admin')
  });
  
  // Calculate effective admin status only once during initialization using ref
  // This is crucial to prevent re-renders
  const adminStatusRef = useRef<boolean | null>(null);
  if (adminStatusRef.current === null) {
    adminStatusRef.current = isAdmin || renderRef.current.isOnAdminPath;
  }
  
  const { 
    sessionStarted, 
    setSessionStarted,
    hasInitializedProvider,
    setHasInitializedProvider,
    handleSessionFull 
  } = useSessionState();
  
  const { 
    connectionAttempts, 
    lastAttemptTime, 
    retryConnection,
    sessionMountedRef,
    recoveryTimerRef
  } = useSessionRecovery(isCrossOrigin, currentConversationId);

  const { isLoading, setIsLoading } = useSessionLoadingState(
    sessionMountedRef,
    recoveryTimerRef,
    connectionAttempts,
    hasInitializedProvider
  );

  const location = useLocation();

  // Debug logging - only log significant state changes
  useEffect(() => {
    // Increment render count (for debugging)
    renderRef.current.renderCount += 1;
    
    if (!renderRef.current.hasSetupInitialState) {
      renderRef.current.hasSetupInitialState = true;
      
    }
  }, [location, error, connectionAttempts, isLoading, isCrossOrigin, currentConversationId, hasInitializedProvider]);

  return {
    currentConversationId,
    isAdmin: adminStatusRef.current, // Use the computed value from ref to prevent re-renders
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
    isCrossOrigin,
    sessionMountedRef,
    handleError,
    handleSessionFull,
    retryConnection
  };
}
