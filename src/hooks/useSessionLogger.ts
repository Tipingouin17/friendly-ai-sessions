
import { useEffect } from "react";
import { ConversationWithSession } from "@/types/database";
import { Message, ParticipantInfo } from "@/types/chat";

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
  // Log important state changes for debugging
  useEffect(() => {
    console.log("SessionLogger - conversation data:", conversation);
    console.log("SessionLogger - currentConversationId:", currentConversationId);
    console.log("SessionLogger - isLoading:", isLoading);
    console.log("SessionLogger - messages count:", messages.length);
    console.log("SessionLogger - participants count:", participants.length);
    console.log("SessionLogger - isSessionStartedInDB:", isSessionStartedInDB);
    
    if (error) {
      console.error("SessionLogger - error:", error);
    }
  }, [currentConversationId, conversation, isLoading, messages.length, participants.length, isSessionStartedInDB, error]);
};
