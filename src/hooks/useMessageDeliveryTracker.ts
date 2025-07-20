
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MessageDeliveryStatus {
  messageId: number;
  delivered: boolean;
  timestamp: number;
  retryCount: number;
}

interface UseMessageDeliveryTrackerProps {
  conversationId: number | null;
  onMessageReceived?: (messageId: number) => void;
  enabled?: boolean;
}

export function useMessageDeliveryTracker({
  conversationId,
  onMessageReceived,
  enabled = true
}: UseMessageDeliveryTrackerProps) {
  const [deliveryStatus, setDeliveryStatus] = useState<Map<number, MessageDeliveryStatus>>(new Map());
  const [pendingMessages, setPendingMessages] = useState<number[]>([]);
  const [lastKnownMessageId, setLastKnownMessageId] = useState<number | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const maxRetries = 3;
  const pollInterval = 2000; // 2 seconds
  const retryDelay = 5000; // 5 seconds

  // Check for new messages
  const checkForNewMessages = useCallback(async () => {
    if (!conversationId || !enabled || !mountedRef.current) return;

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, created_at, role')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error checking for new messages:', error);
        return;
      }

      if (messages && messages.length > 0) {
        const latestMessageId = messages[0].id;
        
        // Check if we have a new message
        if (lastKnownMessageId === null) {
          setLastKnownMessageId(latestMessageId);
          return;
        }

        if (latestMessageId > lastKnownMessageId) {
          // We have new message(s)
          const newMessages = messages.filter(msg => msg.id > lastKnownMessageId);
          
          console.log(`📬 Detected ${newMessages.length} new message(s) for conversation ${conversationId}`);
          
          newMessages.forEach(message => {
            // Mark as delivered
            setDeliveryStatus(prev => {
              const newStatus = new Map(prev);
              newStatus.set(message.id, {
                messageId: message.id,
                delivered: true,
                timestamp: Date.now(),
                retryCount: 0
              });
              return newStatus;
            });

            // Notify callback
            if (onMessageReceived) {
              onMessageReceived(message.id);
            }
          });

          setLastKnownMessageId(latestMessageId);
        }
      }
    } catch (error) {
      console.error('Exception checking for new messages:', error);
    }
  }, [conversationId, enabled, lastKnownMessageId, onMessageReceived]);

  // Start message polling
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    console.log(`🔄 Starting message delivery tracking for conversation ${conversationId}`);
    
    // Initial check
    checkForNewMessages();
    
    // Set up polling interval
    pollIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        checkForNewMessages();
      }
    }, pollInterval);
  }, [conversationId, checkForNewMessages]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Track message delivery failure and retry
  const trackDeliveryFailure = useCallback((messageId: number) => {
    setDeliveryStatus(prev => {
      const current = prev.get(messageId) || {
        messageId,
        delivered: false,
        timestamp: Date.now(),
        retryCount: 0
      };

      if (current.retryCount < maxRetries) {
        const updated = {
          ...current,
          retryCount: current.retryCount + 1,
          timestamp: Date.now()
        };

        const newStatus = new Map(prev);
        newStatus.set(messageId, updated);

        // Schedule retry
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            checkForNewMessages();
          }
        }, retryDelay);

        return newStatus;
      }

      return prev;
    });
  }, [checkForNewMessages]);

  // Get delivery statistics
  const getDeliveryStats = useCallback(() => {
    const statusArray = Array.from(deliveryStatus.values());
    
    return {
      totalMessages: statusArray.length,
      deliveredMessages: statusArray.filter(s => s.delivered).length,
      failedMessages: statusArray.filter(s => !s.delivered && s.retryCount >= maxRetries).length,
      pendingMessages: statusArray.filter(s => !s.delivered && s.retryCount < maxRetries).length,
      averageDeliveryTime: statusArray.length > 0 
        ? statusArray.reduce((sum, s) => sum + (Date.now() - s.timestamp), 0) / statusArray.length 
        : 0
    };
  }, [deliveryStatus]);

  // Setup and cleanup effects
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && conversationId) {
      startPolling();
    }
    
    return () => {
      mountedRef.current = false;
      stopPolling();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [conversationId, enabled, startPolling, stopPolling]);

  return {
    deliveryStatus: Array.from(deliveryStatus.values()),
    pendingMessages,
    lastKnownMessageId,
    trackDeliveryFailure,
    getDeliveryStats,
    forceCheck: checkForNewMessages,
    isTracking: !!pollIntervalRef.current
  };
}
