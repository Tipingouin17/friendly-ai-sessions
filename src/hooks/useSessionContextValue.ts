
import { useMemo } from "react";
import { SessionContextProps } from "@/types/session";
import { participantColors } from "@/utils/sessionHelpers";

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
  // Create safe defaults for any potentially undefined values
  const safeRoomState = useMemo(() => roomState || {
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
  }, [roomState]);

  // Create session state object separately to avoid re-creating on every render
  const sessionState = useMemo(() => ({
    messages: safeRoomState.messages || [],
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
  }), [safeRoomState]);

  // Create anonymous state object separately
  const anonymousState = useMemo(() => safeRoomState.anonymousState || {
    isAnonymous: false,
    toggleAnonymous: () => {}
  }, [safeRoomState]);

  // Create connection properties separately
  const connectionProps = useMemo(() => ({
    isConnected: connection?.isConnected || false,
    connectionAttempts: connection?.connectionAttempts || 0
  }), [connection]);

  // Create the session context value with safe defaults and proper memoization
  return useMemo<SessionContextProps>(() => ({
    isLoading: effectiveAdmin ? false : isLoading,
    conversation,
    currentConversationId,
    sessionState,
    participants: participants || [],
    participantColors,
    isWaitingForResponse: safeRoomState.isWaitingForResponse || false,
    handleStartSession: handleStartSession || (() => {}),
    handleSendMessage: safeRoomState.handleSendMessage || (async () => Promise.resolve()),
    handleLikeMessage: safeRoomState.handleLikeMessage || (() => {}),
    showQrCodeView: showQrCodeView || false,
    sessionLink: sessionLink || '',
    currentUserParticipantId,
    anonymousState,
    isSessionStartedInDB: isSessionStartedInDB || false,
    error: effectiveAdmin ? null : providerError,
    
    // Add connection properties
    ...connectionProps,
    refetch: refetch || (() => Promise.resolve({})),
    
    // Ensure admin status is properly set
    isAdmin: isAdmin || effectiveAdmin
  }), [
    isLoading, 
    conversation, 
    currentConversationId,
    sessionState,
    participants,
    safeRoomState.isWaitingForResponse,
    safeRoomState.handleSendMessage,
    safeRoomState.handleLikeMessage,
    handleStartSession,
    showQrCodeView,
    sessionLink,
    currentUserParticipantId,
    anonymousState,
    isSessionStartedInDB,
    providerError,
    connectionProps,
    refetch,
    isAdmin,
    effectiveAdmin
  ]);
}
