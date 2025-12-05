import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      console.log(`🚫 Max reconnection attempts reached for conversation ${conversationId}`);
      return;
    }

    const delay = Math.min(baseReconnectDelay * Math.pow(2, connectionAttemptsRef.current), 30000);
    console.log(`⏰ Scheduling reconnection attempt ${connectionAttemptsRef.current + 1} in ${delay}ms`);

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

    console.log(`🔗 Setting up stable realtime connection for conversation ${conversationId} (attempt ${connectionAttemptsRef.current + 1})`);

    cleanup();

    const channelName = `stable-realtime-${conversationId}-${Date.now()}`;

    try {
      const channel = supabase
        .channel(channelName)
        // Messages channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;

          console.log(`📨 Stable message update for conversation ${conversationId}:`, {
            event: payload.eventType,
            messageId: (payload.new as any)?.id || (payload.old as any)?.id,
            role: (payload.new as any)?.role || (payload.old as any)?.role
          });

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

          console.log(`👥 Stable participant update for conversation ${conversationId}:`, {
            event: payload.eventType,
            participantId: (payload.new as any)?.participant_id || (payload.old as any)?.participant_id
          });

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

          console.log(`🔄 Stable conversation update for conversation ${conversationId}:`, {
            sessionStarted: payload.new?.session_started,
            currentParticipants: payload.new?.current_participants,
            welcomeStatus: payload.new?.welcome_message_status
          });

          if (onSessionUpdate) {
            onSessionUpdate();
          }
        })
        .subscribe((status) => {
          if (!mountedRef.current) return;

          console.log(`🔗 Stable channel status for conversation ${conversationId}: ${status}`);

          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionAttempts(0);
            connectionAttemptsRef.current = 0;
            connectionEstablishedRef.current = true;

            // Start stability monitoring
            stabilityCheckRef.current = setTimeout(() => {
              if (mountedRef.current && connectionEstablishedRef.current) {
                console.log(`✅ Connection stable for conversation ${conversationId}`);
              }
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
            console.log(`🔒 Stable channel closed for conversation ${conversationId}`);
            setIsConnected(false);
            connectionEstablishedRef.current = false;
          }
        });

      channelRef.current = channel;

    } catch (error) {
      console.error(`❌ Error creating stable realtime connection for conversation ${conversationId}:`, error);
      setIsConnected(false);

      if (connectionAttemptsRef.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    }
  }, [conversationId, enabled, onMessageUpdate, onParticipantUpdate, onSessionUpdate, cleanup, scheduleReconnect]);

  // Setup effect
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && conversationId) {
      setupConnection();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, enabled, setupConnection, cleanup]);

  // Manual reconnection function
  const forceReconnect = useCallback(() => {
    console.log(`🔄 Force reconnecting stable realtime for conversation ${conversationId}`);
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
