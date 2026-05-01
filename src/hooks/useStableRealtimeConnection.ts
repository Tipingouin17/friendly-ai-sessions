/**
 * use Stable Realtime Connection
 *
 * Hook for the AIfacilitator application.
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

  // Use ref for connection attempts to avoid dependency cycles
  const connectionAttemptsRef = useRef(0);

  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stabilityCheckRef = useRef<NodeJS.Timeout | null>(null);
  const connectionEstablishedRef = useRef(false);

  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 2000;
  const connectionStabilityWindow = 10000; // 10 seconds

  // Cleanup function
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
  }, []);

  // Exponential backoff reconnection
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || connectionAttemptsRef.current >= maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(baseReconnectDelay * Math.pow(2, connectionAttemptsRef.current), 30000);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connectionAttemptsRef.current += 1;
        setConnectionAttempts(connectionAttemptsRef.current);
        setupConnection();
      }
    }, delay);
  }, [conversationId]);

  // Enhanced connection setup with stability monitoring
  const setupConnection = useCallback(() => {
    if (!conversationId || !enabled || !mountedRef.current) {
      return;
    }

    cleanup();

    const channelName = `stable-realtime-${conversationId}-${Date.now()}`;

    try {
      const channel = api
        .channel(channelName)
        // Messages channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;

          // Update last message check timestamp
          setLastMessageCheck(Date.now());

          if (onMessageUpdate) {
            onMessageUpdate();
          }
        })
        // Participants channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;

          if (onParticipantUpdate) {
            onParticipantUpdate();
          }
        })
        // Conversation updates channel
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;

          if (onSessionUpdate) {
            onSessionUpdate();
          }
        })
        .subscribe((status) => {
          if (!mountedRef.current) return;

          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionAttempts(0);
            connectionAttemptsRef.current = 0;
            connectionEstablishedRef.current = true;

            // Start stability monitoring
            stabilityCheckRef.current = setTimeout(() => {
              if (mountedRef.current && connectionEstablishedRef.current) { /* no-op */ }
            }, connectionStabilityWindow);

          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`🚨 Stable channel error for conversation ${conversationId}: ${status}`);
            setIsConnected(false);
            connectionEstablishedRef.current = false;

            // Only reconnect if we haven't exceeded max attempts
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
      console.error(`Error creating stable realtime connection for conversation ${conversationId}:`, error);
      setIsConnected(false);

      if (connectionAttemptsRef.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    }
  }, [conversationId, enabled, onMessageUpdate, onParticipantUpdate, onSessionUpdate, cleanup, scheduleReconnect]);

  // Setup effect with delay for stability
  useEffect(() => {
    mountedRef.current = true;
    let timer: NodeJS.Timeout;

    if (enabled && conversationId) {
      // Add delay to prevent race conditions during mounting/unmounting (Strict Mode)
      timer = setTimeout(() => {
        setupConnection();
      }, 500);
    }

    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
      cleanup();
    };
  }, [conversationId, enabled, setupConnection, cleanup]);

  // Manual reconnection function
  const forceReconnect = useCallback(() => {
    setConnectionAttempts(0);
    connectionAttemptsRef.current = 0;
    setupConnection();
  }, [conversationId, setupConnection]);

  return {
    isConnected,
    connectionAttempts,
    forceReconnect,
    lastMessageCheck,
    hasStableConnection: isConnected && connectionEstablishedRef.current
  };
}
