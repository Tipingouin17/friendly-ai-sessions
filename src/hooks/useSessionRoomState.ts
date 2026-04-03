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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
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
    error: messagesError
  } = useSessionMessages({
    conversationId,
    currentUserParticipantId,
    isAdmin,
    welcomeMessage
  });
  
  // Sync messages from session messages
  useEffect(() => {
    if (sessionMessages && sessionMessages.length > 0) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);
  
  // Handle report generation
  const handleGenerateReport = async () => {
    if (!conversationId) return;
    
    setIsGeneratingReport(true);
    try {
      // Placeholder for report generation logic
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsGeneratingReport(false);
    }
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
    handleSendMessage,
    anonymousState,
    error
  };
};
