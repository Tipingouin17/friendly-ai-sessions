import { useEffect, useRef } from "react";
import { ConversationWithSession } from "@/types/database";

interface UseStuckStateHandlerProps {
  isLoading: boolean;
  currentConversationId: number | null;
  conversation: ConversationWithSession | null;
  refetch: () => void;
  forceRefreshParticipants: () => void;
}

export function useStuckStateHandler({
  isLoading,
  currentConversationId,
  conversation,
  refetch,
  forceRefreshParticipants
}: UseStuckStateHandlerProps) {
  useEffect(() => {
    console.log("useStuckStateHandler running...");
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading && currentConversationId && !conversation) {
        console.log("Session appears stuck in loading state - forcing data refresh");
        refetch();
        
        // Also refresh participants
        if (forceRefreshParticipants) {
          forceRefreshParticipants();
        }
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [isLoading, currentConversationId, conversation, refetch, forceRefreshParticipants]);
}
