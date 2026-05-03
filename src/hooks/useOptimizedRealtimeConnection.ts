/**
 * use Optimized Realtime Connection
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef, useCallback } from 'react';
import api from "@/lib/api";
import { removeChannel } from '@/utils/realtimeHelpers';

interface UseOptimizedRealtimeConnectionProps {
  conversationId: number | null;
  onConversationUpdate?: (payload: any) => void;
  onParticipantChange?: (payload: any) => void;
  onSessionEvent?: (payload: any) => void;
  /**
   * Called whenever a new message is inserted in the messages table for this
   * conversation.  The host uses this to trigger an immediate re-fetch so that
   * the auto-advance logic in useMessageFetching sees the new AI message and
   * can fire the next response cycle without waiting for the 3-second poll.
   */
  onNewMessage?: (payload: any) => void;
  isHost?: boolean;
}

export const useOptimizedRealtimeConnection = ({
  conversationId,
  onConversationUpdate,
  onParticipantChange,
  onSessionEvent,
  onNewMessage,
  isHost = false
}: UseOptimizedRealtimeConnectionProps) => {
  const channelsRef = useRef<any[]>([]);
  const connectionStartTimeRef = useRef<number>(0);

  const setupConnection = useCallback(async () => {
    if (!conversationId) return;

    const startTime = performance.now();
    connectionStartTimeRef.current = startTime;
    
    try {
      // Clear any existing channels first
      channelsRef.current.forEach(channel => removeChannel(channel));
      channelsRef.current = [];

      // Single conversation updates channel
      const conversationChannel = api
        .channel(`conversation-${conversationId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          onConversationUpdate?.(payload);
        })
        .subscribe((status) => { /* no-op */ });

      channelsRef.current.push(conversationChannel);

      // Participant changes channel (for host primarily)
      if (isHost) {
        const participantChannel = api
          .channel(`participants-${conversationId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'session_participants',
            filter: `conversation_id=eq.${conversationId}`
          }, (payload) => {
            onParticipantChange?.(payload);
          })
          .subscribe((status) => { /* no-op */ });

        channelsRef.current.push(participantChannel);
      }

      // Session events channel
      const eventsChannel = api
        .channel(`events-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          onSessionEvent?.(payload);
        })
        .subscribe((status) => { /* no-op */ });

      channelsRef.current.push(eventsChannel);

      // Messages channel — critical for the host to detect new AI responses in
      // real time instead of waiting for the 3-second polling interval.
      // Without this listener the auto-advance ref (autoAdvanceForMessageIdRef)
      // never sees the new assistant message ID and the second AI response cycle
      // is never triggered.
      if (isHost && onNewMessage) {
        const messagesChannel = api
          .channel(`messages-${conversationId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          }, (payload) => {
            onNewMessage(payload);
          })
          .subscribe((status) => { /* no-op */ });

        channelsRef.current.push(messagesChannel);
      }

    } catch (error) {
      console.error(`[${isHost ? 'HOST' : 'PARTICIPANT'}] Error setting up realtime connection:`, error);
    }
  }, [conversationId, onConversationUpdate, onParticipantChange, onSessionEvent, onNewMessage, isHost]);

  useEffect(() => {
    setupConnection();

    return () => {
      channelsRef.current.forEach(channel => removeChannel(channel));
      channelsRef.current = [];
    };
  }, [setupConnection]);

  return {
    reconnect: setupConnection,
    isConnected: channelsRef.current.length > 0
  };
};
