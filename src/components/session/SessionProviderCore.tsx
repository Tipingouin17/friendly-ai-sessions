/**
 * Session Provider Core
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useMemo, useCallback } from "react";
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
import { useStreamingFacilitatorRuntime } from "@/hooks/facilitator/useStreamingFacilitatorRuntime";

interface SessionProviderCoreProps {
  children: React.ReactNode;
  childrenFn?: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
  forceAdmin?: boolean;
}

export const SessionProviderCore = ({
  children,
  childrenFn,
  handleSessionFull,
  onError,
  forceAdmin
}: SessionProviderCoreProps) => {
  const location = useLocation();
  const { persistedParticipantData } = useParticipantPersistence();

  // Log initialization only once
  const hasInitializedRef = React.useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
    }
  }, [location, persistedParticipantData, forceAdmin]);

  const locationState = useEnhancedLocationState(location.state);

  const effectiveAdmin = useEffectiveAdminStatus({
    forceAdmin,
    locationState,
    persistedParticipantData
  });

  // Set admin status only once
  const adminStatusSetRef = React.useRef(false);
  useEffect(() => {
    if (effectiveAdmin && !adminStatusSetRef.current) {
      adminStatusSetRef.current = true;
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin]);

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

  // Memoize the error handler to prevent it from changing on each render
  const memoizedHandleError = useCallback((error: string) => {
    handleError(error);
  }, [handleError]);

  const connection = useSessionRealtimeConnection({
    conversationId: currentConversationId,
    refetch,
    onError: memoizedHandleError,
    isAdmin: effectiveAdmin
  });

  useSessionProviderErrorHandler({
    dataError,
    effectiveAdmin,
    handleError: memoizedHandleError
  });

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
    onError: memoizedHandleError,
    onSessionFull: handleSessionFull,
    forceAdmin: effectiveAdmin
  });

  useStuckStateHandler({
    isLoading,
    currentConversationId,
    conversation,
    refetch,
    forceRefreshParticipants
  });

  const {
    isSessionStartedInDB,
    roomState
  } = useSessionMonitoring({
    conversation,
    conversationId: currentConversationId,
    currentUserParticipantId,
    participants,
    onError: memoizedHandleError,
    forceAdmin: effectiveAdmin
  });

  // Feature-flagged stream-aware facilitator foundation. This is intentionally
  // mounted near the provider boundary, where conversation/session/participant
  // identifiers and the live draft input are available, but it does not alter the
  // visible UX unless explicitly enabled in the dev environment.
  const facilitatorRuntime = useStreamingFacilitatorRuntime({
    conversationId: currentConversationId,
    facilitatorId: conversation?.sessions?.facilitator ?? null,
    sessionId: conversation?.sessions?.id ?? null,
    participantId: currentUserParticipantId,
    participantName: participants.find((participant) => participant.id === currentUserParticipantId)?.name ?? null,
    inputMessage: roomState.inputMessage,
    isAdmin: effectiveAdmin
  });

  // Determine the effective admin/host status
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
    effectiveAdmin,
    facilitatorRuntime
  });

  // Memoize the error component to prevent re-renders
  return (
    <SessionProviderCoreError
      providerError={providerError}
      effectiveAdmin={effectiveAdmin}
      refetch={refetch}
      sessionContextValue={sessionContextValue}
      childrenFn={childrenFn}
    >
      {children}
    </SessionProviderCoreError>
  );
};
