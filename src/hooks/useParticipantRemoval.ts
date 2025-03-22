
import { useState } from 'react';
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
      
      // Update participant count in conversations table
      const newCount = Math.max(0, currentParticipantCount - 1);
      
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ current_participants: newCount })
        .eq('id', conversationId);
        
      if (updateError) {
        console.error("Error updating participant count:", updateError);
        toast({
          title: "Error",
          description: "Could not update participant count",
          variant: "destructive"
        });
        return;
      }
      
      // Create a participant_removed event
      await supabase
        .from('session_events')
        .insert({
          conversation_id: conversationId,
          event_type: 'participant_removed',
          data: { 
            participant_id: participantId,
            current_count: newCount,
            removed_by: 'admin',
            timestamp: new Date().toISOString()
          }
        });
      
      // Update local state
      setDisplayCount(newCount);
      setParticipantsList(prev => prev.filter(p => p.id !== participantId));
      
      toast({
        title: "Participant removed",
        description: `Successfully removed participant ${participantId}`,
      });
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
