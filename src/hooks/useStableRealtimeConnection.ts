/**
 * use Stable Realtime Connection
 *
 * Subscribes to realtime updates for a given conversation via the shared
 * WebSocket shim in api.ts.
 *
 * KEY DESIGN DECISIONS
 * ────────────────────
 * 1. Stable topic name — no timestamp suffix.
 *    The server stores the topic in its room map on phx_join.  If the client
 *    creates a new channel with a different topic the server still broadcasts
 *    to the OLD topic and the message is silently dropped.
 *    Using `stable-realtime-{conversationId}` guarantees the server always
 *    broadcasts to a topic the client is listening on.
 *
 * 2. Callbacks stored in refs — setupConnection has ZERO external deps.
 *    Previously onMessageUpdate/onSessionUpdate were deps of setupConnection.
 *    Even when wrapped in useCallback, any parent re-render that recreated
 *    fetchMessages would cascade:
 *      fetchMessages → onMessageUpdate → setupConnection →
 *      useEffect re-runs → cleanup() destroys the channel →
 *      new channel created → server still has the old topic → broadcast dropped.
 *    Storing callbacks in refs breaks this cascade entirely.
 *    The main useEffect only re-runs when conversationId or enabled changes.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import api from "@/lib/api";
import { removeChannel } from '@/utils/realtimeHelpers';

interface UseStableRealtimeConnectionProps {
  conversationId: number | null;
  onMessageUpdate?: () => void;
  onParticipantUpdate?: () => void;
  onSessionUpdate?: () => void;
  enabled?: boolean;
}

export function useStableRealtimeConnection({
  conversationId,
  onMessageUpdate,
  onParticipantUpdate,
  onSessionUpdate,
  enabled = true
}: UseStableRealtimeConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastMessageCheck, setLastMessageCheck] = useState<number>(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const connectionAttemptsRef = useRef(0);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stabilityCheckRef = useRef<NodeJS.Timeout | null>(null);
  const connectionEstablishedRef = useRef(false);

  // Callback refs — always point to the latest version of each callback.
  // Their *identity* never changes so setupConnection has zero deps on them.
  const onMessageUpdateRef = useRef(onMessageUpdate);
  const onParticipantUpdateRef = useRef(onParticipantUpdate);
  const onSessionUpdateRef = useRef(onSessionUpdate);
  // Sync refs after every render (no dep array = runs every render, cheap).
  useEffect(() => { onMessageUpdateRef.current = onMessageUpdate; });
  useEffect(() => { onParticipantUpdateRef.current = onParticipantUpdate; });
  useEffect(() => { onSessionUpdateRef.current = onSessionUpdate; });

  // conversationId ref so scheduleReconnect/setupConnection can read it
  // without being in their dep arrays.
  const conversationIdRef = useRef(conversationId);
  useEffect(() => { conversationIdRef.current = conversationId; });

  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 2000;

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (stabilityCheckRef.current) {
      clearTimeout(stabilityCheckRef.current);
      stabilityCheckRef.current = null;
    }
    connectionEstablishedRef.current = false;
  }, []); // stable — only uses refs

  // Forward-declared so scheduleReconnect can call setupConnection via ref.
  const setupConnectionRef = useRef<() => void>(() => { /* filled below */ });

  // ── Reconnect scheduler ───────────────────────────────────────────────────
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || connectionAttemptsRef.current >= maxReconnectAttempts) return;
    const delay = Math.min(baseReconnectDelay * Math.pow(2, connectionAttemptsRef.current), 30000);
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connectionAttemptsRef.current += 1;
        setConnectionAttempts(connectionAttemptsRef.current);
        setupConnectionRef.current();
      }
    }, delay);
  }, []); // stable — only uses refs

  // ── Connection setup — ZERO external deps ────────────────────────────────
  const setupConnection = useCallback(() => {
    const convId = conversationIdRef.current;
    if (!convId || !mountedRef.current) return;

    // Tear down any existing channel before creating a new one.
    cleanup();

    // Stable topic — no timestamp, no random suffix.
    // The server extracts the numeric conv_id via the regex `-([0-9]+)(?:-|$)`.
    const channelName = `stable-realtime-${convId}`;

    try {
      const channel = api
        .channel(channelName)
        // Messages
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        }, () => {
          if (!mountedRef.current) return;
          setLastMessageCheck(Date.now());
          onMessageUpdateRef.current?.();
        })
        // Participants
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${convId}`
        }, () => {
          if (!mountedRef.current) return;
          onParticipantUpdateRef.current?.();
        })
        // Conversation updates
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${convId}`
        }, () => {
          if (!mountedRef.current) return;
          onSessionUpdateRef.current?.();
        })
        .subscribe((status: string) => {
          if (!mountedRef.current) return;
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionAttempts(0);
            connectionAttemptsRef.current = 0;
            connectionEstablishedRef.current = true;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false);
            connectionEstablishedRef.current = false;
            if (connectionAttemptsRef.current < maxReconnectAttempts) {
              scheduleReconnect();
            }
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            connectionEstablishedRef.current = false;
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error(`Error creating stable realtime connection for conversation ${convId}:`, error);
      setIsConnected(false);
      if (connectionAttemptsRef.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    }
  }, [cleanup, scheduleReconnect]); // cleanup and scheduleReconnect are both stable

  // Keep the ref current so scheduleReconnect can call it.
  useEffect(() => { setupConnectionRef.current = setupConnection; });

  // ── Main effect — only re-runs when conversationId or enabled changes ─────
  useEffect(() => {
    mountedRef.current = true;
    let timer: NodeJS.Timeout | undefined;

    if (enabled && conversationId) {
      // Small delay to absorb React Strict Mode double-mount.
      timer = setTimeout(() => { setupConnection(); }, 300);
    }

    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, enabled]); // intentionally minimal — setupConnection/cleanup are stable

  // ── Manual reconnect ──────────────────────────────────────────────────────
  const forceReconnect = useCallback(() => {
    setConnectionAttempts(0);
    connectionAttemptsRef.current = 0;
    setupConnection();
  }, [setupConnection]);

  return {
    isConnected,
    connectionAttempts,
    forceReconnect,
    lastMessageCheck,
    hasStableConnection: isConnected && connectionEstablishedRef.current
  };
}
