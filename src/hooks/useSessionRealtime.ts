
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { createLogger } from '@/utils/debugLogger';

interface UseSessionRealtimeProps {
  conversationId: number | null;
  onSessionStart: () => void;
  onNewMessage: (message: Message) => void;
  isAdmin?: boolean;
}

export const useSessionRealtime = ({
  conversationId,
  onSessionStart,
  onNewMessage,
  isAdmin = false
}: UseSessionRealtimeProps) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const channelRef = useRef<any>(null);
  const logger = createLogger('SessionRealtime', 'realtime');

  useEffect(() => {
    if (!conversationId) return;

    const channelName = `session-realtime-${conversationId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        if (payload.new.session_started && !payload.old.session_started) {
          logger.category('realtime', 'Session started event received');
          onSessionStart();
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const message: Message = {
          id: payload.new.id.toString(),
          content: typeof payload.new.content === 'string' 
            ? payload.new.content 
            : payload.new.content.text,
          sender: payload.new.role === 'assistant' ? 'assistant' : 'user',
          timestamp: new Date(payload.new.created_at),
          avatar: payload.new.content?.avatar,
          participant: payload.new.participant_id ? `P${payload.new.participant_id}` : undefined
        };
        
        logger.category('realtime', 'New message received via realtime');
        onNewMessage(message);
      })
      .subscribe((status) => {
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
        logger.category('realtime', `Realtime connection status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, onSessionStart, onNewMessage, logger]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected'
  };
};
