
import { useState, useEffect } from "react";
import { ConversationWithSession } from "@/types/database";
import { Message } from "@/types/chat";

type UseSessionContextProps = {
  conversation: ConversationWithSession | null;
  currentConversationId: number | null;
  sessionState: {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  };
  isSessionStartedInDB: boolean;
  onError?: (error: string) => void;
};

export const useSessionContext = ({
  conversation,
  currentConversationId,
  sessionState,
  isSessionStartedInDB,
  onError
}: UseSessionContextProps) => {
  const [error, setError] = useState<string | null>(null);
  
  // Track session start status
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Update session active status based on DB status
  useEffect(() => {
    if (isSessionStartedInDB) {
      setIsSessionActive(true);
    }
  }, [isSessionStartedInDB]);
  
  // Handle errors
  useEffect(() => {
    if (error && onError) {
      console.error("Session context error:", error);
      onError(error);
    }
  }, [error, onError]);
  
  // Check if session has ended
  useEffect(() => {
    if (conversation?.is_session_ended) {
      setError("This session has ended and is no longer available");
    }
  }, [conversation]);
  
  return {
    isSessionActive,
    setIsSessionActive,
    error,
    setError
  };
};
