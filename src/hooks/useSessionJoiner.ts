
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
      
      // First, fetch the latest count to avoid race conditions
      const { data: latestConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('id, current_participants')
        .eq('id', conversationId)
        .maybeSingle();
        
      if (fetchError) {
        console.error("Error fetching latest conversation data:", fetchError);
        throw fetchError;
      }
      
      if (!latestConversation) {
        throw new Error("Could not fetch the latest session data");
      }
      
      const latestCount = latestConversation.current_participants || 0;
      const newCount = latestCount + 1;
      console.log("Latest count from database:", latestCount, "New count will be:", newCount);
      
      // Update the participant count with the latest calculated value
      const { data, error: updateError } = await supabase
        .from('conversations')
        .update({ current_participants: newCount })
        .eq('id', conversationId)
        .select('current_participants')
        .limit(1);
        
      if (updateError) {
        console.error("Error updating participant count:", updateError);
        setError(updateError.message);
        throw updateError;
      }

      console.log("Update response:", data);
      
      // Use either the returned value or the calculated new count
      const newParticipantId = data && data.length > 0 
        ? data[0].current_participants 
        : newCount;
      
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
