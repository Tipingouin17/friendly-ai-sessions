import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import { useHostStatusPersistence } from "@/hooks/useHostStatusPersistence";
import { useHostSessionLoader } from "@/hooks/useHostSessionLoader";
import { useHostMessages } from "@/hooks/useHostMessages";
import { useHostParticipantState } from "@/hooks/useHostParticipantState";
import { useHostSessionInitialization } from "@/hooks/useHostSessionInitialization";
import { useSessionInterface } from "@/hooks/useSessionInterface";
import HostDashboard from "@/components/session/host/HostDashboard";
import { Message } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { useSessionFlow } from "@/hooks/useSessionFlow";

const SessionHost = () => {
  // Enforce host status
  const { forceHost } = useHostStatusPersistence();

  // Session page state
  const {
    isLoading: sessionPageLoading,
    error,
    noSessionFound,
    connectionAttempts,
    lastAttemptTime,
    handleError,
    handleSessionFull,
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

  console.log("🔍 SessionHost - Current state:", {
    currentConversationId,
    conversationDataId: conversationData?.id,
    isLoading: sessionPageLoading || loaderIsLoading || isConversationLoading
  });

  // Participant state management
  const {
    participants,
    setParticipants,
    isLoadingParticipants
  } = useHostParticipantState({
    locationState,
    conversationData,
    currentConversationId
  });

  console.log("🔍 SessionHost - Participants from hook:", {
    participantsCount: participants.length,
    participants: participants.map(p => ({ id: p.id, name: p.name })),
    isLoadingParticipants
  });

  // Initialize session messages with empty array
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);

  // Host message handling with response collection
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
    conversationData
  });

  // Session interface for proper session start handling
  const {
    isSessionStarted,
    handleStartSession
  } = useSessionInterface(currentConversationId);

  // Keep a state reference to preserve UI data
  const [hostViewReady, setHostViewReady] = useState(false);

  // Calculate effective loading state
  const isLoading = (sessionPageLoading || loaderIsLoading || isConversationLoading) && !hostViewReady;

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
    if (!isLoading && (conversationData || hostViewMounted) && !hostViewReady) {
      setHostViewReady(true);
    }

    const readyTimeout = setTimeout(() => {
      if (!hostViewReady) {
        console.log("Forcing host view ready after timeout");
        setHostViewReady(true);
      }
    }, 2000);

    return () => clearTimeout(readyTimeout);
  }, [isLoading, conversationData, hostViewReady, hostViewMounted]);

  // Reset messages when switching sessions
  useEffect(() => {
    if (currentConversationId) {
      setSessionMessages([]);
    }
  }, [currentConversationId]);

  // Force host status when on host page
  useEffect(() => {
    if (currentConversationId) {
      console.log("🔧 SessionHost - Forcing host status for conversation:", currentConversationId);
      forceHost();
    }
  }, [currentConversationId, forceHost]);

  // Redirect logic
  if (!hostViewReady && !isLoading && !currentConversationId && !locationState?.newConversationId) {
    console.log("No conversation ID found, checking if we should show host interface anyway");

    if (window.location.pathname.includes('/host')) {
      console.log("Host session detected - showing host interface despite missing conversation ID");
      setHostViewReady(true);
    } else {
      console.error("No conversation ID found on host page, redirecting home");
      return <Navigate to="/" />;
    }
  }

  // Check if session is started - use from useSessionInterface
  const sessionStartedStatus = isSessionStarted || Boolean(conversationData?.session_started);

  // Add the session flow hook with enhanced state management
  const {
    isSessionActive,
    currentResponseCollection,
    isGeneratingResponse,
    sessionStartNotification,
    triggerSessionStart,
    startResponseCollection,
    isStartingSession,
    startProgress,
    responseProgress
  } = useSessionFlow({
    conversationId: currentConversationId,
    participants: participants || [],
    conversationData,
    isAdmin: true
  });

  // Enhanced session start handler
  const handleSessionStarted = async (): Promise<void> => {
    console.log("🔥 SessionHost - Starting session through session flow");
    try {
      const success = await triggerSessionStart();
      if (success) {
        console.log("🔥 SessionHost - Session started successfully with welcome message");
      }
    } catch (error) {
      console.error("🔥 SessionHost - Error starting session:", error);
    }
  };

  // Generate participant colors mapping
  const participantColors = participants.reduce((colors, participant) => {
    colors[`P${participant.id}`] = getParticipantColor(`P${participant.id}`);
    return colors;
  }, {} as { [key: string]: string });

  // Calculate participant count for passing to components
  const participantCount = participants.length;
  
  console.log("🔍 SessionHost - Passing to HostDashboard:", {
    participantCount,
    participantsLength: participants.length,
    conversationId: currentConversationId,
    isStartingSession,
    startProgress
  });

  return (
    <HostDashboard
      conversation={conversationData}
      isSessionPaused={isSessionPaused}
      toggleSessionState={toggleSessionState}
      sessionMessages={sessionMessages}
      participantColors={participantColors}
      participants={participants}
      isLoadingParticipants={isLoadingParticipants}
      currentConversationId={currentConversationId}
      onSendMessage={handleSendHostMessage}
      isWaitingForResponses={isWaitingForResponses}
      responseCount={responseCount}
      totalParticipants={totalParticipants}
      onTriggerFacilitatorResponse={triggerFacilitatorResponse}
      isSessionStarted={sessionStartedStatus}
      onSessionStarted={handleSessionStarted}
      triggerSessionStart={triggerSessionStart}
      sessionStartNotification={sessionStartNotification}
      isStartingSession={isStartingSession}
      startProgress={startProgress}
      responseProgress={responseProgress}
    />
  );
};

export default SessionHost;
