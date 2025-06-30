
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
    
    console.log(`🔗 [${isHost ? 'HOST' : 'PARTICIPANT'}] Setting up optimized realtime connection for session ${conversationId}`);

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
          console.log(`📊 [${isHost ? 'HOST' : 'PARTICIPANT'}] Conversation update received in ${connectionTime.toFixed(2)}ms:`, {
            old: payload.old,
            new: payload.new,
            changes: Object.keys(payload.new || {}).filter(key => 
              payload.old && payload.new && payload.old[key] !== payload.new[key]
            )
          });
          
          onConversationUpdate?.(payload);
        })
        .subscribe((status) => {
          console.log(`🔗 Conversation channel status: ${status}`);
        });

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
            console.log(`👥 [HOST] Participant change received in ${connectionTime.toFixed(2)}ms:`, {
              event: payload.eventType,
              participant: payload.new || payload.old
            });
            
            onParticipantChange?.(payload);
          })
          .subscribe((status) => {
            console.log(`👥 Participant channel status: ${status}`);
          });

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
          console.log(`📋 [${isHost ? 'HOST' : 'PARTICIPANT'}] Session event received in ${connectionTime.toFixed(2)}ms:`, {
            eventType: payload.new?.event_type,
            data: payload.new?.data
          });
          
          onSessionEvent?.(payload);
        })
        .subscribe((status) => {
          console.log(`📋 Events channel status: ${status}`);
        });

      channelsRef.current.push(eventsChannel);

      const setupTime = performance.now() - startTime;
      console.log(`✅ [${isHost ? 'HOST' : 'PARTICIPANT'}] Realtime connection setup completed in ${setupTime.toFixed(2)}ms`);

    } catch (error) {
      console.error(`❌ [${isHost ? 'HOST' : 'PARTICIPANT'}] Error setting up realtime connection:`, error);
    }
  }, [conversationId, onConversationUpdate, onParticipantChange, onSessionEvent, isHost]);

  useEffect(() => {
    setupConnection();

    return () => {
      console.log(`🧹 [${isHost ? 'HOST' : 'PARTICIPANT'}] Cleaning up realtime connections`);
      channelsRef.current.forEach(channel => removeChannel(channel));
      channelsRef.current = [];
    };
  }, [setupConnection]);

  return {
    reconnect: setupConnection,
    isConnected: channelsRef.current.length > 0
  };
};
