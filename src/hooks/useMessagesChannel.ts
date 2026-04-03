/**
 * use Messages Channel
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type UseMessagesChannelProps = {
  conversationId: number | null;
  refetch: () => void;
};

export function useMessagesChannel({
  conversationId,
  refetch
}: UseMessagesChannelProps) {
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeActiveRef = useRef(false);
  
  // Polling fallback when realtime is not available
  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // Already polling
    
    pollingRef.current = setInterval(() => {
      refetch();
    }, 3000); // Poll every 3 seconds
  }, [refetch]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Set up real-time subscription for message updates with polling fallback
  useEffect(() => {
    if (!conversationId) {
      return;
    }
    
    // Clean up existing channel if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    realtimeActiveRef.current = false;
    
    try {
      // Channel to track messages for admin view
      const messagesChannel = supabase
        .channel(`messages-${conversationId}`)
        .on('postgres_changes', {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          // Force a refetch to update UI with new messages
          refetch();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            realtimeActiveRef.current = true;
            stopPolling(); // Stop polling if realtime connects
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            realtimeActiveRef.current = false;
            startPolling(); // Fall back to polling
          }
        });
        
      channelRef.current = messagesChannel;

      // Start polling immediately as a safety net — if realtime connects, it will be stopped
      // Give realtime 2 seconds to connect before starting polling
      const pollingTimeout = setTimeout(() => {
        if (!realtimeActiveRef.current) {
          startPolling();
        }
      }, 2000);
      
      return () => {
        clearTimeout(pollingTimeout);
        stopPolling();
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch (channelError) {
      console.error("Error creating messages channel:", channelError);
      setError("Failed to establish real-time connection. Using polling fallback.");
      startPolling(); // Fall back to polling on error
      return () => {
        stopPolling();
      };
    }
  }, [conversationId, refetch, startPolling, stopPolling]);

  return { error };
}
