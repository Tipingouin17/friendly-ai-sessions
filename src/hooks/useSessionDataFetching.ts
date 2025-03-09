
import { useEffect } from "react";
import { ConversationWithSession } from "@/types/database";
import { useConversation } from "@/hooks/useConversation";

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
  
  // Handle errors from the query
  const errorMessage = error ? error.message : null;

  // Handle fetch errors
  useEffect(() => {
    if (error) {
      console.log("Session data fetching error:", error.message);
      if (onError) {
        onError(error.message);
      }
    }
  }, [error, onError]);

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
