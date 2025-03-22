import { useEffect } from "react";
import { SessionContextProps } from "@/types/session";

interface UseSessionContextValueProps {
  isLoading: boolean;
  conversation: any;
  currentConversationId: number | null;
  refetch: () => void;
  showQrCodeView: boolean;
  sessionLink: string | null;
  isSessionStartedInDB: boolean;
  roomState: any;
  participants: any[];
  currentUserParticipantId: number | null;
  isAdmin: boolean;
  providerError: string | null;
  connection: any;
  handleStartSession: () => void;
  effectiveAdmin: boolean;
}

export function useSessionContextValue({
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
  handleStartSession,
  effectiveAdmin
}: UseSessionContextValueProps): SessionContextProps {
  useEffect(() => {
    console.log("useSessionContextValue running...");
  }, []);

  // Create safe defaults for any potentially undefined values
  const safeRoomState = roomState || {
    messages: [],
    inputMessage: "",
    setInputMessage: () => {},
    currentParticipant: 0,
    isRecording: false,
    setIsRecording: () => {},
    handleGenerateReport: async () => Promise.resolve(),
    isGeneratingReport: false,
    setMessages: () => {},
    hasAnswered: false,
    totalResponses: 0,
    viewMode: "participant",
    setViewMode: () => {},
    recordResponse: () => {},
    error: null
  };

  // Create the session context value with safe defaults
  const sessionContextValue = useMemo<SessionContextProps>(() => ({
    isLoading: effectiveAdmin ? false : isLoading, // Always set loading to false for admin
    conversation,
    currentConversationId,
    sessionState: {
      messages: safeRoomState.messages || [], // Ensure messages is an array
      inputMessage: safeRoomState.inputMessage || "",
      setInputMessage: safeRoomState.setInputMessage || (() => {}),
      currentParticipant: safeRoomState.currentParticipant || 0,
      isRecording: safeRoomState.isRecording || false,
      setIsRecording: safeRoomState.setIsRecording || (() => {}),
      handleGenerateReport: safeRoomState.handleGenerateReport || (async () => Promise.resolve()),
      isGeneratingReport: safeRoomState.isGeneratingReport || false,
      setMessages: safeRoomState.setMessages || (() => {}),
      hasAnswered: safeRoomState.hasAnswered || false,
      totalResponses: safeRoomState.totalResponses || 0,
      viewMode: safeRoomState.viewMode || "participant",
      setViewMode: safeRoomState.setViewMode || (() => {}),
      recordResponse: safeRoomState.recordResponse || (() => {}),
      error: safeRoomState.error || null
    },
    participants: participants || [],
    participantColors,
    isWaitingForResponse: safeRoomState.isWaitingForResponse || false,
    handleStartSession: handleStartSession || (() => {}),
    handleSendMessage: safeRoomState.handleSendMessage || (async () => Promise.resolve()),
    handleLikeMessage: safeRoomState.handleLikeMessage || (() => {}),
    showQrCodeView: showQrCodeView || false,
    sessionLink: sessionLink || '',
    currentUserParticipantId,
    anonymousState: safeRoomState.anonymousState || {
      isAnonymous: false,
      toggleAnonymous: () => {}
    },
    isSessionStartedInDB: isSessionStartedInDB || false,
    error: effectiveAdmin ? null : providerError, // Clear errors for admin
    
    // Add connection properties
    isConnected: connection?.isConnected || false,
    connectionAttempts: connection?.connectionAttempts || 0,
    refetch: refetch || (() => Promise.resolve({})),
    
    // Ensure admin status is properly set
    isAdmin: isAdmin || effectiveAdmin
  }), [
    isLoading, 
    conversation, 
    currentConversationId,
    safeRoomState,
    participants,
    handleStartSession,
    showQrCodeView,
    sessionLink,
    currentUserParticipantId,
    isSessionStartedInDB,
    providerError,
    connection,
    refetch,
    isAdmin,
    effectiveAdmin
  ]);

  return sessionContextValue;
}
