
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
  
  // Preventing infinite state updates
  const initialRenderRef = useRef(true);
  const hasSetupInitialStateRef = useRef(false);
  const renderCountRef = useRef(0);
  
  // Use a ref for admin path detection to avoid re-renders
  const isOnAdminPathRef = useRef(window.location.pathname.includes('/admin'));
  
  // Compute effective admin status once during initialization
  const [effectiveIsAdmin] = useState(() => {
    const statusFromStorage = sessionStorage.getItem('isAdminSession') === 'true';
    return isAdmin || isOnAdminPathRef.current || statusFromStorage;
  });
  
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
    renderCountRef.current += 1;
    
    if (!hasSetupInitialStateRef.current) {
      hasSetupInitialStateRef.current = true;
      
      console.log("Session page rendered with:", {
        locationSearch: location.search,
        locationState: location.state,
        currentConversationId,
        isAdmin: effectiveIsAdmin,
        error,
        connectionAttempts,
        isLoading,
        isCrossOrigin,
        hasInitializedProvider,
        renderCount: renderCountRef.current
      });
    }
  }, [location, effectiveIsAdmin, error, connectionAttempts, isLoading, isCrossOrigin, currentConversationId, hasInitializedProvider]);

  return {
    currentConversationId,
    isAdmin: effectiveIsAdmin, // Use the computed value to prevent re-renders
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
