
import { useEffect, useRef, useState } from "react";
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
  
  // Set up real-time subscription for message updates
  useEffect(() => {
    if (!conversationId) {
      console.log("No conversation ID provided, skipping messages channel setup");
      return;
    }
    
    // Clean up existing channel if it exists
    if (channelRef.current) {
      console.log("Cleaning up existing messages channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    console.log("Setting up realtime channel for messages:", conversationId);
    
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
          console.log("Messages table change detected:", payload);
          
          // Force a refetch to update UI with new messages
          refetch();
        })
        .subscribe((status) => {
          console.log(`Messages channel subscription status: ${status}`);
        });
        
      channelRef.current = messagesChannel;
      
      return () => {
        if (channelRef.current) {
          console.log("Cleaning up messages channel");
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch (channelError) {
      console.error("Error creating messages channel:", channelError);
      setError("Failed to establish connection to session messages");
      return;
    }
  }, [conversationId, refetch]);

  return { error };
}
