/**
 * use Session Logger
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect } from "react";
import { ConversationWithSession } from "@/types/database";
import { Message, ParticipantInfo } from "@/types/chat";
import { createLogger } from "@/utils/debugLogger";

interface UseSessionLoggerProps {
  currentConversationId: number | null;
  conversation: ConversationWithSession | null;
  isLoading: boolean;
  messages: Message[];
  participants: ParticipantInfo[];
  isSessionStartedInDB: boolean;
  error: string | null;
}

export const useSessionLogger = ({
  currentConversationId,
  conversation,
  isLoading,
  messages,
  participants,
  isSessionStartedInDB,
  error
}: UseSessionLoggerProps) => {
  const logger = createLogger("SessionLogger", "session");
  
  // Log important state changes for debugging
  useEffect(() => {
    logger.category("conversation", "conversation data:", conversation);
    logger.category("session", "currentConversationId:", currentConversationId);
    logger.category("state", "isLoading:", isLoading);
    logger.category("messages", "messages count:", messages.length);
    logger.category("participants", "participants count:", participants.length);
    logger.category("session", "isSessionStartedInDB:", isSessionStartedInDB);
    
    if (error) {
      logger.error("error:", error);
    }
  }, [currentConversationId, conversation, isLoading, messages.length, participants.length, isSessionStartedInDB, error]);
};

export default useSessionLogger;
