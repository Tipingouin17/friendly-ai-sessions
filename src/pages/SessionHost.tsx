import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import { useHostStatusPersistence } from "@/hooks/useHostStatusPersistence";
import { useHostSessionLoader } from "@/hooks/useHostSessionLoader";
import { useHostMessages } from "@/hooks/useHostMessages";
import { useHostParticipantState } from "@/hooks/useHostParticipantState";
import { useHostSessionInitialization } from "@/hooks/useHostSessionInitialization";
import { useSessionInterface } from "@/hooks/useSessionInterface";
import { useOptimizedSessionState } from "@/hooks/useOptimizedSessionState";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { useHostParticipantContext } from "@/hooks/useHostParticipantContext";
import HostDashboard from "@/components/session/host/HostDashboard";
import { Message } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { useAutoStartSession } from "@/hooks/useAutoStartSession";

const SessionHost = () => {
  // CRITICAL FIX: Set host status instead of admin status
  const { forceHost } = useHostStatusPersistence();

  // Session page state
  const {
    isLoading: sessionPageLoading,
    error,
    noSessionFound,
    connectionAttempts,
    lastAttemptTime,
    handleError,
    retryConnection
  } = useSessionPage();

  // Host session loader
  const {
    isLoading: loaderIsLoading,
    hasInitializedProvider,
    setHasInitializedProvider,
    setIsLoading,
    conversationData,
    isConversationLoading,
    currentConversationId,
    locationState,
    hostViewMounted
  } = useHostSessionLoader();

  // Session validation - check if session is still active (host validation, not admin)
  const { isValidating, isValid } = useSessionValidation({
    conversationId: currentConversationId,
    isAdmin: false // Host validation doesn't need admin flag
  });

  console.log("🔍 SessionHost - Current state:", {
    currentConversationId,
    conversationDataId: conversationData?.id,
    isLoading: sessionPageLoading || loaderIsLoading || isConversationLoading,
    isValidating,
    isValid
  });

  // NEW: Host participant context for message sending
  const {
    participantMode,
    currentUserParticipantId,
    enableParticipantMode,
    isRegistering,
    canSendMessages
  } = useHostParticipantContext({
    conversationId: currentConversationId,
    isHostPage: true,
    hostName: "Host"
  });

  console.log("🔧 Host participant context:", {
    participantMode,
    currentUserParticipantId,
    canSendMessages,
    isRegistering
  });

  // Session interface for proper session start handling
  const {
    isSessionStarted: interfaceSessionStarted,
    handleStartSession
  } = useSessionInterface(currentConversationId);

  // Optimized session state management
  const {
    isSessionStarted,
    isTransitioning,
    setIsSessionStarted
  } = useOptimizedSessionState({
    conversationId: currentConversationId,
    initialSessionStarted: interfaceSessionStarted || Boolean(conversationData?.session_started),
    onSessionStarted: () => {
      console.log("🎉 [SessionHost] Optimized session started callback");
    }
  });

  // Auto-start functionality
  const {
    isAutoStarting,
    autoStartCountdown,
    triggerAutoStart,
    cancelAutoStart,
    cleanup: cleanupAutoStart
  } = useAutoStartSession({
    onStartSession: handleStartSession,
    isSessionStarted: isSessionStarted || Boolean(conversationData?.session_started),
    maxParticipants: conversationData?.participants || 10
  });

  // Create the session full handler that will be passed to useHostParticipantState
  const handleSessionFull = useCallback(async () => {
    const currentCount = conversationData?.current_participants || 0;
    const maxCount = conversationData?.participants || 10;
    
    console.log('🎯 Session full detected:', { currentCount, maxCount });
    
    if (currentCount >= maxCount && !isSessionStarted && !conversationData?.session_started) {
      await triggerAutoStart(currentCount);
    }
  }, [conversationData?.current_participants, conversationData?.participants, isSessionStarted, conversationData?.session_started, triggerAutoStart]);

  // Participant state management with auto-start callback
  const {
    participants,
    setParticipants,
    isLoadingParticipants
  } = useHostParticipantState({
    locationState,
    conversationData,
    currentConversationId,
    onSessionFull: handleSessionFull
  });

  console.log("🔍 SessionHost - Participants from hook:", {
    participantsCount: participants?.length || 0,
    participants: participants?.map(p => ({ id: p.id, name: p.name })) || [],
    isLoadingParticipants
  });

  // Initialize session messages with empty array
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);

  // Host message handling with response collection - ENHANCED with participant context
  const {
    isSessionPaused,
    toggleSessionState,
    handleHostMessage,
    handleSendHostMessage,
    responseCount,
    isWaitingForResponses,
    totalParticipants,
    triggerFacilitatorResponse
  } = useHostMessages({
    conversationId: currentConversationId,
    participants: participants || [],
    messages: sessionMessages || [],
    setMessages: setSessionMessages,
    conversationData,
    // NEW: Pass host participant context
    isHostPage: true,
    canSendMessages: canSendMessages,
    currentUserParticipantId: currentUserParticipantId
  });

  // Keep a state reference to preserve UI data
  const [hostViewReady, setHostViewReady] = useState(false);

  // Calculate effective loading state
  const isLoading = (sessionPageLoading || loaderIsLoading || isConversationLoading || isValidating) && !hostViewReady;

  // Initialize session and handle host view readiness
  useHostSessionInitialization({
    setHasInitializedProvider,
    setIsLoading,
    currentConversationId,
    locationState,
    conversationData,
    participants
  });

  // Force host view to stay ready once it's been loaded
  useEffect(() => {
    if (!isLoading && !isValidating && isValid && (conversationData || hostViewMounted) && !hostViewReady) {
      setHostViewReady(true);
    }

    const readyTimeout = setTimeout(() => {
      if (!hostViewReady && isValid) {
        console.log("Forcing host view ready after timeout");
        setHostViewReady(true);
      }
    }, 2000);

    return () => clearTimeout(readyTimeout);
  }, [isLoading, isValidating, isValid, conversationData, hostViewReady, hostViewMounted]);

  // Reset messages when switching sessions
  useEffect(() => {
    if (currentConversationId) {
      setSessionMessages([]);
    }
  }, [currentConversationId]);

  // CRITICAL FIX: Force host status when on host page, but don't set admin flags
  useEffect(() => {
    if (currentConversationId) {
      console.log("🔧 SessionHost - Forcing host status (not admin) for conversation:", currentConversationId);
      forceHost();
      
      // Clear any admin flags that might interfere
      sessionStorage.removeItem('isAdminSession');
      sessionStorage.setItem('isHostSession', 'true');
    }
  }, [currentConversationId, forceHost]);

  // Cleanup auto-start on unmount
  useEffect(() => {
    return () => {
      cleanupAutoStart();
    };
  }, [cleanupAutoStart]);

  // Redirect if session is invalid
  if (!isValidating && !isValid) {
    return <Navigate to="/past-workshops" replace />;
  }

  // Redirect logic for missing conversation
  if (!hostViewReady && !isLoading && !isValidating && !currentConversationId && !locationState?.newConversationId) {
    console.log("No conversation ID found, checking if we should show host interface anyway");

    if (window.location.pathname.includes('/host')) {
      console.log("Host session detected - showing host interface despite missing conversation ID");
      setHostViewReady(true);
    } else {
      console.error("No conversation ID found on host page, redirecting home");
      return <Navigate to="/" />;
    }
  }

  // Check if session is started - use optimized state
  const sessionStartedStatus = isSessionStarted || Boolean(conversationData?.session_started);

  // Handle session start - use the proper function from useSessionInterface
  const handleSessionStarted = async () => {
    console.log("🔥 SessionHost - Starting session through useSessionInterface");
    try {
      await handleStartSession();
      setIsSessionStarted(true);
      console.log("🔥 SessionHost - Session started successfully");
    } catch (error) {
      console.error("🔥 SessionHost - Error starting session:", error);
    }
  };

  // Generate participant colors mapping
  const participantColors = (participants || []).reduce((colors, participant) => {
    colors[`P${participant.id}`] = getParticipantColor(`P${participant.id}`);
    return colors;
  }, {} as { [key: string]: string });

  // Calculate participant count for passing to components
  const participantCount = participants?.length || 0;
  
  console.log("🔍 SessionHost - Passing to HostDashboard:", {
    participantCount,
    participantsLength: participants?.length || 0,
    conversationId: currentConversationId,
    sessionStarted: sessionStartedStatus,
    isTransitioning,
    participantMode,
    canSendMessages
  });

  return (
    <HostDashboard
      conversation={conversationData}
      isSessionPaused={isSessionPaused}
      toggleSessionState={toggleSessionState}
      sessionMessages={sessionMessages}
      participantColors={participantColors}
      participants={participants || []}
      isLoadingParticipants={isLoadingParticipants}
      currentConversationId={currentConversationId}
      onSendMessage={handleSendHostMessage}
      isWaitingForResponses={isWaitingForResponses}
      responseCount={responseCount}
      totalParticipants={totalParticipants}
      onTriggerFacilitatorResponse={triggerFacilitatorResponse}
      isSessionStarted={sessionStartedStatus}
      onSessionStarted={handleSessionStarted}
      isAutoStarting={isAutoStarting || isTransitioning}
      autoStartCountdown={autoStartCountdown}
      onCancelAutoStart={cancelAutoStart}
    />
  );
};

export default SessionHost;
