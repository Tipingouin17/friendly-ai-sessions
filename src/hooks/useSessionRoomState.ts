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
    viewMode
  } = useSessionMessages({
    conversation,
    currentUserParticipantId,
    isAdmin
  });
  
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
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode: isAdmin ? "admin" : "participant",
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage,
    anonymousState
  };
};
