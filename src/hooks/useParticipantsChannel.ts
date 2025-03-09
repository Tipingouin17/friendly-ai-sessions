
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParticipantInfo } from "@/types/chat";
import { getParticipantInfo } from "@/utils/participantUtils";

type UseParticipantsChannelProps = {
  conversationId: number | null;
  participants: ParticipantInfo[];
  setParticipants: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
};

export function useParticipantsChannel({
  conversationId,
  participants,
  setParticipants
}: UseParticipantsChannelProps) {
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  
  // Set up real-time subscription for participant updates
  useEffect(() => {
    if (!conversationId) {
      console.log("No conversation ID provided, skipping participants channel setup");
      return;
    }
    
    // Clean up existing channel if it exists
    if (channelRef.current) {
      console.log("Cleaning up existing participants channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    console.log("Setting up realtime channel for participants:", conversationId);
    
    try {
      // Channel for session_participants updates
      const participantsChannel = supabase
        .channel(`participants-${conversationId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'session_participants',
          filter: `conversation_id=eq.${conversationId}`
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
        
      channelRef.current = participantsChannel;
      
      return () => {
        if (channelRef.current) {
          console.log("Cleaning up participants channel");
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch (channelError) {
      console.error("Error creating participants channel:", channelError);
      setError("Failed to establish connection to session participants");
      return;
    }
  }, [conversationId, participants, setParticipants]);

  return { error };
}
