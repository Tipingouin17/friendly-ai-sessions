
import { useEffect } from "react";

interface UseStuckStateHandlerProps {
  isLoading: boolean;
  currentConversationId: number | null;
  conversation: any;
  refetch: () => void;
  forceRefreshParticipants?: () => void;
}

/**
 * Hook to handle stuck states by forcing a refresh after a timeout
 */
export function useStuckStateHandler({
  isLoading,
  currentConversationId,
  conversation,
  refetch,
  forceRefreshParticipants
}: UseStuckStateHandlerProps) {
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
