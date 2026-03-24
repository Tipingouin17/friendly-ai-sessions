
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
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Update display count when props change
  useEffect(() => {
    setDisplayCount(currentParticipantCount);
  }, [currentParticipantCount]);
  
  // Function to remove a participant with optimistic updates
  const removeParticipant = async (participantId: number) => {
    if (!conversationId) {
      toast({
        title: "Error",
        description: "No active session found",
        variant: "destructive"
      });
      return;
    }
    
    // Prevent multiple simultaneous removals
    if (isRemoving === participantId) {
      return;
    }
    
    setIsRemoving(participantId);
    
    // Optimistic update - remove participant from UI immediately
    let originalParticipants: ParticipantInfo[] = [];
    setParticipantsList(prev => {
      originalParticipants = [...prev];
      const filteredList = prev.filter(p => p.id !== participantId);
      setDisplayCount(filteredList.length);
      return filteredList;
    });
    
    try {
      
      // Remove from session_participants table
      const { error: removeError, data } = await supabase
        .from('session_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('participant_id', participantId)
        .select();
        
      if (removeError) {
        console.error("❌ Error removing participant:", removeError);
        
        // Revert optimistic update
        setParticipantsList(originalParticipants);
        setDisplayCount(originalParticipants.length);
        
        // Show specific error message
        const errorMessage = removeError.message.includes('policy') 
          ? "You don't have permission to remove this participant"
          : "Could not remove participant. Please try again.";
          
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn("⚠️ No participant was removed - may have already been removed");
        toast({
          title: "Warning",
          description: "Participant may have already been removed",
          variant: "destructive"
        });
        return;
      }
      
      const newCount = originalParticipants.length - 1;
      
      // Update conversations table with the new count
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ current_participants: newCount })
        .eq('id', conversationId);
        
      if (updateError) {
        console.error("⚠️ Error updating participant count:", updateError);
        toast({
          title: "Warning", 
          description: "Participant removed but count may be inconsistent",
          variant: "destructive"
        });
      }
      
      // Create a participant_removed event for real-time updates to other clients
      const { error: eventError } = await supabase
        .from('session_events')
        .insert({
          conversation_id: conversationId,
          event_type: 'participant_removed',
          data: { 
            participant_id: participantId,
            current_count: newCount,
            removed_by: 'admin',
            timestamp: new Date().toISOString(),
            permanent_removal: true,
            access_revoked: true,
            reason: 'admin_removal'
          }
        });
      
      if (eventError) {
        console.error("⚠️ Error creating removal event:", eventError);
        // Don't show error to user as the removal was successful
      }
      
      toast({
        title: "Participant removed",
        description: `Successfully removed participant from session`,
      });
      
    } catch (err) {
      console.error("💥 Exception removing participant:", err);
      
      // Revert optimistic update
      setParticipantsList(originalParticipants);
      setDisplayCount(originalParticipants.length);
      
      toast({
        title: "Error",
        description: "An unexpected error occurred while removing participant",
        variant: "destructive"
      });
    } finally {
      setIsRemoving(null);
    }
  };
  
  return {
    displayCount,
    setDisplayCount,
    removeParticipant,
    isRemoving
  };
};
