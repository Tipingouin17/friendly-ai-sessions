
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
  const logger = createLogger('SessionRealtime', 'connection');

  useEffect(() => {
    if (!conversationId) return;

    const channelName = `session-realtime-${conversationId}-${Date.now()}`;
    
    logger.category('connection', `Setting up real-time subscriptions for conversation ${conversationId}`);
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        logger.category('connection', 'Conversation update received:', payload);
        if (payload.new.session_started && !payload.old.session_started) {
          logger.category('connection', 'Session started event detected');
          onSessionStart();
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        logger.category('connection', 'New message received via realtime:', payload);
        
        // Enhanced message content extraction with fallback
        let messageContent = '';
        let avatarUrl = undefined;
        
        if (typeof payload.new.content === 'string') {
          messageContent = payload.new.content;
        } else if (payload.new.content && typeof payload.new.content === 'object') {
          if (payload.new.content.text) {
            messageContent = payload.new.content.text;
          } else {
            messageContent = JSON.stringify(payload.new.content);
          }
          
          if (payload.new.content.avatar) {
            avatarUrl = payload.new.content.avatar;
          }
        }

        // Don't process empty messages
        if (!messageContent || messageContent.trim() === '') {
          logger.category('connection', 'Skipping empty message');
          return;
        }

        const message: Message = {
          id: payload.new.id.toString(),
          content: messageContent,
          sender: payload.new.role === 'assistant' ? 'assistant' : payload.new.role === 'admin' ? 'admin' : 'user',
          timestamp: new Date(payload.new.created_at),
          avatar: avatarUrl,
          participant: payload.new.participant_id ? `P${payload.new.participant_id}` : undefined
        };
        
        logger.category('connection', `Processing new message: ${messageContent.substring(0, 50)}...`);
        onNewMessage(message);
      })
      .subscribe((status) => {
        const connectionState = status === 'SUBSCRIBED' ? 'connected' : 'connecting';
        setConnectionStatus(connectionState);
        logger.category('connection', `Real-time connection status: ${status} -> ${connectionState}`);
        
        // Immediately try to fetch any existing messages when connected
        if (status === 'SUBSCRIBED') {
          logger.category('connection', 'Real-time connected - ready to receive updates');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        logger.category('connection', 'Cleaning up real-time subscriptions');
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
