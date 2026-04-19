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
import { setJoinToken, getJoinToken } from "@/lib/api";

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

  // ── Join-token bootstrap from conversation payload ──────────────────────────
  // Side-effect only: persist the token to sessionStorage so that all
  // subsequent API calls carry the X-Join-Token header.
  // isTokenReady is derived synchronously below — no useEffect lag.
  useEffect(() => {
    if (!mountedRef.current) return;
    const token = (conversation as any)?.join_token;
    if (token) {
      // Pass the session ID so the token is stored under the scoped key
      // mf_join_token_{conversationId} rather than the legacy flat key.
      setJoinToken(token, conversationId != null ? String(conversationId) : null);
    }
  }, [conversation, conversationId]);

  // ── isTokenReady — derived synchronously, no useState lag ──────────────────
  // A token is "ready" when EITHER:
  //   a) sessionStorage already has one (set by the IIFE in useJoinSessionState
  //      when the URL contained ?token=UUID), OR
  //   b) the conversation has loaded and contains a join_token (covers plain
  //      ?id=X URLs, returning participants, and private/incognito users).
  //
  // By deriving this on every render instead of via useState+useEffect we
  // eliminate the one-render lag that kept the Join button disabled on mobile
  // even after the conversation data had already arrived.
  const conversationToken = (conversation as any)?.join_token;
  const isTokenReady = !!getJoinToken() || !!conversationToken;

  // Handle fetch errors
  useEffect(() => {
    if (!mountedRef.current) return;

    if (fetchError) {
      console.error("Error fetching conversation:", fetchError);
      setStateError(fetchError.message || "Session not found or no longer available");
    }
  }, [fetchError]);

  // Track initialization — ended sessions are valid read-only states, not errors
  useEffect(() => {
    if (!mountedRef.current) return;

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
  const finalError = stateError || connectionError || participantChannelResult.error;

  // Force periodic refresh to ensure data consistency
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;

    // Initial refresh to ensure we have the latest participant count
    refetch();

    const intervalId = setInterval(() => {
      if (mountedRef.current) {
        refetch();
      }
    }, 5000);

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
    isInitialized,
    isTokenReady
  };
}
