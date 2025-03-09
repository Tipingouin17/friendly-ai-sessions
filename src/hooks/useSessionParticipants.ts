
import { useState, useEffect } from "react";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useParticipantCounts } from "@/hooks/useParticipantCounts";
import { useParticipantChannel } from "@/hooks/useParticipantChannel";

export function useSessionParticipants(conversationId: number | null) {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { 
    data: conversation, 
    error: fetchError, 
    refetch, 
    isLoading 
  } = useConversation(conversationId);

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      console.error("Error fetching conversation:", fetchError);
      setError(fetchError.message || "Session not found or no longer available");
    }
  }, [fetchError]);

  // Check if session has ended
  useEffect(() => {
    if (conversation?.is_session_ended) {
      setError("This session has ended and is no longer available");
    } else if (conversation && error) {
      // Reset any previous errors since we have data
      setError(null);
    }
  }, [conversation, error]);

  // Use our specialized hooks
  const {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    error: connectionError,
    setError: setConnectionError
  } = useRealtimeConnection(conversationId, refetch);

  const {
    currentParticipantCount,
    setCurrentParticipantCount,
    maxParticipantsForSession,
    setMaxParticipantsForSession
  } = useParticipantCounts(conversation);

  // Set up participant channel
  useParticipantChannel(
    conversationId,
    setIsConnected,
    attemptReconnection,
    setCurrentParticipantCount,
    setMaxParticipantsForSession,
    refetch
  );

  // Combine errors
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);

  return {
    currentParticipantCount,
    maxParticipantsForSession,
    conversation,
    error,
    refetch,
    isConnected,
    connectionAttempts
  };
}
