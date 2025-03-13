
import { useState, useEffect } from "react";
import { useSessionMessages } from "@/hooks/useSessionMessages";
import { useReportGenerator } from "@/hooks/useReportGenerator";
import { useParticipantResponses } from "@/hooks/useParticipantResponses";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";

interface UseSessionRoomStateProps {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  currentUserParticipantId: number | null;
  participants: ParticipantInfo[];
  welcomeMessage: string | null;
  isAdmin?: boolean;
}

export function useSessionRoomState({
  conversationId,
  conversation,
  currentUserParticipantId,
  participants,
  welcomeMessage,
  isAdmin
}: UseSessionRoomStateProps) {
  // UI state
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"participant" | "admin">("participant");
  const [error, setError] = useState<string | null>(null);
  
  // Message state
  const { 
    messages, 
    setMessages, 
    error: messagesError 
  } = useSessionMessages({
    conversationId,
    welcomeMessage
  });
  
  // Report generation
  const { 
    handleGenerateReport, 
    isGeneratingReport, 
    error: reportError 
  } = useReportGenerator({
    conversationId,
    messages,
    setMessages
  });
  
  // Check if this is a new session with just a welcome message
  const isNewSession = messages.length <= 1 && 
    messages.every(msg => msg.sender === 'assistant' || msg.id === 'welcome');
  
  // Participant response tracking
  const { 
    hasAnswered, 
    totalResponses, 
    recordResponse,
    clearAllResponses 
  } = useParticipantResponses({
    messages,
    currentUserParticipantId
  });
  
  // Clear responses state when joining a new session
  useEffect(() => {
    if (isNewSession && currentUserParticipantId) {
      console.log('New session detected in useSessionRoomState, clearing responses');
      clearAllResponses();
    }
  }, [isNewSession, currentUserParticipantId, clearAllResponses]);
  
  // Anonymous state
  const anonymousState = useAnonymousState({
    conversationId,
    currentParticipantId: currentUserParticipantId
  });
  
  // Message interaction handlers
  const {
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage,
    error: interactionsError
  } = useSessionInteractions({
    currentConversationId: conversationId,
    sessionState: {
      messages,
      setMessages,
      inputMessage,
      setInputMessage,
      currentParticipant: currentUserParticipantId || 0,
      recordResponse,
      totalResponses,
      hasAnswered,
      viewMode
    },
    conversation,
    participants,
    isAnonymous: anonymousState.isAnonymous
  });
  
  // Handle errors from child hooks
  useEffect(() => {
    const newError = messagesError || reportError || interactionsError;
    if (newError) {
      console.error("Session room error:", newError);
      setError(newError);
    }
  }, [messagesError, reportError, interactionsError]);
  
  return {
    // UI state
    inputMessage,
    setInputMessage,
    isRecording,
    setIsRecording,
    viewMode,
    setViewMode,
    
    // Message state
    messages,
    setMessages,
    isWaitingForResponse,
    isNewSession,
    
    // Participant state
    currentParticipant: currentUserParticipantId || 0,
    hasAnswered,
    totalResponses,
    recordResponse,
    clearAllResponses,
    
    // Actions
    handleSendMessage,
    handleLikeMessage,
    handleGenerateReport,
    isGeneratingReport,
    
    // Anonymous state
    anonymousState,
    
    // Error state
    error
  };
}
