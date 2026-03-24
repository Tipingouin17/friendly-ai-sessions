
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseOptimizedSessionStateProps {
  conversationId: number | null;
  initialSessionStarted?: boolean;
  onSessionStarted?: () => void;
}

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
  const mountedRef = useRef(true);
  const stableConnectionRef = useRef(false);
  
  const maxReconnectAttempts = 3;
  const baseReconnectDelay = 3000; // 3 seconds
  const connectionStabilityWindow = 8000; // 8 seconds

  // Memoized callback to prevent unnecessary re-renders
  const handleSessionStarted = useCallback(() => {
    if (!mountedRef.current) return;
    
    setIsSessionStarted(true);
    setIsTransitioning(false);
    onSessionStarted?.();
  }, [onSessionStarted]);

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
    stableConnectionRef.current = false;
  }, []);

  // Enhanced connection setup with stability monitoring
  const setupOptimizedSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current) return;

    cleanup();
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
          
          // Handle session start detection with enhanced reliability
          if (payload.new?.session_started === true && payload.old?.session_started !== true) {
            setIsTransitioning(true);
            
            // Clear any existing timeout
            if (transitionTimeoutRef.current) {
              clearTimeout(transitionTimeoutRef.current);
            }
            
            // Add a small delay to ensure UI updates smoothly
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
            
            // Monitor connection stability
            setTimeout(() => {
              if (mountedRef.current && stableConnectionRef.current) { /* no-op */ }
            }, connectionStabilityWindow);
            
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`🚨 [useOptimizedSessionState] Connection error: ${status}`);
            stableConnectionRef.current = false;
            
            // Implement exponential backoff for reconnection
            if (connectionAttempts < maxReconnectAttempts && mountedRef.current) {
              const delay = Math.min(baseReconnectDelay * Math.pow(2, connectionAttempts), 15000);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  setupOptimizedSubscription();
                }
              }, delay);
            } else {
              console.error(`❌ [useOptimizedSessionState] Max reconnection attempts reached`);
            }
            
          } else if (status === 'CLOSED') {
            stableConnectionRef.current = false;
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error("❌ [useOptimizedSessionState] Error creating stable subscription:", error);
      stableConnectionRef.current = false;
    }
  }, [conversationId, handleSessionStarted, cleanup, connectionAttempts]);

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

  // Initialize session state from props with stability check
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
      isStable: stableConnectionRef.current,
      attempts: connectionAttempts,
      hasChannel: !!channelRef.current
    },
    forceReconnect
  };
};
