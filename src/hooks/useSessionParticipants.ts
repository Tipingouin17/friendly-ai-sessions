
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";

export function useSessionParticipants(conversationId: number | null) {
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  
  const { data: conversation, error: fetchError, refetch, isLoading } = useConversation(conversationId);

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

  // Set up real-time subscription
  useEffect(() => {
    if (conversationId) {
      console.log("Setting up realtime subscription for conversation:", conversationId);
      
      // Initial connection status check
      let connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          console.warn("Real-time connection not established after timeout");
          toast({
            title: "Connection issue",
            description: "Having trouble connecting to the session. Please check your internet connection.",
            variant: "destructive"
          });
        }
      }, 8000);
      
      const channel = supabase
        .channel(`conversation-updates-${conversationId}`)
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
            setError('Unable to establish real-time connection');
            setIsConnected(false);
          }
        });

      return () => {
        clearTimeout(connectionTimeout);
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, refetch, toast]);

  // Add a connection retry mechanism
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    // Only retry if we're still loading and don't have an error yet
    if (!isConnected && isLoading && !error && conversationId && retryCount < maxRetries) {
      const retryInterval = setInterval(() => {
        console.log(`Retrying fetch attempt ${retryCount + 1} of ${maxRetries}`);
        refetch();
        retryCount++;
        
        if (retryCount >= maxRetries) {
          clearInterval(retryInterval);
          if (!conversation && !error) {
            setError("Unable to load session after multiple attempts. Please check the session link.");
          }
        }
      }, 3000);
      
      return () => clearInterval(retryInterval);
    }
  }, [isConnected, isLoading, error, conversation, conversationId, refetch]);

  return {
    currentParticipantCount,
    maxParticipantsForSession,
    conversation,
    error,
    refetch,
    isConnected
  };
}
