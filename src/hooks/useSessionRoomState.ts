
import { useState, useEffect } from "react";
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
  useEffect(() => {
    console.log("useSessionRoomState running...");
  }, []);

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
    currentParticipant,
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode,
    setViewMode
  } = useSessionMessages({
    conversationId,
    currentUserParticipantId,
    isAdmin
  });
  
  // Handle report generation
  const handleGenerateReport = async () => {
    if (!conversationId) return;
    
    setIsGeneratingReport(true);
    try {
      // Placeholder for report generation logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Report generated for conversation", conversationId);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  // Set up session interactions
  const {
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage,
    error
  } = useSessionInteractions({
    currentConversationId: conversationId,
    sessionState: {
      messages,
      setMessages,
      inputMessage,
      setInputMessage,
      currentParticipant,
      recordResponse,
      totalResponses,
      hasAnswered,
      viewMode: isAdmin ? "admin" : "participant"
    },
    conversation,
    participants,
    isAnonymous: anonymousState.isAnonymous
  });
  
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
    viewMode,
    setViewMode,
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage,
    anonymousState,
    error
  };
};
