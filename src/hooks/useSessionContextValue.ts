
import { useMemo } from "react";
import { SessionContextProps } from "@/types/session";
import { participantColors } from "@/utils/sessionHelpers";

interface UseSessionContextValueProps {
  isLoading: boolean;
  conversation: any;
  currentConversationId: number | null;
  refetch: () => void;
  showQrCodeView: boolean;
  sessionLink: string;
  isSessionStartedInDB: boolean;
  roomState: any;
  participants: any[];
  currentUserParticipantId: number | null;
  isAdmin: boolean;
  providerError: string | null;
  connection: {
    isConnected: boolean;
    connectionAttempts: number;
  };
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
  // Create the session context value
  const sessionContextValue = useMemo<SessionContextProps>(() => ({
    isLoading: effectiveAdmin ? false : isLoading, // Always set loading to false for admin
    conversation,
    currentConversationId,
    sessionState: {
      messages: roomState.messages || [], // Ensure messages is an array
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
    handleStartSession,
    handleSendMessage: roomState.handleSendMessage,
    handleLikeMessage: roomState.handleLikeMessage,
    showQrCodeView,
    sessionLink,
    currentUserParticipantId,
    anonymousState: roomState.anonymousState,
    isSessionStartedInDB,
    error: effectiveAdmin ? null : providerError, // Clear errors for admin
    
    // Add connection properties
    isConnected: connection.isConnected,
    connectionAttempts: connection.connectionAttempts,
    refetch,
    
    // Ensure admin status is properly set
    isAdmin: isAdmin || effectiveAdmin
  }), [
    isLoading, 
    conversation, 
    currentConversationId,
    roomState,
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
