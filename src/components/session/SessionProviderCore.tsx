
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SessionContextProps } from "@/types/session";
import { useSessionProviderState } from "@/hooks/useSessionProviderState";
import { useSessionParticipantSetup } from "@/hooks/useSessionParticipantSetup";
import { useSessionMonitoring } from "@/hooks/useSessionMonitoring";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { useSessionRealtimeConnection } from "@/hooks/useSessionRealtimeConnection";
import { useSessionContextValue } from "@/hooks/useSessionContextValue";
import { useEnhancedLocationState } from "@/hooks/useEnhancedLocationState";
import { useEffectiveAdminStatus } from "@/hooks/useEffectiveAdminStatus";
import { useStuckStateHandler } from "@/hooks/useStuckStateHandler";
import { useSessionProviderErrorHandler } from "@/hooks/useSessionProviderErrorHandler";
import { SessionProviderCoreError } from "./SessionProviderCoreError";

interface SessionProviderCoreProps {
  children: React.ReactNode;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
  forceAdmin?: boolean;
}

export const SessionProviderCore = ({ 
  children, 
  handleSessionFull, 
  onError,
  forceAdmin 
}: SessionProviderCoreProps) => {
  const location = useLocation();
  const { persistedParticipantData } = useParticipantPersistence();
  
  // Debug logging
  useEffect(() => {
    console.log("SessionProviderCore initialized", {
      pathname: location.pathname,
      search: location.search,
      hasLocationState: !!location.state,
      hasPersistedData: !!persistedParticipantData,
      forceAdmin,
      isAdminInStorage: sessionStorage.getItem('isAdminSession') === 'true'
    });
  }, [location, persistedParticipantData, forceAdmin]);
  
  // Enhance location state with persisted data if available
  const locationState = useEnhancedLocationState(location.state);
  
  // Determine effective admin status from all sources
  const effectiveAdmin = useEffectiveAdminStatus({
    forceAdmin, 
    locationState, 
    persistedParticipantData
  });
  
  // Force admin status if detected from any source
  useEffect(() => {
    if (effectiveAdmin) {
      console.log("SessionProviderCore: Enforcing admin status");
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin]);
  
  // Load core provider state
  const {
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
    isAdmin
  } = useSessionProviderState({ 
    onError, 
    forceAdmin: effectiveAdmin
  });

  // Set up realtime connection
  const connection = useSessionRealtimeConnection({
    conversationId: currentConversationId,
    refetch,
    onError: handleError,
    isAdmin: effectiveAdmin
  });

  // Handle data errors
  useSessionProviderErrorHandler({
    dataError,
    effectiveAdmin,
    handleError
  });

  // Set up participant management
  const {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    forceRefreshParticipants
  } = useSessionParticipantSetup({
    conversationId: currentConversationId,
    conversation,
    locationState,
    refetch,
    onError: handleError,
    onSessionFull: handleSessionFull,
    forceAdmin: effectiveAdmin
  });

  // Check for stuck states and force refresh
  useStuckStateHandler({
    isLoading,
    currentConversationId,
    conversation, 
    refetch,
    forceRefreshParticipants
  });

  // Set up session monitoring
  const {
    isSessionStartedInDB,
    roomState
  } = useSessionMonitoring({
    conversation,
    conversationId: currentConversationId,
    currentUserParticipantId,
    participants,
    onError: handleError,
    forceAdmin: effectiveAdmin
  });

  // Get the session context value using our hook
  try {
    const sessionContextValue = useSessionContextValue({
      isLoading,
      conversation,
      currentConversationId,
      refetch,
      showQrCodeView,
      sessionLink,
      isSessionStartedInDB,
      roomState,
      participants,
      currentUserParticipantId,
      isAdmin,
      providerError,
      connection,
      handleStartSession: enhancedHandleStartSession,
      effectiveAdmin
    });

    // Create a React element with the session context value
    const sessionElement = React.isValidElement(children) 
      ? children 
      : React.createElement(React.Fragment, {}, children);

    // Return children with context or error fallback
    return (
      <SessionProviderCoreError
        providerError={providerError}
        effectiveAdmin={effectiveAdmin}
        refetch={refetch}
      >
        {sessionContextValue ? React.cloneElement(sessionElement, sessionContextValue) : sessionElement}
      </SessionProviderCoreError>
    );
  } catch (error) {
    console.error("Fatal error in SessionProviderCore:", error);
    
    // Use the error component to handle the fallback rendering
    return (
      <SessionProviderCoreError
        providerError={error instanceof Error ? error.message : "Unknown error in SessionProviderCore"}
        effectiveAdmin={effectiveAdmin}
        refetch={refetch}
      >
        {React.isValidElement(children) ? children : React.createElement(React.Fragment, {}, children)}
      </SessionProviderCoreError>
    );
  }
};
