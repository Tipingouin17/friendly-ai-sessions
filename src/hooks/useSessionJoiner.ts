
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
        participantId
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
      
      console.log("Current participant count before update:", currentParticipantCount);
      
      // Increment the current participant count in the conversation
      const { data, error: updateError } = await supabase
        .from('conversations')
        .update({ 
          current_participants: (conversation?.current_participants || 0) + 1 
        })
        .eq('id', conversationId)
        .select('current_participants')
        .single();
        
      if (updateError) {
        console.error("Error updating participant count:", updateError);
        setError(updateError.message);
        throw updateError;
      }

      console.log("Update response:", data);
      
      // Use the returned current_participants value as the participant ID to ensure uniqueness
      const newParticipantId = data?.current_participants || ((conversation?.current_participants || 0) + 1);
      
      // Add a short delay to allow for Supabase to process the update
      setTimeout(() => {
        navigateToSession(conversationId, participantName, newParticipantId, avatarSeed);
      }, 500);
      
    } catch (error: any) {
      console.error("Error joining session:", error);
      setError(error.message || "Failed to join the session");
      toast({
        title: "Error",
        description: "Failed to join the session. Please try again.",
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
