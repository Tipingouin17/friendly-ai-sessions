
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

interface UseParticipantChannelProps {
  conversationId: number | null;
  setIsConnected: (state: boolean) => void;
  attemptReconnection: () => void;
  setCurrentParticipantCount: (count: number) => void;
  setMaxParticipantsForSession: (max: number) => void;
  refetch: () => void;
}

export function useParticipantChannel(props: UseParticipantChannelProps) {
  const { 
    conversationId,
    setIsConnected,
    attemptReconnection,
    setCurrentParticipantCount,
    setMaxParticipantsForSession,
    refetch
  } = props;
  
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const subscribedRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  
  // Setup cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);
  
  // Handle reconnection logic
  const setupReconnectionTimer = useCallback(() => {
    if (!mountedRef.current || subscribedRef.current) return;
    
    // Clear any existing timer
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
    }
    
    // Set a new timer
    reconnectTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current && !subscribedRef.current && conversationId) {
        console.log("Reconnection timer triggered, attempting to reconnect participant channel");
        setError(null);
        attemptReconnection();
      }
    }, 5000); // 5 second delay before reconnection attempt
  }, [attemptReconnection, conversationId]);
  
  // Core channel subscription logic
  useEffect(() => {
    // Clean up existing subscription
    const cleanupChannel = () => {
      if (channelRef.current) {
        console.log("Cleaning up existing channel subscription");
        removeChannel(channelRef.current);
        channelRef.current = null;
      }
      subscribedRef.current = false;
    };
    
    cleanupChannel();
    
    if (!conversationId) {
      console.log("No conversation ID provided, skipping realtime subscription");
      return cleanupChannel;
    }
    
    console.log("Setting up realtime subscription for conversation:", conversationId);
    
    // Create a unique channel name with the conversation ID and a timestamp
    // to prevent reusing stale channels
    const channelName = `public-conversation-${conversationId}-${Date.now()}`;
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
          if (!mountedRef.current) return;
          
          console.log("Received realtime update for conversation:", payload);
          setIsConnected(true);
          subscribedRef.current = true;
          
          if (payload.new) {
            // Update max participants if available
            if (payload.new.participants !== null && payload.new.participants > 0) {
              setMaxParticipantsForSession(payload.new.participants);
            }
            
            // Update current participants count
            if (payload.new.current_participants !== null && payload.new.current_participants >= 0) {
              setCurrentParticipantCount(payload.new.current_participants);
            }
            
            // Check if session was started
            if (payload.new.session_started && (!payload.old || !payload.old.session_started)) {
              console.log("Session was started, forcing data refresh");
              refetch();
            }
          }
        })
        .subscribe((status) => {
          if (!mountedRef.current) return;
          
          console.log(`Channel ${channelName} status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to realtime updates');
            setIsConnected(true);
            subscribedRef.current = true;
            // Reset error state
            if (error) setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to channel:', channelName);
            setIsConnected(false);
            subscribedRef.current = false;
            setError("Failed to establish realtime connection");
            setupReconnectionTimer();
          } else if (status === 'TIMED_OUT') {
            console.warn('Channel subscription timed out:', channelName);
            subscribedRef.current = false;
            setupReconnectionTimer();
          }
        });

      channelRef.current = channel;

      return cleanupChannel;
    } catch (err) {
      console.error("Error setting up realtime subscription:", err);
      subscribedRef.current = false;
      setError("Error setting up realtime connection");
      setupReconnectionTimer();
      return cleanupChannel;
    }
  }, [conversationId, refetch, attemptReconnection, setIsConnected, setCurrentParticipantCount, setMaxParticipantsForSession, error, setupReconnectionTimer]);

  return { error };
}
