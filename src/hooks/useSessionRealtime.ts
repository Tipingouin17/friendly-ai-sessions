
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParticipantInfo } from "@/types/chat";
import { getParticipantInfo } from "@/utils/participantUtils";

type UseSessionRealtimeProps = {
  currentConversationId: number | null;
  participants: ParticipantInfo[];
  setParticipants: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
  conversation: any | null;
  refetch: () => void;
  handleSessionFull?: () => void;
  onSessionStarted?: () => void;
};

export const useSessionRealtime = ({
  currentConversationId,
  participants,
  setParticipants,
  conversation,
  refetch,
  handleSessionFull,
  onSessionStarted
}: UseSessionRealtimeProps) => {
  // Use refs to track if handlers have been called to prevent duplicate calls
  const sessionFullCalledRef = useRef(false);
  const sessionStartedCalledRef = useRef(false);
  const channelsRef = useRef<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);
  const isSubscribedRef = useRef(false);
  
  // Set up real-time subscription
  useEffect(() => {
    console.log("useSessionRealtime effect triggered with conversation ID:", currentConversationId);
    
    // Don't set up channels if there's no conversation ID
    if (!currentConversationId) {
      console.log("No conversation ID provided, skipping realtime setup");
      return;
    }
    
    // Reset handler flags when component mounts
    if (!isInitializedRef.current) {
      console.log("Initializing session realtime handlers");
      sessionFullCalledRef.current = false;
      sessionStartedCalledRef.current = false;
      isInitializedRef.current = true;
    }
    
    // Clean up function to remove all channels
    const cleanupChannels = () => {
      if (channelsRef.current && channelsRef.current.length > 0) {
        console.log(`Cleaning up ${channelsRef.current.length} realtime channels`);
        channelsRef.current.forEach(channel => {
          try {
            if (channel && typeof channel.unsubscribe === 'function') {
              channel.unsubscribe();
            }
          } catch (err) {
            console.error("Error removing channel:", err);
          }
        });
        channelsRef.current = [];
      }
    };

    // Clean up existing subscriptions before creating new ones
    cleanupChannels();
    
    // Check if the session is already full when component mounts
    if (conversation && 
        conversation.current_participants >= (conversation.participants || 0) && 
        (conversation.participants || 0) > 0 && 
        !sessionFullCalledRef.current) {
      console.log("Session is already full on component mount, triggering handleSessionFull");
      sessionFullCalledRef.current = true;
      if (handleSessionFull) {
        handleSessionFull();
      }
    }

    try {
      if (isSubscribedRef.current) {
        console.log("Already subscribed to realtime channels, skipping setup");
        return;
      }
      
      console.log("Setting up realtime channels for conversation:", currentConversationId);
      
      // Wrap supabase channel creation in try-catch to prevent errors
      try {
        // Use stable channel names without timestamps
        const conversationChannel = supabase
          .channel(`conversation-${currentConversationId}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'conversations',
            filter: `id=eq.${currentConversationId}`
          }, (payload) => {
            console.log("Received realtime update for conversation:", payload);
            
            if (payload.new) {
              // Check for session_started flag
              if (payload.new.session_started && !sessionStartedCalledRef.current) {
                console.log("Session started flag detected, triggering onSessionStarted");
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
                  console.log("All participants have joined, triggering session start");
                  sessionFullCalledRef.current = true;
                  if (handleSessionFull && typeof handleSessionFull === 'function') {
                    handleSessionFull();
                  }
                }
              }
              
              // Only refetch if needed to reduce unnecessary API calls
              if (typeof refetch === 'function') {
                refetch();
              }
            }
          })
          .subscribe((status) => {
            console.log(`Conversation channel subscription status: ${status}`);
          });
        
        channelsRef.current.push(conversationChannel);
        
        // Channel for session_participants updates
        const participantsChannel = supabase
          .channel(`participants-${currentConversationId}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'session_participants',
            filter: `conversation_id=eq.${currentConversationId}`
          }, async (payload) => {
            console.log("Received new participant:", payload);
            
            if (payload.new) {
              const newParticipant = payload.new;
              
              // Check if we already have this participant
              if (!participants.some(p => p.id === newParticipant.participant_id)) {
                try {
                  const participantInfo = await getParticipantInfo(newParticipant);
                  
                  setParticipants(current => {
                    // Double-check we're not adding a duplicate
                    if (current.some(p => p.id === participantInfo.id)) {
                      return current;
                    }
                    const updatedParticipants = [...current, participantInfo];
                    console.log("Updated participant list:", updatedParticipants);
                    return updatedParticipants;
                  });
                } catch (error) {
                  console.error("Error getting participant info:", error);
                  setError("Error retrieving participant information");
                }
              }
            }
          })
          .subscribe((status) => {
            console.log(`Participants channel subscription status: ${status}`);
          });
          
        channelsRef.current.push(participantsChannel);
        
        // Channel to track messages for admin view
        const messagesChannel = supabase
          .channel(`messages-${currentConversationId}`)
          .on('postgres_changes', {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${currentConversationId}`
          }, (payload) => {
            console.log("Messages table change detected:", payload);
            
            // Force a refetch to update UI with new messages
            if (typeof refetch === 'function') {
              refetch();
            }
          })
          .subscribe((status) => {
            console.log(`Messages channel subscription status: ${status}`);
          });
          
        channelsRef.current.push(messagesChannel);
        
        isSubscribedRef.current = true;
      } catch (channelError) {
        console.error("Error creating Supabase channels:", channelError);
        setError("Failed to establish connection to session (channel creation error)");
      }
      
      return () => {
        console.log("Cleaning up realtime channels on unmount");
        isSubscribedRef.current = false;
        cleanupChannels();
      };
    } catch (err) {
      console.error("Error setting up realtime channels:", err);
      setError("Failed to establish connection to session");
      return;
    }
  }, [currentConversationId, participants, setParticipants, conversation, refetch, handleSessionFull, onSessionStarted]); 
  
  // Second effect to handle conversation/participant changes separately
  useEffect(() => {
    if (conversation && currentConversationId) {
      // Check for session status
      if (conversation.session_started && !sessionStartedCalledRef.current) {
        console.log("Session already started from props, triggering onSessionStarted");
        sessionStartedCalledRef.current = true;
        if (onSessionStarted && typeof onSessionStarted === 'function') {
          onSessionStarted();
        }
      }
      
      // Check if session is full
      if (conversation.current_participants >= (conversation.participants || 0) && 
          (conversation.participants || 0) > 0 && 
          !sessionFullCalledRef.current) {
        console.log("Session is full from props, triggering handleSessionFull");
        sessionFullCalledRef.current = true;
        if (handleSessionFull && typeof handleSessionFull === 'function') {
          handleSessionFull();
        }
      }
    }
  }, [conversation, currentConversationId, onSessionStarted, handleSessionFull]);

  return { error };
};
