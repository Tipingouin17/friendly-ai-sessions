/**
 * use Optimized Realtime Connection
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { removeChannel } from '@/utils/realtimeHelpers';

interface UseOptimizedRealtimeConnectionProps {
  conversationId: number | null;
  onConversationUpdate?: (payload: any) => void;
  onParticipantChange?: (payload: any) => void;
  onSessionEvent?: (payload: any) => void;
  isHost?: boolean;
}

export const useOptimizedRealtimeConnection = ({
  conversationId,
  onConversationUpdate,
  onParticipantChange,
  onSessionEvent,
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
      const conversationChannel = supabase
        .channel(`conversation-${conversationId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          const connectionTime = performance.now() - connectionStartTimeRef.current;
          
          onConversationUpdate?.(payload);
        })
        .subscribe((status) => { /* no-op */ });

      channelsRef.current.push(conversationChannel);

      // Participant changes channel (for host primarily)
      if (isHost) {
        const participantChannel = supabase
          .channel(`participants-${conversationId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'session_participants',
            filter: `conversation_id=eq.${conversationId}`
          }, (payload) => {
            const connectionTime = performance.now() - connectionStartTimeRef.current;
            
            onParticipantChange?.(payload);
          })
          .subscribe((status) => { /* no-op */ });

        channelsRef.current.push(participantChannel);
      }

      // Session events channel
      const eventsChannel = supabase
        .channel(`events-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const connectionTime = performance.now() - connectionStartTimeRef.current;
          
          onSessionEvent?.(payload);
        })
        .subscribe((status) => { /* no-op */ });

      channelsRef.current.push(eventsChannel);

      const setupTime = performance.now() - startTime;

    } catch (error) {
      console.error(`[${isHost ? 'HOST' : 'PARTICIPANT'}] Error setting up realtime connection:`, error);
    }
  }, [conversationId, onConversationUpdate, onParticipantChange, onSessionEvent, isHost]);

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
