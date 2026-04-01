
import { useState, useEffect, useRef } from "react";
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
  // Use a ref for onError to avoid re-triggering the effect when the callback reference changes
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  
  // Track session start status
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Update session active status based on DB status
  useEffect(() => {
    if (isSessionStartedInDB) {
      setIsSessionActive(true);
    }
  }, [isSessionStartedInDB]);
  
  // Handle errors — use ref so this only fires once per unique error value
  useEffect(() => {
    if (error && onErrorRef.current) {
      console.error("Session context error:", error);
      onErrorRef.current(error);
    }
  }, [error]);
  
  // Check if session has ended
  useEffect(() => {
    if (conversation?.is_session_ended) {
      setError("This session has ended and is no longer available");
    }
  }, [conversation?.is_session_ended]);
  
  return {
    isSessionActive,
    setIsSessionActive,
    error,
    setError
  };
};
