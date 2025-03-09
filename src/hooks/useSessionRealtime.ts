
import { useEffect, useRef } from "react";
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

  useEffect(() => {
    // Clean up function to remove all channels
    const cleanupChannels = () => {
      if (channelsRef.current.length > 0) {
        console.log(`Cleaning up ${channelsRef.current.length} channels`);
        channelsRef.current.forEach(channel => {
          supabase.removeChannel(channel);
        });
        channelsRef.current = [];
      }
    };

    // Reset handler flags when conversation ID changes
    sessionFullCalledRef.current = false;
    sessionStartedCalledRef.current = false;
    
    // Clean up existing subscriptions before creating new ones
    cleanupChannels();

    if (currentConversationId) {
      console.log("Setting up realtime subscription for participants in Session page");
      
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

      // First channel for conversation updates
      const conversationChannel = supabase
        .channel(`conversations-${currentConversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${currentConversationId}`
        }, (payload) => {
          console.log("Received realtime update for participants in Session page:", payload);
          
          if (payload.new) {
            // Check for session_started flag
            if (payload.new.session_started && !sessionStartedCalledRef.current) {
              console.log("Session started flag detected, triggering onSessionStarted");
              sessionStartedCalledRef.current = true;
              if (onSessionStarted) {
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
                if (handleSessionFull) {
                  handleSessionFull();
                }
              }
            }
            
            // Only refetch if needed to reduce unnecessary API calls
            refetch();
          }
        })
        .subscribe();
      
      channelsRef.current.push(conversationChannel);
      
      // Second channel for session_participants updates - only create if we need to track new participants
      const participantsChannel = supabase
        .channel(`session_participants-${currentConversationId}`)
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
              const participantInfo = await getParticipantInfo(newParticipant);
              
              setParticipants(current => {
                // Double-check we're not adding a duplicate
                if (current.some(p => p.id === participantInfo.id)) {
                  return current;
                }
                return [...current, participantInfo];
              });
            }
          }
        })
        .subscribe();
        
      channelsRef.current.push(participantsChannel);
      
      return () => {
        cleanupChannels();
      };
    }
    
    return () => {
      cleanupChannels();
    };
  }, [currentConversationId, participants, refetch, conversation, handleSessionFull, onSessionStarted, setParticipants]);
};
