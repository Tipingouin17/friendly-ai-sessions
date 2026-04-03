/**
 * use Session Participants
 *
 * Hook for the AIfacilitator application.
 */
import { useState, useEffect, useRef } from "react";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useParticipantCounts } from "@/hooks/useParticipantCounts";
import { useParticipantChannel } from "@/hooks/useParticipantChannel";
import { useSessionStatus } from "@/hooks/useSessionStatus";

export function useSessionParticipants(conversationId: number | null) {
  const [stateError, setStateError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const mountedRef = useRef(true);

  const {
    data: conversation,
    error: fetchError,
    refetch,
    isLoading
  } = useConversation(conversationId);

  // Handle fetch errors
  useEffect(() => {
    if (!mountedRef.current) return;

    if (fetchError) {
      console.error("Error fetching conversation:", fetchError);
      setStateError(fetchError.message || "Session not found or no longer available");
    }
  }, [fetchError]);

  // Check if session has ended
  useEffect(() => {
    if (!mountedRef.current) return;

    if (conversation?.is_session_ended) {
      setStateError("This session has ended and is no longer available");
    }

    // We don't clear error here anymore to avoid conflicts

    if (conversation && !isInitialized) {
      setIsInitialized(true);
    }
  }, [conversation, isInitialized]);

  // Set up cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Use our specialized hooks
  const {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    error: connectionError,
    setError: setConnectionError,
    isConnecting
  } = useRealtimeConnection(conversationId, refetch);

  const {
    currentParticipantCount,
    setCurrentParticipantCount,
    maxParticipantsForSession,
    setMaxParticipantsForSession
  } = useParticipantCounts(conversation);

  // Set up participant channel
  const participantChannelResult = useParticipantChannel({
    conversationId,
    setIsConnected,
    attemptReconnection,
    setCurrentParticipantCount,
    setMaxParticipantsForSession,
    refetch
  });

  // Monitor session status (ended, started, etc.)
  useSessionStatus(conversationId, refetch);

  // Derive final error from all sources
  // This avoids the infinite loop caused by syncing different error states via useEffect
  const finalError = stateError || connectionError || participantChannelResult.error;

  // Force periodic refresh to ensure data consistency - reduce interval for more up-to-date data
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;

    // Initial refresh to ensure we have the latest participant count
    refetch();

    const intervalId = setInterval(() => {
      if (mountedRef.current) {
        refetch();
      }
    }, 5000); // Reduced from 15000 to 5000 ms for more frequent updates

    return () => {
      clearInterval(intervalId);
    };
  }, [conversationId, refetch]);

  return {
    currentParticipantCount,
    maxParticipantsForSession,
    conversation,
    error: finalError,
    refetch,
    isLoading,
    isConnected,
    isConnecting,
    connectionAttempts,
    isInitialized
  };
}
