
import { useState, useEffect, useRef } from "react";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useParticipantCounts } from "@/hooks/useParticipantCounts";
import { useParticipantChannel } from "@/hooks/useParticipantChannel";
import { useSessionStatus } from "@/hooks/useSessionStatus";

export function useSessionParticipants(conversationId: number | null) {
  const [error, setError] = useState<string | null>(null);
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
      setError(fetchError.message || "Session not found or no longer available");
    }
  }, [fetchError]);

  // Check if session has ended
  useEffect(() => {
    if (!mountedRef.current) return;

    if (conversation?.is_session_ended) {
      console.log("Session has ended, updating error state");
      setError("This session has ended and is no longer available");
    } else if (conversation && error) {
      // Reset any previous errors since we have data
      console.log("Got conversation data, clearing previous error");
      setError(null);
    }
    
    if (conversation && !isInitialized) {
      console.log("Session participant hook initialized with conversation:", conversation.id);
      setIsInitialized(true);
    }
  }, [conversation, error, isInitialized]);

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

  // Combine errors
  useEffect(() => {
    if (!mountedRef.current) return;

    if (connectionError && !error) {
      console.log("Setting error from connection error:", connectionError);
      setError(connectionError);
    }
    
    if (participantChannelResult.error && !error && !connectionError) {
      console.log("Setting error from participant channel:", participantChannelResult.error);
      setError(participantChannelResult.error);
    }
  }, [connectionError, participantChannelResult.error, error]);

  // Force periodic refresh to ensure data consistency - reduce interval for more up-to-date data
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;
    
    // Initial refresh to ensure we have the latest participant count
    refetch();
    
    const intervalId = setInterval(() => {
      if (mountedRef.current) {
        console.log("Periodic refresh of session data");
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
    error,
    refetch,
    isLoading,
    isConnected,
    isConnecting,
    connectionAttempts,
    isInitialized
  };
}
