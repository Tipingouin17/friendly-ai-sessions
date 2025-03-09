
import { useEffect } from "react";
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

  // Debug logging
  useEffect(() => {
    console.log("Session page rendered with:", {
      locationSearch: location.search,
      locationState: location.state,
      currentConversationId,
      isAdmin,
      error,
      connectionAttempts,
      isLoading,
      isCrossOrigin,
      hasInitializedProvider
    });
  }, [location, isAdmin, error, connectionAttempts, isLoading, isCrossOrigin, currentConversationId, hasInitializedProvider]);

  return {
    currentConversationId,
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
    isCrossOrigin,
    sessionMountedRef,
    handleError,
    handleSessionFull,
    retryConnection
  };
}
