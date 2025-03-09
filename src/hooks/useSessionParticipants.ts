
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";

export function useSessionParticipants(conversationId: number | null) {
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const channelRef = useRef<any>(null);
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
      console.log("Conversation data loaded successfully");
      
      // Check if session has ended
      if (conversation.is_session_ended) {
        setError("This session has ended and is no longer available");
        return;
      }
      
      // Reset any previous connection errors since we have data
      if (error && isConnected) {
        setError(null);
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
  }, [conversation, error, isConnected]);

  // Retry function for reconnection attempts
  const attemptReconnection = useCallback(() => {
    if (connectionAttempts < 3 && conversationId) {
      console.log(`Attempting reconnection (attempt ${connectionAttempts + 1}/3) for ID:`, conversationId);
      setConnectionAttempts(prev => prev + 1);
      refetch();
    } else if (connectionAttempts >= 3) {
      setError("Unable to establish a stable connection after multiple attempts");
    }
  }, [connectionAttempts, conversationId, refetch]);

  // Set up real-time subscription
  useEffect(() => {
    // Clean up existing subscription
    const cleanupChannel = () => {
      if (channelRef.current) {
        console.log("Cleaning up existing channel subscription");
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    
    cleanupChannel();
    
    if (!conversationId) {
      console.log("No conversation ID provided, skipping realtime subscription");
      return cleanupChannel;
    }
    
    console.log("Setting up realtime subscription for conversation:", conversationId);
    
    // Create a unique channel name with the conversation ID
    const channelName = `public-conversation-${conversationId}`;
    console.log(`Creating public channel: ${channelName}`);
    
    try {
      // For public access, we need to use the general schema-db-changes approach
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received realtime update for conversation:", payload);
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
          console.log(`Channel ${channelName} status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to realtime updates');
            setIsConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to channel:', channelName);
            setIsConnected(false);
            attemptReconnection();
          }
        });

      channelRef.current = channel;

      return cleanupChannel;
    } catch (err) {
      console.error("Error setting up realtime subscription:", err);
      setError("Failed to establish connection to session");
      return cleanupChannel;
    }
  }, [conversationId, refetch, attemptReconnection]);

  // Connection recovery mechanism
  useEffect(() => {
    let recoveryTimeout: number | null = null;
    
    if (!isConnected && conversationId && !isLoading && !error) {
      recoveryTimeout = window.setTimeout(() => {
        console.log("Connection not established, attempting recovery");
        attemptReconnection();
      }, 5000);
    }
    
    return () => {
      if (recoveryTimeout !== null) {
        clearTimeout(recoveryTimeout);
      }
    };
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
