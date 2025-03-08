
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";

export function useSessionParticipants(conversationId: number | null) {
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { data: conversation, error: fetchError, refetch } = useConversation(conversationId);

  useEffect(() => {
    if (fetchError) {
      console.error("Error fetching conversation:", fetchError);
      setError(fetchError.message || "Session not found or no longer available");
    }
  }, [fetchError]);

  useEffect(() => {
    // Set conversation-specific data once it's loaded
    if (conversation) {
      console.log("Conversation data loaded:", conversation);
      
      // Set the maximum participants for this specific session
      if (conversation.participants !== null && conversation.participants > 0) {
        setMaxParticipantsForSession(conversation.participants);
      }
      
      // Set the current participants count
      if (conversation.current_participants !== null && conversation.current_participants >= 0) {
        setCurrentParticipantCount(conversation.current_participants);
      }
    }
  }, [conversation]);

  useEffect(() => {
    // Set up real-time subscription to track changes to participants
    if (conversationId) {
      console.log("Setting up realtime subscription for conversation:", conversationId);
      
      const channel = supabase
        .channel(`conversation-updates-${conversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received realtime update:", payload);
          
          if (payload.new) {
            // Update max participants if available
            if (payload.new.participants !== null && payload.new.participants > 0) {
              setMaxParticipantsForSession(payload.new.participants);
            }
            
            // Update current participants count
            if (payload.new.current_participants !== null && payload.new.current_participants >= 0) {
              setCurrentParticipantCount(payload.new.current_participants);
              
              // Force refetch conversation data to ensure we have latest state
              refetch();
            }
          }
        })
        .subscribe((status) => {
          console.log(`Channel status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to realtime updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to channel');
            setError('Unable to establish real-time connection');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, refetch]);

  return {
    currentParticipantCount,
    maxParticipantsForSession,
    conversation,
    error,
    refetch
  };
}
