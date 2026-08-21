/**
 * use Session Status
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import api, { getJoinToken } from "@/lib/api";
import { removeChannel } from "@/utils/realtimeHelpers";

// A session can be observed by nested host/participant shells at the same time.
// Keep start notifications browser-local and conversation-scoped so duplicate
// realtime subscriptions cannot produce duplicate user-facing toasts.
const announcedSessionStarts = new Set<number>();
const TERMINAL_SESSION_STATUSES = new Set(['completed', 'cancelled', 'canceled', 'expired', 'ended']);

const isTerminalSession = (conversation: { is_session_ended?: unknown; status?: unknown } | null | undefined) => {
  if (conversation?.is_session_ended === true) return true;
  const status = typeof conversation?.status === 'string' ? conversation.status.toLowerCase() : '';
  return TERMINAL_SESSION_STATUSES.has(status);
};

export function useSessionStatus(conversationId: number | null, refetch: () => void) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeConnected = useRef(false);

  const isJoinPage = useRef(window.location.pathname.includes('/join-session'));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleSessionEnd = () => {
    if (!mountedRef.current) return;
    setSessionEnded(true);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    toast({ title: "Session Ended", description: "This session has been closed." });
    if (!isJoinPage.current) {
      // A tokenized invite remains a participant route even if the browser also
      // has a host login. Never send that participant into the host dashboard.
      const params = new URLSearchParams(window.location.search);
      const isParticipantRoute = Boolean(getJoinToken(String(conversationId))) || params.has('participantId') || params.has('token');
      navigate(isParticipantRoute ? '/' : '/past-workshops', { replace: true });
    }
  };

  // Fallback polling — only used when WebSocket fails
  const startFallbackPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      if (!conversationId || !mountedRef.current) return;
      try {
        const { data, error } = await api
          .from('conversations')
          .select('is_session_ended, status')
          .eq('id', conversationId)
          .single();
        if (error) return;
        if (isTerminalSession(data)) {
          handleSessionEnd();
        }
      } catch { /* silent */ }
    }, 5000);
  };

  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;

    const channelName = `session-status-${conversationId}`;
    realtimeConnected.current = false;

    const channel = api
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        if (!mountedRef.current || !payload.new) return;
        if (isTerminalSession(payload.new)) {
          handleSessionEnd();
        }
        if (payload.new.session_started && !payload.old?.session_started && !announcedSessionStarts.has(conversationId)) {
          announcedSessionStarts.add(conversationId);
          toast({ title: "Session Started", description: "The host has started the session." });
        }
        refetch();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeConnected.current = true;
          // WebSocket connected — stop any existing polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Session status channel error, starting fallback polling');
          realtimeConnected.current = false;
          startFallbackPolling();
        }
      });

    // Only start polling if WebSocket hasn't connected within 3 seconds
    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnected.current && mountedRef.current) {
        startFallbackPolling();
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [conversationId]);

  return { sessionEnded };
}
