/**
 * use Session Status
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import { removeChannel } from "@/utils/realtimeHelpers";

export function useSessionStatus(conversationId: number | null, refetch: () => void) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Don't auto-redirect on join-session page - let JoinSessionContainer handle it
  const isJoinPage = useRef(window.location.pathname.includes('/join-session'));
  
  // Set up cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Fallback polling to check session status
  const startFallbackPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      if (!conversationId || !mountedRef.current) return;

      try {
        const { data, error } = await api
          .from('conversations')
          .select('is_session_ended, status')
          .eq('id', conversationId)
          .single();

        if (error) {
          console.error('Error polling session status:', error);
          return;
        }

        if (data && (data.is_session_ended || data.status !== 'active')) {
          setSessionEnded(true);
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }

          toast({
            title: "Session Ended",
            description: "This session has been closed.",
          });
          
          // Navigate away immediately (but not on join-session page)
          if (!isJoinPage.current) {
            navigate('/past-workshops', { replace: true });
          }
        }
      } catch (error) {
        console.error('Exception during session status polling:', error);
      }
    }, 5000); // Poll every 5 seconds
  };
  
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;
    
    // Create a unique channel name to prevent stale connections
    const channelName = `session-status-${conversationId}-${Date.now()}`;
    
    const channel = api
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        if (!mountedRef.current) return;
        
        if (payload.new) {
          // Check if session was ended or status changed
          if (payload.new.is_session_ended || payload.new.status !== 'active') {
            setSessionEnded(true);
            
            toast({
              title: "Session Ended",
              description: "This session has been closed.",
            });
            
            // Navigate away immediately (but not on join-session page)
            if (!isJoinPage.current) {
              navigate('/past-workshops', { replace: true });
            }
          }
          // Check if session was started
          if (payload.new.session_started && !payload.old.session_started) {
            toast({
              title: "Session Started",
              description: "The session has been started.",
            });
          }
          refetch();
        }
      })
      .subscribe((status) => {
        
        if (status === 'SUBSCRIBED') { /* no-op */ } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Session status channel error, starting fallback polling');
          startFallbackPolling();
        }
      });

    // Start fallback polling as backup
    startFallbackPolling();

    return () => {
      if (mountedRef.current) { /* no-op */ }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      removeChannel(channel);
    };
  }, [conversationId, navigate, refetch, toast]);

  return { sessionEnded };
}
