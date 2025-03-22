
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ParticipantInfo } from "@/types/chat";

interface UseParticipantRemovalProps {
  conversationId: number | null;
  currentParticipantCount: number;
  setParticipantsList: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
}

export const useParticipantRemoval = ({
  conversationId,
  currentParticipantCount,
  setParticipantsList
}: UseParticipantRemovalProps) => {
  const [displayCount, setDisplayCount] = useState(currentParticipantCount);
  const { toast } = useToast();
  
  // Update display count when props change
  useEffect(() => {
    setDisplayCount(currentParticipantCount);
  }, [currentParticipantCount]);
  
  // Function to remove a participant
  const removeParticipant = async (participantId: number) => {
    if (!conversationId) return;
    
    try {
      // First, remove from session_participants table
      const { error: removeError } = await supabase
        .from('session_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('participant_id', participantId);
        
      if (removeError) {
        console.error("Error removing participant:", removeError);
        toast({
          title: "Error",
          description: "Could not remove participant",
          variant: "destructive"
        });
        return;
      }
      
      // Calculate new count based on actual remaining participants
      setParticipantsList(prev => {
        const filteredList = prev.filter(p => p.id !== participantId);
        const newCount = filteredList.length;
        
        // Update the display count
        setDisplayCount(newCount);
        
        // Update conversations table with the new count
        supabase
          .from('conversations')
          .update({ current_participants: newCount })
          .eq('id', conversationId)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error("Error updating participant count:", updateError);
              toast({
                title: "Error", 
                description: "Could not update participant count",
                variant: "destructive"
              });
            }
          });
          
        return filteredList;
      });
      
      // Create a participant_removed event with more detailed data to completely remove access
      await supabase
        .from('session_events')
        .insert({
          conversation_id: conversationId,
          event_type: 'participant_removed',
          data: { 
            participant_id: participantId,
            current_count: displayCount - 1,
            removed_by: 'admin',
            timestamp: new Date().toISOString(),
            permanent_removal: true,  // Flag to indicate permanent removal
            access_revoked: true      // Flag to indicate access revocation
          }
        });
      
      toast({
        title: "Participant removed",
        description: `Successfully removed participant from session`,
      });
      
      // Broadcast count update to ensure all clients get the update
      try {
        await supabase
          .from('session_events')
          .insert({
            conversation_id: conversationId,
            event_type: 'count_updated',
            data: { 
              current_count: displayCount - 1,
              updated_by: 'admin',
              timestamp: new Date().toISOString()
            }
          });
      } catch (err) {
        console.error("Error broadcasting count update:", err);
      }
      
    } catch (err) {
      console.error("Exception removing participant:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };
  
  return {
    displayCount,
    setDisplayCount,
    removeParticipant
  };
};
