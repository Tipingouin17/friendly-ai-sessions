/**
 * use Optimized Session State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseOptimizedSessionStateProps {
  conversationId: number | null;
  initialSessionStarted?: boolean;
  onSessionStarted?: () => void;
}

// Polling interval for session state when realtime is unavailable
const SESSION_POLL_INTERVAL = 3000; // 3 seconds

export const useOptimizedSessionState = ({
  conversationId,
  initialSessionStarted = false,
  onSessionStarted
}: UseOptimizedSessionStateProps) => {
  const [isSessionStarted, setIsSessionStarted] = useState(initialSessionStarted);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const channelRef = useRef<any>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const stableConnectionRef = useRef(false);
  const realtimeActiveRef = useRef(false);
  
  const maxReconnectAttempts = 3;
  const baseReconnectDelay = 3000;
  const connectionStabilityWindow = 8000;

  // Memoized callback to prevent unnecessary re-renders
  const handleSessionStarted = useCallback(() => {
    if (!mountedRef.current) return;
    
    setIsSessionStarted(true);
    setIsTransitioning(false);
    onSessionStarted?.();
  }, [onSessionStarted]);

  // Polling fallback: check conversation state periodically
  const startPolling = useCallback(() => {
    if (pollingRef.current || !conversationId) return;

    pollingRef.current = setInterval(async () => {
      if (!mountedRef.current || !conversationId) return;

      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('session_started, is_session_ended, welcome_message_status')
          .eq('id', conversationId)
          .single();

        if (error || !data) return;

        if (data.session_started && !isSessionStarted) {
          handleSessionStarted();
        }
      } catch {
        // Silently ignore polling errors
      }
    }, SESSION_POLL_INTERVAL);
  }, [conversationId, isSessionStarted, handleSessionStarted]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.error("Error removing channel:", error);
      }
      channelRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    stopPolling();
    stableConnectionRef.current = false;
    realtimeActiveRef.current = false;
  }, [stopPolling]);

  // Enhanced connection setup with stability monitoring and polling fallback
  const setupOptimizedSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current) return;

    // Clean up existing channels but keep polling
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch {
        // Ignore cleanup errors
      }
      channelRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionAttempts(prev => prev + 1);

    const channelName = `stable-session-state-${conversationId}-${Date.now()}`;
    
    try {
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;
          
          if (payload.new?.session_started === true && payload.old?.session_started !== true) {
            setIsTransitioning(true);
            
            if (transitionTimeoutRef.current) {
              clearTimeout(transitionTimeoutRef.current);
            }
            
            transitionTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                handleSessionStarted();
              }
            }, 200);
          }
        })
        .subscribe((status) => {
          if (!mountedRef.current) return;
          
          if (status === 'SUBSCRIBED') {
            setConnectionAttempts(0);
            stableConnectionRef.current = true;
            realtimeActiveRef.current = true;
            stopPolling(); // Realtime is working, stop polling
            
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            stableConnectionRef.current = false;
            realtimeActiveRef.current = false;
            startPolling(); // Fall back to polling
            
            if (connectionAttempts < maxReconnectAttempts && mountedRef.current) {
              const delay = Math.min(baseReconnectDelay * Math.pow(2, connectionAttempts), 15000);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  setupOptimizedSubscription();
                }
              }, delay);
            }
            
          } else if (status === 'CLOSED') {
            stableConnectionRef.current = false;
            realtimeActiveRef.current = false;
            startPolling(); // Fall back to polling
          }
        });

      channelRef.current = channel;

      // Start polling as safety net — give realtime 2 seconds to connect
      setTimeout(() => {
        if (mountedRef.current && !realtimeActiveRef.current) {
          startPolling();
        }
      }, 2000);

    } catch (error) {
      console.error("Error creating session state subscription:", error);
      stableConnectionRef.current = false;
      realtimeActiveRef.current = false;
      startPolling(); // Fall back to polling on error
    }
  }, [conversationId, handleSessionStarted, connectionAttempts, startPolling, stopPolling]);

  // Setup effect with enhanced lifecycle management
  useEffect(() => {
    mountedRef.current = true;
    
    if (conversationId) {
      setupOptimizedSubscription();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, setupOptimizedSubscription, cleanup]);

  // Initialize session state from props
  useEffect(() => {
    if (initialSessionStarted !== isSessionStarted) {
      setIsSessionStarted(initialSessionStarted);
    }
  }, [initialSessionStarted, isSessionStarted]);

  // Manual reconnection function
  const forceReconnect = useCallback(() => {
    setConnectionAttempts(0);
    setupOptimizedSubscription();
  }, [setupOptimizedSubscription]);

  return {
    isSessionStarted,
    isTransitioning,
    setIsSessionStarted,
    connectionStatus: {
      isStable: stableConnectionRef.current || pollingRef.current !== null,
      attempts: connectionAttempts,
      hasChannel: !!channelRef.current
    },
    forceReconnect
  };
};
