
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
  const channelRef = useRef<any>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memoized callback to prevent unnecessary re-renders
  const handleSessionStarted = useCallback(() => {
    console.log("🎯 [useOptimizedSessionState] Session started callback triggered");
    setIsSessionStarted(true);
    setIsTransitioning(false);
    onSessionStarted?.();
  }, [onSessionStarted]);

  // Set up optimized real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    console.log("🔗 [useOptimizedSessionState] Setting up optimized real-time subscription");

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`optimized-session-state-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        console.log("📡 [useOptimizedSessionState] Real-time update:", {
          sessionStartedOld: payload.old?.session_started,
          sessionStartedNew: payload.new?.session_started,
          currentParticipantsOld: payload.old?.current_participants,
          currentParticipantsNew: payload.new?.current_participants
        });

        // Handle session start detection
        if (payload.new?.session_started === true && payload.old?.session_started !== true) {
          console.log("🚀 [useOptimizedSessionState] Session start detected via real-time!");
          setIsTransitioning(true);
          
          // Clear any existing timeout
          if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
          }
          
          // Add a small delay to ensure UI updates smoothly
          transitionTimeoutRef.current = setTimeout(() => {
            handleSessionStarted();
          }, 100);
        }
      })
      .subscribe((status) => {
        console.log(`🔗 [useOptimizedSessionState] Channel status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      console.log("🧹 [useOptimizedSessionState] Cleaning up optimized subscription");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [conversationId, handleSessionStarted]);

  // Initialize session state from props
  useEffect(() => {
    setIsSessionStarted(initialSessionStarted);
  }, [initialSessionStarted]);

  return {
    isSessionStarted,
    isTransitioning,
    setIsSessionStarted
  };
};
