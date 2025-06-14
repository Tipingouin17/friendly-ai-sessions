import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import { useAdminStatusPersistence } from "@/hooks/useAdminStatusPersistence";
import { useAdminSessionLoader } from "@/hooks/useAdminSessionLoader";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { useAdminParticipantState } from "@/hooks/useAdminParticipantState";
import { useAdminSessionInitialization } from "@/hooks/useAdminSessionInitialization";
import AdminSessionLayout from "@/components/session/admin/AdminSessionLayout";
import { Message } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";

const SessionAdmin = () => {
  // Enforce admin status
  const { forceAdmin } = useAdminStatusPersistence();

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

  // Admin session loader
  const {
    isLoading: loaderIsLoading,
    hasInitializedProvider,
    setHasInitializedProvider,
    setIsLoading,
    conversationData,
    isConversationLoading,
    currentConversationId,
    locationState,
    adminViewMounted
  } = useAdminSessionLoader();

  // Participant state management
  const {
    participants,
    setParticipants,
    isLoadingParticipants,
    currentParticipant,
    isAnonymous,
    toggleAnonymous,
    hasAnswered,
    totalResponses,
    participantResponses,
    recordResponse
  } = useAdminParticipantState({
    locationState,
    conversationData,
    currentConversationId
  });

  // Initialize session messages with empty array
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Admin message handling
  const {
    isSessionPaused,
    toggleSessionState,
    exportSessionData,
    handleAdminMessage,
    handleSendAdminMessage
  } = useAdminMessages({
    conversationId: currentConversationId,
    participants: participants || [],
    messages: sessionMessages || [],
    setMessages: setSessionMessages
  });

  // Session state for participant interactions
  const sessionState = {
    messages: sessionMessages,
    setMessages: setSessionMessages,
    inputMessage,
    setInputMessage,
    currentParticipant: currentParticipant || 1,
    isRecording: false,
    setIsRecording: () => {},
    handleGenerateReport: async () => {},
    isGeneratingReport: false,
    hasAnswered,
    totalResponses,
    viewMode: "admin" as const,
    setViewMode: () => {},
    recordResponse,
    error: null
  };

  // Set up session interactions for participant message sending
  const {
    isWaitingForResponse,
    handleSendMessage,
    error: interactionError
  } = useSessionInteractions({
    currentConversationId,
    sessionState,
    conversation: conversationData,
    participants,
    isAnonymous
  });

  // Keep a state reference to preserve UI data
  const [adminViewReady, setAdminViewReady] = useState(false);

  // Calculate effective loading state
  const isLoading = (sessionPageLoading || loaderIsLoading || isConversationLoading) && !adminViewReady;

  // Initialize session and handle admin view readiness
  useAdminSessionInitialization({
    setHasInitializedProvider,
    setIsLoading,
    currentConversationId,
    locationState,
    conversationData,
    participants
  });

  // Force admin view to stay ready once it's been loaded
  useEffect(() => {
    if (!isLoading && (conversationData || adminViewMounted) && !adminViewReady) {
      setAdminViewReady(true);
    }

    const readyTimeout = setTimeout(() => {
      if (!adminViewReady) {
        console.log("Forcing admin view ready after timeout");
        setAdminViewReady(true);
      }
    }, 2000);

    return () => clearTimeout(readyTimeout);
  }, [isLoading, conversationData, adminViewReady, adminViewMounted]);

  // Reset messages when switching sessions
  useEffect(() => {
    if (currentConversationId) {
      setSessionMessages([]);
    }
  }, [currentConversationId]);

  // Redirect logic
  if (!adminViewReady && !isLoading && !currentConversationId && !locationState?.newConversationId) {
    console.log("No conversation ID found, checking if we should show admin interface anyway");

    if (sessionStorage.getItem('isAdminSession') === 'true' || window.location.pathname.includes('/admin')) {
      console.log("Admin session detected - showing admin interface despite missing conversation ID");
      setAdminViewReady(true);
    } else {
      console.error("No conversation ID found on admin page, redirecting home");
      return <Navigate to="/" />;
    }
  }

  // Generate participant colors mapping
  const participantColors = participants.reduce((colors, participant) => {
    colors[`P${participant.id}`] = getParticipantColor(`P${participant.id}`);
    return colors;
  }, {} as { [key: string]: string });

  return (
    <AdminSessionLayout
      conversationData={conversationData}
      exportSessionData={exportSessionData}
      handleSendAdminMessage={handleSendAdminMessage}
      toggleSessionState={toggleSessionState}
      isSessionPaused={isSessionPaused}
      sessionMessages={sessionMessages}
      participantColors={participantColors}
      participants={participants}
      isLoadingParticipants={isLoadingParticipants}
      currentParticipant={currentParticipant}
      inputMessage={inputMessage}
      setInputMessage={setInputMessage}
      isWaitingForResponse={isWaitingForResponse}
      handleSendMessage={handleSendMessage}
      isAnonymous={isAnonymous}
      toggleAnonymous={toggleAnonymous}
      hasAnswered={hasAnswered}
      totalResponses={totalResponses}
      currentConversationId={currentConversationId}
    />
  );
};

export default SessionAdmin;
