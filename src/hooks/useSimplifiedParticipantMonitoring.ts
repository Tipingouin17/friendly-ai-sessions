/**
 * use Simplified Participant Monitoring
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import api from "@/lib/api";
import { removeChannel } from '@/utils/realtimeHelpers';

interface UseSimplifiedParticipantMonitoringProps {
  conversationId: number | null;
  onParticipantCountChange?: (count: number) => void;
  onMaxParticipantsChange?: (max: number) => void;
  enabled?: boolean;
}

export function useSimplifiedParticipantMonitoring({
  conversationId,
  onParticipantCountChange,
  onMaxParticipantsChange,
  enabled = true
}: UseSimplifiedParticipantMonitoringProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  // Fallback polling mechanism
  const startFallbackPolling = useCallback(async () => {
    if (!conversationId || !mountedRef.current || fallbackIntervalRef.current) return;

    fallbackIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current || !conversationId) return;

      try {
        const { data, error } = await api
          .from('conversations')
          .select('current_participants, participants')
          .eq('id', conversationId)
          .single();

        if (error) {
          console.error('Fallback polling error:', error);
          return;
        }

        if (data) {
          if (onParticipantCountChange && typeof data.current_participants === 'number') {
            onParticipantCountChange(data.current_participants);
          }
          if (onMaxParticipantsChange && typeof data.participants === 'number') {
            onMaxParticipantsChange(data.participants);
          }
        }
      } catch (error) {
        console.error('Exception during fallback polling:', error);
      }
    }, 3000); // Poll every 3 seconds
  }, [conversationId, onParticipantCountChange, onMaxParticipantsChange]);

  // Setup realtime subscription
  const setupSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current || !enabled) return;

    // Clean up any existing subscription
    cleanup();
    
    setError(null);
    
    const channelName = `participant-monitoring-${conversationId}-${Date.now()}`;
    
    try {
      const channel = api
        .channel(channelName)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;
          
          try {
            if (payload.new) {
              const currentCount = payload.new.current_participants;
              const maxParticipants = payload.new.participants;
              
              if (onParticipantCountChange && typeof currentCount === 'number') {
                onParticipantCountChange(currentCount);
              }
              
              if (onMaxParticipantsChange && typeof maxParticipants === 'number') {
                onMaxParticipantsChange(maxParticipants);
              }
            }
          } catch (error) {
            console.error('Error processing participant update:', error);
          }
        })
        .subscribe((status) => {
          if (!mountedRef.current) return;
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setError(null);
            retryCountRef.current = 0;
            
            // Stop fallback polling if realtime is working
            if (fallbackIntervalRef.current) {
              clearInterval(fallbackIntervalRef.current);
              fallbackIntervalRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Participant monitoring channel error, starting fallback');
            setIsConnected(false);
            setError('Connection error, using fallback updates');
            
            // Start fallback polling
            startFallbackPolling();
            
            // Implement circuit breaker pattern
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
              
              retryTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  setupSubscription();
                }
              }, delay);
            }
          } else if (status === 'CLOSED') {
            setIsConnected(false);
          }
        });
        
      channelRef.current = channel;
    } catch (error) {
      console.error("Error creating participant monitoring channel:", error);
      setError("Failed to establish connection");
      startFallbackPolling();
    }
  }, [conversationId, enabled, onParticipantCountChange, onMaxParticipantsChange, cleanup, startFallbackPolling]);

  // Setup effect
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && conversationId) {
      setupSubscription();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, enabled, setupSubscription, cleanup]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    setupSubscription();
  }, [setupSubscription]);

  return {
    isConnected,
    error,
    reconnect
  };
}
