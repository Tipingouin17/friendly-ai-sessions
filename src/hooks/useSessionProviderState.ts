
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSessionData } from "@/hooks/useSessionData";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

type UseSessionProviderStateProps = {
  onError?: (error: string) => void;
  forceAdmin?: boolean;
};

export const useSessionProviderState = ({
  onError,
  forceAdmin
}: UseSessionProviderStateProps = {}) => {
  useEffect(() => {
    console.log("useSessionProviderState running...");
  }, []);

  const [providerError, setProviderError] = useState<string | null>(null);
  const location = useLocation();
  const { isAdmin, setAdminStatus } = useSessionAdminStatus();
  const adminStatusSetRef = useRef(false);

  // Enforce admin status if forceAdmin is true - wrapped in useEffect to prevent render loops
  useEffect(() => {
    if (forceAdmin && !adminStatusSetRef.current) {
      console.log("useSessionProviderState: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      adminStatusSetRef.current = true;
    }
  }, [forceAdmin, setAdminStatus]);

  // Get session data from refactored hook
  const {
    currentConversationId,
    sessionLink,
    showQrCodeView,
    conversation,
    isLoading,
    refetch,
    handleStartSession,
    isSessionStarted,
    error: dataError
  } = useSessionData();

  // Error handler for provider
  const handleError = useCallback((errorMessage: string) => {
    console.error("Session provider error:", errorMessage);
    setProviderError(errorMessage);

    if (onError) {
      onError(errorMessage);
    }
  }, [onError]);

  // Add additional error handling for data errors
  useEffect(() => {
    if (dataError) {
      handleError(dataError);
    }
  }, [dataError, handleError]);

  // Enhanced start session handler
  const enhancedHandleStartSession = useCallback(() => {
    // When starting a session, always enforce admin status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);

    // Call the original handler
    handleStartSession();
  }, [handleStartSession, setAdminStatus]);

  return {
    currentConversationId,
    conversation,
    isLoading,
    refetch,
    showQrCodeView,
    sessionLink,
    isSessionStarted,
    dataError,
    providerError,
    handleError,
    enhancedHandleStartSession,
    isAdmin: forceAdmin ? true : isAdmin // Use forceAdmin to override isAdmin
  };
};
