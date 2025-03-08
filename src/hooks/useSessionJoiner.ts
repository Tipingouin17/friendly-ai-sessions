
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";

interface SessionJoinParams {
  conversationId: number | null;
  participantName: string;
  avatarSeed: string;
  conversation: ConversationWithSession | null;
  currentParticipantCount: number;
  refetch: () => Promise<any>;
}

export function useSessionJoiner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateToSession = (conversationId: number | null, name: string, participantId: number, avatarSeed: string) => {
    console.log(`Navigating to session with name: ${name}, participantId: ${participantId}`);
    
    navigate(`/session?id=${conversationId}`, {
      state: { 
        participantName: name,
        avatarSeed,
        isGuest: true,
        participantId,
        showMessaging: true // Add this flag to explicitly show messaging
      }
    });
  };

  const joinSession = async ({
    conversationId,
    participantName,
    avatarSeed,
    conversation,
    currentParticipantCount,
    refetch
  }: SessionJoinParams) => {
    if (!participantName.trim()) {
      toast({
        title: "Please enter your name",
        description: "A name is required to join the session.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      // Force refresh data before joining to ensure we have latest count
      await refetch();
      
      if (!conversation) {
        throw new Error("Session not found");
      }
      
      if (!conversationId) {
        throw new Error("Invalid session ID");
      }
      
      console.log("Attempting to join session with ID:", conversationId);
      console.log("Current participant count before update:", currentParticipantCount);
      
      // First, fetch the latest count to avoid race conditions
      const { data: latestConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('id, current_participants')
        .eq('id', conversationId)
        .single();
        
      if (fetchError) {
        console.error("Error fetching latest conversation data:", fetchError);
        throw new Error(`Error fetching latest session data: ${fetchError.message}`);
      }
      
      if (!latestConversation) {
        throw new Error("Could not fetch the latest session data");
      }
      
      const latestCount = latestConversation.current_participants || 0;
      const newCount = latestCount + 1;
      console.log("Latest count from database:", latestCount, "New count will be:", newCount);
      
      // Update the participant count with the latest calculated value
      const { data: updateData, error: updateError } = await supabase
        .from('conversations')
        .update({ current_participants: newCount })
        .eq('id', conversationId)
        .select('current_participants')
        .single();
        
      if (updateError) {
        console.error("Error updating participant count:", updateError);
        throw new Error(`Failed to join: ${updateError.message}`);
      }

      if (!updateData) {
        throw new Error("Failed to update participant count");
      }

      console.log("Update response:", updateData);
      
      // Use the returned participant count as the participant ID
      const newParticipantId = updateData.current_participants;
      
      console.log("New participant ID:", newParticipantId);
      
      // Add a short delay to allow for Supabase to process the update
      setTimeout(() => {
        navigateToSession(conversationId, participantName, newParticipantId, avatarSeed);
      }, 500);
      
    } catch (error: any) {
      console.error("Error joining session:", error);
      setError(error.message || "Failed to join the session");
      toast({
        title: "Error",
        description: error.message || "Failed to join the session. Please try again.",
        variant: "destructive",
      });
      setIsJoining(false);
    }
  };

  return {
    isJoining,
    error,
    joinSession,
    setError
  };
}
