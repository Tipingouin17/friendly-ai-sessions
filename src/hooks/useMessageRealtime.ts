
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
  const processedMessageIds = useRef(new Set<string>());

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
          // Check if we've already processed this message to prevent duplicates
          const messageId = payload.new.id;
          if (processedMessageIds.current.has(messageId)) {
            debugLog('all', `Message ${messageId} already processed, skipping`);
            return;
          }
          
          processedMessageIds.current.add(messageId);
          
          // Trigger callback for new message to refresh the full message list
          // This ensures we get properly formatted messages with all necessary data
          if (onNewMessage) {
            onNewMessage();
          }
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
          // Clear processed messages set when we successfully reconnect
          processedMessageIds.current.clear();
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
      // Clear processed messages when component unmounts
      processedMessageIds.current.clear();
    };
  }, [currentConversationId, viewMode]);

  return { reconnect: setupRealtimeSubscription };
};
