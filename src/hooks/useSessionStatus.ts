
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

export function useSessionStatus(conversationId: number | null, refetch: () => void) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!conversationId) return;
    
    console.log("Setting up session status listener for conversation:", conversationId);
    
    const channel = supabase
      .channel(`session-status-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        console.log("Session status update:", payload);
        if (payload.new) {
          // Check if session was ended or status changed
          if (payload.new.is_session_ended || payload.new.status !== 'active') {
            toast({
              title: "Session Ended",
              description: "This session has been closed.",
            });
            navigate('/');
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
      .subscribe();

    return () => {
      removeChannel(channel);
    };
  }, [conversationId, navigate, refetch, toast]);
}
