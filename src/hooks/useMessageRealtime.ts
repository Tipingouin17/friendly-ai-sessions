
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { debugLog } from '@/utils/debugLogger';

interface UseMessageRealtimeProps {
  currentConversationId: number | null;
  viewMode: "participant" | "admin";
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onNewMessage?: () => void;
}

export const useMessageRealtime = ({
  currentConversationId,
  viewMode,
  setMessages,
  onNewMessage
}: UseMessageRealtimeProps) => {
  const channelRef = useRef<any>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const setupRealtimeSubscription = () => {
    if (!currentConversationId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    debugLog('all', `Setting up realtime subscription for messages (${viewMode})`);

    const channel = supabase
      .channel(`messages-${currentConversationId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${currentConversationId}`
      }, (payload) => {
        debugLog('all', 'New message received via realtime:', payload);
        
        if (payload.new) {
          // Trigger callback for new message
          if (onNewMessage) {
            onNewMessage();
          }
          
          // Note: We don't add the message directly here because it needs formatting
          // The callback should trigger a fetchMessages() call instead
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${currentConversationId}`
      }, (payload) => {
        debugLog('all', 'Message updated via realtime:', payload);
        
        if (onNewMessage) {
          onNewMessage();
        }
      })
      .subscribe((status, err) => {
        debugLog('all', `Messages realtime subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          reconnectAttempts.current = 0;
        } else if (status === 'CHANNEL_ERROR' && reconnectAttempts.current < maxReconnectAttempts) {
          console.error('Realtime subscription error:', err);
          reconnectAttempts.current++;
          
          // Retry after delay
          setTimeout(() => {
            debugLog('all', `Retrying realtime subscription (attempt ${reconnectAttempts.current})`);
            setupRealtimeSubscription();
          }, 2000 * reconnectAttempts.current);
        }
      });

    channelRef.current = channel;
  };

  useEffect(() => {
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentConversationId, viewMode]);

  return { reconnect: setupRealtimeSubscription };
};
