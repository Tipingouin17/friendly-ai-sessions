import React, { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { SessionContextProps } from "@/types/session";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";
import { useSessionProviderState } from "@/hooks/useSessionProviderState";
import { useSessionParticipantSetup } from "@/hooks/useSessionParticipantSetup";
import { useSessionMonitoring } from "@/hooks/useSessionMonitoring";
import { useToast } from "@/components/ui/use-toast";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";

interface SessionProviderCoreProps {
  children: (props: SessionContextProps) => React.ReactElement;
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
  const { toast } = useToast();
  const { persistedParticipantData } = useParticipantPersistence();

  // Log initial context for debugging
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

  // Derive location state
  let locationState = location.state as {
    participantId?: number;
    isGuest?: boolean;
    participantName?: string;
    showMessaging?: boolean;
    isAdmin?: boolean;
  } | null;

  // Inject persisted participant data if locationState is missing key info
  if (!locationState?.participantId && persistedParticipantData) {
    locationState = {
      ...locationState,
      participantId: persistedParticipantData.participantId,
      isGuest: true,
      participantName: persistedParticipantData.name,
      isAdmin: persistedParticipantData.isAdmin
    };
    console.log("Enhanced location state with persisted data:", locationState);
  }

  // Determine if this session should be treated as admin
  const effectiveAdmin =
    forceAdmin === true ||
    locationState?.isAdmin === true ||
    persistedParticipantData?.isAdmin === true ||
    sessionStorage.getItem('isAdminSession') === 'true' ||
    location.pathname.includes('/admin');

  // Store admin flag in sessionStorage
  useEffect(() => {
    if (effectiveAdmin) {
      console.log("SessionProviderCore: Enforcing admin status");
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin]);

  // Session state management
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

  // Handle data-related errors
  useEffect(() => {
    if (dataError) {
      const isSessionFullError =
        dataError.includes("full") || dataError.includes("maximum capacity");

      if (isSessionFullError && effectiveAdmin) {
        console.log("🔑 Suppressing session full error for admin");
      } else {
        console.error("Session data error:", dataError);
        handleError(dataError);
      }
    }
  }, [dataError, handleError, effectiveAdmin]);

  // Participant state
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

  // Catch stuck loading states
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading && currentConversationId && !conversation) {
        console.log("Session stuck in loading — forcing refresh");
        refetch();
        forceRefreshParticipants?.();
      }
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [isLoading, currentConversationId, conversation, refetch, forceRefreshParticipants]);

  // Real-time session monitoring
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

  // Fallback UI for critical errors
  if (providerError && !effectiveAdmin) {
    return (
      <SessionProviderErrorFallback
        errorMessage={providerError}
        isAdmin={effectiveAdmin}
        onRetry={() => {
          console.log("Retry triggered from error fallback");
          refetch();
        }}
      >
        {children}
      </SessionProviderErrorFallback>
    );
  }

  // Memoized session context to prevent re-render loops
  const sessionContextValue = useMemo<SessionContextProps>(() => ({
    isLoading: effectiveAdmin ? false : isLoading,
    conversation,
    currentConversationId,
    sessionState: {
      messages: roomState.messages || [],
      inputMessage: roomState.inputMessage,
      setInputMessage: roomState.setInputMessage,
      currentParticipant: roomState.currentParticipant,
      isRecording: roomState.isRecording,
      setIsRecording: roomState.setIsRecording,
      handleGenerateReport: roomState.handleGenerateReport,
      isGeneratingReport: roomState.isGeneratingReport,
      setMessages: roomState.setMessages,
      hasAnswered: roomState.hasAnswered,
      totalResponses: roomState.totalResponses,
      viewMode: roomState.viewMode,
      setViewMode: roomState.setViewMode,
      recordResponse: roomState.recordResponse,
      error: roomState.error
    },
    participants,
    participantColors,
    isWaitingForResponse: roomState.isWaitingForResponse,
    handleStartSession: enhancedHandleStartSession,
    handleSendMessage: roomState.handleSendMessage,
    handleLikeMessage: roomState.handleLikeMessage,
    showQrCodeView,
    sessionLink,
    currentUserParticipantId,
    anonymousState: roomState.anonymousState,
    isSessionStartedInDB,
    error: effectiveAdmin ? null : providerError,
    isConnected: true,
    connectionAttempts: 0,
    refetch,
    isAdmin: isAdmin || effectiveAdmin
  }), [
    isLoading,
    conversation,
    currentConversationId,
    roomState,
    participants,
    showQrCodeView,
    sessionLink,
    currentUserParticipantId,
    isSessionStartedInDB,
    providerError,
    isAdmin,
    effectiveAdmin,
    refetch
  ]);

  return children(sessionContextValue);
};
