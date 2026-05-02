/**
 * use Message Delivery Tracker
 *
 * Hook for the AIfacilitator application.
 * Fixed: use refs for mutable state to prevent stale-closure re-subscription loops
 * that caused the polling interval to multiply (500ms effective instead of 2000ms).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from "@/lib/api";

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

  // Use refs for values that should NOT re-trigger the polling useEffect
  const mountedRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownMessageIdRef = useRef<number | null>(null);
  const onMessageReceivedRef = useRef(onMessageReceived);
  const conversationIdRef = useRef(conversationId);
  const enabledRef = useRef(enabled);

  // Keep refs in sync with latest props without triggering re-renders
  useEffect(() => { onMessageReceivedRef.current = onMessageReceived; }, [onMessageReceived]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const maxRetries = 3;
  const pollInterval = 2000; // 2 seconds
  const retryDelay = 5000;   // 5 seconds

  // Stable callback: reads all mutable values from refs, never changes identity
  const checkForNewMessages = useCallback(async () => {
    const cid = conversationIdRef.current;
    if (!cid || !enabledRef.current || !mountedRef.current) return;

    try {
      const { data: messages, error } = await api
        .from('messages')
        .select('id, created_at, role')
        .eq('conversation_id', cid)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!mountedRef.current) return;

      if (error) {
        // Suppress AbortError noise — it is expected when the component unmounts
        if ((error as any)?.message?.includes('aborted')) return;
        console.error('Error checking for new messages:', error);
        return;
      }

      if (messages && messages.length > 0) {
        const latestMessageId = messages[0].id;

        if (lastKnownMessageIdRef.current === null) {
          lastKnownMessageIdRef.current = latestMessageId;
          return;
        }

        if (latestMessageId > lastKnownMessageIdRef.current) {
          const newMessages = messages.filter(msg => msg.id > lastKnownMessageIdRef.current!);

          newMessages.forEach(message => {
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

            if (onMessageReceivedRef.current) {
              onMessageReceivedRef.current(message.id);
            }
          });

          lastKnownMessageIdRef.current = latestMessageId;
        }
      }
    } catch (error: any) {
      if (!mountedRef.current) return;
      // Suppress AbortError — normal during component unmount / re-render
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) return;
      console.error('Exception checking for new messages:', error);
    }
  }, []); // ← empty deps: stable for the lifetime of the component

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
        const updated = { ...current, retryCount: current.retryCount + 1, timestamp: Date.now() };
        const newStatus = new Map(prev);
        newStatus.set(messageId, updated);

        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) checkForNewMessages();
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

  // Single effect: starts/stops polling when conversationId or enabled changes.
  // checkForNewMessages is stable (empty deps) so this effect only fires when
  // conversationId or enabled actually changes — not on every state update.
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && conversationId) {
      // Clear any existing interval before starting a new one
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Initial check
      checkForNewMessages();

      // Stable interval — will NOT be recreated on re-renders
      pollIntervalRef.current = setInterval(() => {
        if (mountedRef.current) checkForNewMessages();
      }, pollInterval);
    }

    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [conversationId, enabled, checkForNewMessages]); // checkForNewMessages is stable

  return {
    deliveryStatus: Array.from(deliveryStatus.values()),
    lastKnownMessageId: lastKnownMessageIdRef.current,
    trackDeliveryFailure,
    getDeliveryStats,
    forceCheck: checkForNewMessages,
    isTracking: !!pollIntervalRef.current
  };
}
