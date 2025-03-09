
import { useState, useEffect } from "react";
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useSessionMessages } from "@/hooks/useSessionMessages";
import { useAnonymousState } from "@/hooks/useAnonymousState";

interface UseSessionMonitoringProps {
  conversation: ConversationWithSession | null;
  conversationId: number | null;
  currentUserParticipantId: number | null;
  participants: ParticipantInfo[];
  onError?: (error: string) => void;
}

export function useSessionMonitoring({
  conversation,
  conversationId,
  currentUserParticipantId,
  participants,
  onError
}: UseSessionMonitoringProps) {
  const [isSessionStartedInDB, setIsSessionStartedInDB] = useState(false);

  // Check if session is started in DB
  useEffect(() => {
    if (conversation) {
      setIsSessionStartedInDB(conversation.session_started || false);
    }
  }, [conversation]);

  // Set up room state using existing hooks
  const messages = useSessionMessages(conversationId);
  
  // Set up anonymous state
  const anonymousState = useAnonymousState({
    conversationId,
    currentParticipantId: currentUserParticipantId
  });

  // Create a minimal room state for now
  const roomState = {
    messages: messages || [],
    inputMessage: "",
    setInputMessage: (message: string) => console.log("setInputMessage:", message),
    currentParticipant: 0,
    isRecording: false,
    setIsRecording: (recording: boolean) => console.log("setIsRecording:", recording),
    handleGenerateReport: async () => { console.log("Generate report"); },
    isGeneratingReport: false,
    setMessages: (messages: React.SetStateAction<Message[]>) => console.log("setMessages", messages),
    hasAnswered: false,
    totalResponses: 0,
    viewMode: "participant" as const,
    setViewMode: (mode: "participant" | "admin") => console.log("setViewMode:", mode),
    recordResponse: (participantId: number, hasResponded: boolean) => 
      console.log("recordResponse:", participantId, hasResponded),
    error: null,
    isWaitingForResponse: false,
    handleSendMessage: async () => { console.log("Send message"); },
    handleLikeMessage: (messageId: string) => console.log("Like message:", messageId),
    anonymousState
  };

  return {
    isSessionStartedInDB,
    roomState
  };
}
