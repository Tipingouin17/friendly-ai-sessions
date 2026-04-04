/**
 * use Session End Listener
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useSessionEndListener(conversationId: number | null, isAdmin: boolean = false) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mountedRef = useRef(true);
  
  // Set up cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    // Only listen for session end events if we're not an admin
    if (!conversationId || !mountedRef.current || isAdmin) return;
    
    // Create a unique channel name to prevent stale connections
    const channelName = `session-end-${conversationId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (!mountedRef.current) return;
        
        if (payload.new && payload.new.event_type === 'session_ended') {
          // Show a toast but keep the participant on the page so they can
          // read the full chat transcript. The ParticipantMessagingView will
          // render an ended banner with a "Return Home" button.
          toast({
            title: "Session Ended",
            description: "This session has been closed by the facilitator. Thank you for participating!",
            duration: 5000,
          });
          // No automatic redirect — participant chooses when to leave.
        }
      })
      .subscribe((status) => { /* no-op */ });

    return () => {
      if (mountedRef.current) { /* no-op */ }
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.error("Error removing session end channel:", err);
      }
    };
  }, [conversationId, navigate, toast, isAdmin]);
}
