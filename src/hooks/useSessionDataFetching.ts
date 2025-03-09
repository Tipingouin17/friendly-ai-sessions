
import { useEffect } from "react";
import { ConversationWithSession } from "@/types/database";
import { useConversation } from "@/hooks/useConversation";
import { useSessionErrorHandling } from "@/hooks/useSessionErrorHandling";

interface UseSessionDataFetchingProps {
  conversationId: number | null;
  onError?: (error: string) => void;
}

export function useSessionDataFetching({
  conversationId,
  onError
}: UseSessionDataFetchingProps) {
  // Fetch conversation data with React Query
  const {
    data: conversation,
    isLoading,
    error,
    refetch
  } = useConversation(conversationId);
  
  // Handle fetch errors
  const { errorMessage } = useSessionErrorHandling({
    error: error || null,
    conversationId,
    onError
  });

  // Additional validation for conversation data
  useEffect(() => {
    if (conversation?.is_session_ended) {
      console.log("Session has ended according to conversation data");
      if (onError) {
        onError("This session has ended and is no longer available");
      }
    }
  }, [conversation, onError]);

  return {
    conversation,
    isLoading,
    errorMessage,
    refetch
  };
}
