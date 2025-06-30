
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

export function useSessionStatus(conversationId: number | null, refetch: () => void) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
        const { data, error } = await supabase
          .from('conversations')
          .select('is_session_ended, status')
          .eq('id', conversationId)
          .single();

        if (error) {
          console.error('Error polling session status:', error);
          return;
        }

        if (data && (data.is_session_ended || data.status !== 'active')) {
          console.log('Session ended detected via polling');
          setSessionEnded(true);
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }

          toast({
            title: "Session Ended",
            description: "This session has been closed.",
          });
          
          // Navigate away immediately
          navigate('/past-workshops', { replace: true });
        }
      } catch (error) {
        console.error('Exception during session status polling:', error);
      }
    }, 5000); // Poll every 5 seconds
  };
  
  useEffect(() => {
    if (!conversationId || !mountedRef.current) return;
    
    console.log("Setting up enhanced session status listener for conversation:", conversationId);
    
    // Create a unique channel name to prevent stale connections
    const channelName = `session-status-${conversationId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        if (!mountedRef.current) return;
        
        console.log("Session status update:", payload);
        if (payload.new) {
          // Check if session was ended or status changed
          if (payload.new.is_session_ended || payload.new.status !== 'active') {
            console.log('Session ended detected via realtime');
            setSessionEnded(true);
            
            toast({
              title: "Session Ended",
              description: "This session has been closed.",
            });
            
            // Navigate away immediately
            navigate('/past-workshops', { replace: true });
          }
          // Check if session was started
          if (payload.new.session_started && !payload.old.session_started) {
            console.log("Session was started remotely");
            toast({
              title: "Session Started",
              description: "The session has been started.",
            });
          }
          refetch();
        }
      })
      .subscribe((status) => {
        console.log(`Session status channel ${channelName} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to session status updates');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Session status channel error, starting fallback polling');
          startFallbackPolling();
        }
      });

    // Start fallback polling as backup
    startFallbackPolling();

    return () => {
      if (mountedRef.current) {
        console.log("Cleaning up session status listener");
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      removeChannel(channel);
    };
  }, [conversationId, navigate, refetch, toast]);

  return { sessionEnded };
}
