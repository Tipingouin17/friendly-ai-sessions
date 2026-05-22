/**
 * use Session Room State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useMemo } from "react";
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useSessionMessages } from "@/hooks/useSessionMessages";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { useSessionClosure } from "@/hooks/useSessionClosure";

interface UseSessionRoomStateProps {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  currentUserParticipantId: number | null;
  participants: ParticipantInfo[];
  welcomeMessage: string | null;
  isAdmin: boolean;
}

export const useSessionRoomState = ({
  conversationId,
  conversation,
  currentUserParticipantId,
  participants,
  welcomeMessage,
  isAdmin
}: UseSessionRoomStateProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const { isClosing: isGeneratingReport, closeSessionAndGenerateReport } = useSessionClosure();
  
  // Get anonymous state
  const anonymousState = useAnonymousState({
    conversationId,
    currentParticipantId: currentUserParticipantId
  });
  
  // Get session messages
  const {
    messages: sessionMessages,
    currentParticipant,
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode,
    setViewMode,
    error: messagesError,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse,
    forceFetchMessages
  } = useSessionMessages({
    conversationId,
    currentUserParticipantId,
    isAdmin,
    welcomeMessage,
    conversation,
    totalParticipants: participants.length || conversation?.current_participants || 1
  });
  
  // Sync messages from session messages
  useEffect(() => {
    if (sessionMessages && sessionMessages.length > 0) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);
  
  // Handle report generation through the same validated close-and-report workflow
  // used by the dedicated host controls. This avoids the previous fake spinner path
  // and ensures ownership validation, report persistence, cache invalidation, and
  // post-completion navigation all stay consistent across entry points.
  const handleGenerateReport = async () => {
    if (!conversationId) return;
    await closeSessionAndGenerateReport(conversationId);
  };
  
  // Create a type-safe default view mode
  const safeViewMode: "participant" | "admin" = isAdmin ? "admin" : "participant";
  
  // Prepare the session state for interactions hook - ensure viewMode is properly typed
  const sessionState = useMemo(() => ({
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    currentParticipant,
    recordResponse,
    totalResponses,
    hasAnswered,
    // Use the explicitly typed viewMode
    viewMode: (viewMode as "participant" | "admin") || safeViewMode
  }), [
    messages, 
    inputMessage, 
    currentParticipant, 
    recordResponse, 
    totalResponses, 
    hasAnswered, 
    viewMode,
    safeViewMode
  ]);
  
  // Set up session interactions with memoized session state
  const {
    isWaitingForResponse,
    handleSendMessage,
    error: interactionsError
  } = useSessionInteractions({
    currentConversationId: conversationId,
    sessionState,
    conversation,
    participants,
    isAnonymous: anonymousState.isAnonymous
  });
  
  // Combine errors
  const error = messagesError || interactionsError || null;
  
  return {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    currentParticipant,
    isRecording,
    setIsRecording,
    handleGenerateReport,
    isGeneratingReport,
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode: sessionState.viewMode, // Use the properly typed viewMode from sessionState
    setViewMode,
    isWaitingForResponse,
    isWaitingForResponses,
    responseCount,
    totalParticipants: participants.length || conversation?.current_participants || 1,
    generateAggregatedResponse,
    isGeneratingResponse,
    forceFetchMessages,
    handleSendMessage,
    anonymousState,
    error
  };
};
