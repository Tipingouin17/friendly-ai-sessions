/**
 * use Enhanced Session Messages
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const lastFetchTimeRef = useRef<number>(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0); // kept for connectionStatus only

  // Enhanced message fetching
  const fetchMessages = useCallback(async (forceRefresh = false) => {
    if (!conversationId) return;

    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 1000) {
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

      const formattedMessages: Message[] = (messagesData || []).map(msg => {
        // Normalise content: may arrive as JSONB object, JSON string, or plain string
        let parsedContent: Record<string, unknown> | null = null;
        if (typeof msg.content === 'object' && msg.content && !Array.isArray(msg.content)) {
          parsedContent = msg.content as Record<string, unknown>;
        } else if (typeof msg.content === 'string') {
          try {
            const p = JSON.parse(msg.content);
            if (p && typeof p === 'object' && !Array.isArray(p)) parsedContent = p as Record<string, unknown>;
          } catch { /* plain text string — leave parsedContent null */ }
        }
        return {
          id: msg.id.toString(),
          content: parsedContent && 'text' in parsedContent ? String(parsedContent.text) : (typeof msg.content === 'string' ? msg.content : ''),
          sender: msg.role === 'assistant' ? 'assistant' : 'user',
          timestamp: new Date(msg.created_at),
          participant: msg.participant_id != null ? String(msg.participant_id) : undefined,
          name: msg.name || undefined,
          avatar: parsedContent && 'avatar' in parsedContent ? String(parsedContent.avatar) : undefined,
          role: msg.role || 'user'
        };
      });

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
      
      lastFetchTimeRef.current = now;
      setLastFetchTime(now);
    } catch (err) {
      console.error('Exception fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // lastFetchTime intentionally excluded — use ref to avoid stale closure recreation

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

  // Connection recovery mechanism — poll every 5s when unstable, every 8s as a safety net
  // even when the realtime connection is stable (guards against missed broadcasts).
  useEffect(() => {
    if (!conversationId) return;
    const interval = hasStableConnection ? 8000 : 5000;
    const fallbackInterval = setInterval(() => {
      fetchMessages(false); // throttled poll — won't fire if a force-refresh just ran
    }, interval);
    return () => clearInterval(fallbackInterval);
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
