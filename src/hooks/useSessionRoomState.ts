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
import { useFacilitatorToolbox } from "@/hooks/useFacilitatorToolbox";
import { useFacilitationModeOrchestrator } from "@/hooks/useFacilitationModeOrchestrator";

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
  const resolvedModeParticipantId = useMemo(() => {
    if (typeof currentUserParticipantId === 'number' && currentUserParticipantId > 0) return currentUserParticipantId;
    if (typeof window === 'undefined') return null;
    const rawParticipantId = new URLSearchParams(window.location.search).get('participantId');
    const participantId = rawParticipantId ? Number.parseInt(rawParticipantId, 10) : NaN;
    return Number.isFinite(participantId) && participantId > 0 ? participantId : null;
  }, [currentUserParticipantId]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const toolbox = useFacilitatorToolbox(conversation);
  const modeOrchestrator = useFacilitationModeOrchestrator(conversation, {
    conversationId,
    participantId: resolvedModeParticipantId,
    realtime: true,
  });
  
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
    error,
    enabledTools: toolbox.enabledTools,
    isLoadingToolbox: toolbox.isLoadingToolbox,
    toolboxError: toolbox.toolboxError,
    toolboxInstruction: toolbox.toolboxInstruction,
    enabledModes: modeOrchestrator.enabledModes,
    activeMode: modeOrchestrator.activeMode,
    participantModeState: modeOrchestrator.participantModeState,
    isLoadingModes: modeOrchestrator.isLoadingModes,
    modeError: modeOrchestrator.modeError,
    modeInstruction: modeOrchestrator.modeInstruction,
    startMode: modeOrchestrator.startMode,
    approveMode: modeOrchestrator.approveMode,
    endMode: modeOrchestrator.endMode,
    rejectMode: modeOrchestrator.rejectMode,
    submitModeInput: modeOrchestrator.submitInput
  };
};
