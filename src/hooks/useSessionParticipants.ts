
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";

export function useSessionParticipants(conversationId: number | null) {
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const { toast } = useToast();
  
  const { 
    data: conversation, 
    error: fetchError, 
    refetch, 
    isLoading 
  } = useConversation(conversationId);

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      console.error("Error fetching conversation:", fetchError);
      setError(fetchError.message || "Session not found or no longer available");
    }
  }, [fetchError]);

  // Set conversation data
  useEffect(() => {
    if (conversation) {
      console.log("Conversation data loaded:", conversation);
      
      // Check if session has ended
      if (conversation.is_session_ended) {
        setError("This session has ended and is no longer available");
        return;
      }
      
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

  // Retry function for reconnection attempts
  const attemptReconnection = useCallback(() => {
    if (connectionAttempts < 3 && conversationId) {
      console.log(`Attempting reconnection (attempt ${connectionAttempts + 1}/3)`);
      setConnectionAttempts(prev => prev + 1);
      refetch();
    } else if (connectionAttempts >= 3) {
      setError("Unable to establish a stable connection after multiple attempts");
    }
  }, [connectionAttempts, conversationId, refetch]);

  // Set up real-time subscription
  useEffect(() => {
    if (conversationId) {
      console.log("Setting up realtime subscription for conversation:", conversationId);
      
      // Initial connection status check
      let connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          console.warn("Real-time connection not established after timeout");
          attemptReconnection();
        }
      }, 8000);
      
      const channel = supabase
        .channel(`conversation-updates-${conversationId}-${connectionAttempts}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received realtime update:", payload);
          setIsConnected(true);
          
          if (payload.new) {
            // Check if session was ended
            if (payload.new.is_session_ended) {
              setError("This session has been ended");
              return;
            }
            
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
            setIsConnected(true);
            clearTimeout(connectionTimeout);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to channel');
            setIsConnected(false);
            attemptReconnection();
          }
        });

      return () => {
        clearTimeout(connectionTimeout);
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, refetch, toast, isConnected, connectionAttempts, attemptReconnection]);

  // Connection recovery mechanism
  useEffect(() => {
    if (!isConnected && conversationId && !isLoading && !error) {
      const recoveryInterval = setInterval(() => {
        console.log("Checking connection status...");
        if (!isConnected) {
          console.log("Connection still not established, attempting recovery");
          attemptReconnection();
        } else {
          clearInterval(recoveryInterval);
        }
      }, 10000);
      
      return () => clearInterval(recoveryInterval);
    }
  }, [isConnected, conversationId, isLoading, error, attemptReconnection]);

  return {
    currentParticipantCount,
    maxParticipantsForSession,
    conversation,
    error,
    refetch,
    isConnected,
    connectionAttempts
  };
}
