/**
 * use Enhanced Session Messages
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { useStableRealtimeConnection } from './useStableRealtimeConnection';
import { useMessageDeliveryTracker } from './useMessageDeliveryTracker';
import api from "@/lib/api";

interface UseEnhancedSessionMessagesProps {
  conversationId: number | null;
  currentUserParticipantId: number | null;
  isAdmin: boolean;
  welcomeMessage?: string | null;
  conversation?: any;
  totalParticipants?: number;
}

export const useEnhancedSessionMessages = ({
  conversationId,
  currentUserParticipantId,
  isAdmin,
  welcomeMessage,
  conversation,
  totalParticipants = 1
}: UseEnhancedSessionMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Enhanced message fetching
  const fetchMessages = useCallback(async (forceRefresh = false) => {
    if (!conversationId) return;

    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime < 1000) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: messagesData, error: messagesError } = await api
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        setError('Failed to load messages');
        return;
      }

      const formattedMessages: Message[] = (messagesData || []).map(msg => ({
        id: msg.id.toString(),
        content: typeof msg.content === 'string' ? msg.content : (msg.content && typeof msg.content === 'object' && 'text' in msg.content ? String(msg.content.text) : ''),
        sender: msg.role === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date(msg.created_at),
        participant: msg.participant_id != null ? String(msg.participant_id) : undefined,
        name: msg.name || undefined,
        avatar: typeof msg.content === 'object' && msg.content && !Array.isArray(msg.content) && 'avatar' in msg.content ? String(msg.content.avatar) : undefined,
        role: msg.role || 'user'
      }));

      // Deduplicate by ID before updating state (prevents duplicate rows from multiple triggers)
      const seen = new Set<string>();
      const deduped = formattedMessages.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      setMessages(prev => {
        // Only update if messages have actually changed
        if (prev.length !== deduped.length || 
            prev.some((msg, i) => msg.id !== deduped[i]?.id)) {
          return deduped;
        }
        return prev;
      });
      
      setLastFetchTime(now);
    } catch (err) {
      console.error('Exception fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, lastFetchTime]);

  // Stable realtime connection
  const { isConnected, hasStableConnection, forceReconnect } = useStableRealtimeConnection({
    conversationId,
    onMessageUpdate: () => {
      fetchMessages(true);
    },
    onParticipantUpdate: () => { /* no-op */ },
    onSessionUpdate: () => {
      fetchMessages(true);
    },
    enabled: !!conversationId
  });

  // Message delivery tracking
  const { 
    deliveryStatus, 
    getDeliveryStats, 
    forceCheck: forceDeliveryCheck,
    isTracking 
  } = useMessageDeliveryTracker({
    conversationId,
    onMessageReceived: (messageId) => {
      fetchMessages(true);
    },
    enabled: !!conversationId && !hasStableConnection // Only use when realtime is unreliable
  });

  // Initial fetch and conversation change effect
  useEffect(() => {
    if (conversationId && (conversation || !messages.length)) {
      fetchMessages(true);
    }
  }, [conversationId, conversation, fetchMessages, messages.length]);

  // NOTE: Removed redundant delayed participant fetch (was causing duplicate renders).
  // The initial fetch + realtime subscription already covers this case.

  // Connection recovery mechanism
  useEffect(() => {
    if (!hasStableConnection && conversationId) {
      const fallbackInterval = setInterval(() => {
        fetchMessages(true);
      }, 5000); // Poll every 5 seconds when connection is unstable
      
      return () => clearInterval(fallbackInterval);
    }
  }, [hasStableConnection, conversationId, fetchMessages]);

  // Enhanced message handler
  const handleNewMessage = useCallback((message: Message) => {
    
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        return prev;
      }
      
      const updated = [...prev, message];
      return updated;
    });
  }, []);

  // Connection status and diagnostics
  const connectionStatus = {
    isConnected,
    hasStableConnection,
    isTracking,
    deliveryStats: getDeliveryStats(),
    lastFetchTime,
    messageCount: messages.length
  };

  return {
    messages,
    setMessages,
    error,
    isLoading,
    handleNewMessage,
    forceFetchMessages: () => fetchMessages(true),
    connectionStatus,
    forceReconnect,
    forceDeliveryCheck
  };
};
