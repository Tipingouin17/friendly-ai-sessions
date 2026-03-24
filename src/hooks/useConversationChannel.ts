
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConversationWithSession } from "@/types/database";

type UseConversationChannelProps = {
  conversationId: number | null;
  onSessionStarted?: () => void;
  onSessionFull?: () => void;
  refetch: () => void;
  conversation: ConversationWithSession | null;
};

export function useConversationChannel({
  conversationId,
  onSessionStarted,
  onSessionFull,
  refetch,
  conversation
}: UseConversationChannelProps) {
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const sessionStartedCalledRef = useRef(false);
  const sessionFullCalledRef = useRef(false);
  
  // Set up real-time subscription for conversation updates
  useEffect(() => {
    if (!conversationId) {
      return;
    }
    
    // Check if the session is already full when component mounts
    if (conversation && 
        conversation.current_participants >= (conversation.participants || 0) && 
        (conversation.participants || 0) > 0 && 
        !sessionFullCalledRef.current) {
      sessionFullCalledRef.current = true;
      if (onSessionFull) {
        onSessionFull();
      }
    }

    // Clean up existing channel if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    try {
      // Use stable channel name
      const conversationChannel = supabase
        .channel(`conversation-${conversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          
          if (payload.new) {
            // Check for session_started flag
            if (payload.new.session_started && !sessionStartedCalledRef.current) {
              sessionStartedCalledRef.current = true;
              if (onSessionStarted && typeof onSessionStarted === 'function') {
                onSessionStarted();
              }
            }
            
            if (payload.new.current_participants !== undefined) {
              const currentCount = payload.new.current_participants;
              
              // Check if all participants have joined and trigger redirect
              if (currentCount >= (payload.new.participants || 0) && 
                  (payload.new.participants || 0) > 0 && 
                  !sessionFullCalledRef.current) {
                sessionFullCalledRef.current = true;
                if (onSessionFull && typeof onSessionFull === 'function') {
                  onSessionFull();
                }
              }
            }
            
            // Only refetch if needed to reduce unnecessary API calls
            refetch();
          }
        })
        .subscribe((status) => { /* no-op */ });
      
      channelRef.current = conversationChannel;
      
      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch (channelError) {
      console.error("Error creating conversation channel:", channelError);
      setError("Failed to establish connection to session (channel creation error)");
      return;
    }
  }, [conversationId, refetch, onSessionFull, onSessionStarted, conversation]);

  // Secondary effect to check conversation state from props
  useEffect(() => {
    if (conversation && conversationId) {
      // Check for session status
      if (conversation.session_started && !sessionStartedCalledRef.current) {
        sessionStartedCalledRef.current = true;
        if (onSessionStarted && typeof onSessionStarted === 'function') {
          onSessionStarted();
        }
      }
      
      // Check if session is full
      if (conversation.current_participants >= (conversation.participants || 0) && 
          (conversation.participants || 0) > 0 && 
          !sessionFullCalledRef.current) {
        sessionFullCalledRef.current = true;
        if (onSessionFull && typeof onSessionFull === 'function') {
          onSessionFull();
        }
      }
    }
  }, [conversation, conversationId, onSessionStarted, onSessionFull]);

  return { error };
}
