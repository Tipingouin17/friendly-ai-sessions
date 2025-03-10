
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

interface SessionJoinParams {
  conversationId: number | null;
  participantName: string;
  avatarSeed: string;
  conversation: ConversationWithSession | null;
  currentParticipantCount: number;
  refetch: () => Promise<any>;
  isAnonymous?: boolean;
  isAdmin?: boolean;
}

export function useSessionJoiner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, setAdminStatus } = useSessionAdminStatus();

  const navigateToSession = (conversationId: number | null, name: string, participantId: number, avatarSeed: string, forceAdmin: boolean = false) => {
    const adminStatus = forceAdmin || isAdmin;
    console.log(`Navigating to session with name: ${name}, participantId: ${participantId}, isAdmin: ${adminStatus}`);
    
    if (adminStatus) {
      // Set admin status in session storage to ensure it persists
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
    
    navigate(`/session?id=${conversationId}`, {
      state: { 
        participantName: name,
        avatarSeed,
        isGuest: true,
        participantId,
        showMessaging: true,
        isAdmin: adminStatus
      }
    });
  };

  const joinSession = async ({
    conversationId,
    participantName,
    avatarSeed,
    conversation,
    currentParticipantCount,
    refetch,
    isAnonymous = false,
    isAdmin: forceAdmin = false
  }: SessionJoinParams) => {
    if (!participantName.trim()) {
      toast({
        title: "Please enter your name",
        description: "A name is required to join the session.",
        variant: "destructive",
      });
      return Promise.resolve();
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
      
      const effectiveIsAdmin = forceAdmin || isAdmin;
      console.log("Attempting to join session with ID:", conversationId);
      console.log("Current participant count before update:", currentParticipantCount);
      console.log("Admin status:", effectiveIsAdmin);
      
      // First, fetch the latest count to avoid race conditions - for ALL users
      const { data: latestConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('id, current_participants, participants')
        .eq('id', conversationId)
        .single();
        
      if (fetchError) {
        console.error("Error fetching latest conversation data:", fetchError);
        throw new Error(`Error fetching latest session data: ${fetchError.message}`);
      }
      
      if (!latestConversation) {
        throw new Error("Could not fetch the latest session data");
      }
      
      // Skip session full check for admin users
      if (!effectiveIsAdmin) {
        // Only enforce the limit if maxParticipants is greater than 0
        if (latestConversation.participants > 0 && 
            latestConversation.current_participants >= latestConversation.participants) {
          throw new Error("This session is full and cannot accept more participants.");
        }
      } else {
        console.log("Admin user detected - bypassing ALL session full checks");
      }
      
      // For all users (admin or not), we need to update the participant count
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
      const newParticipantId = newCount;
      
      console.log("New participant ID:", newParticipantId);
      
      // Store the participant information in the session_participants table
      try {
        const { error: participantError } = await supabase
          .from('session_participants')
          .insert({
            conversation_id: conversationId,
            participant_id: newParticipantId,
            name: participantName,
            avatar_seed: avatarSeed,
            is_anonymous: isAnonymous || false,
            is_admin: effectiveIsAdmin || false
          });
          
        if (participantError) {
          console.error("Error storing participant info:", participantError);
          // Continue anyway - this is not critical for joining
        }
      } catch (err) {
        // Catch any error from the insert operation but continue
        console.error("Exception storing participant info:", err);
      }
      
      // Add a short delay to allow for Supabase to process the update
      setTimeout(() => {
        navigateToSession(conversationId, participantName, newParticipantId, avatarSeed, effectiveIsAdmin);
      }, 500);
      
      return Promise.resolve();
    } catch (error: any) {
      console.error("Error joining session:", error);
      setError(error.message || "Failed to join the session");
      toast({
        title: "Error",
        description: error.message || "Failed to join the session. Please try again.",
        variant: "destructive",
      });
      setIsJoining(false);
      return Promise.resolve();
    }
  };

  return {
    isJoining,
    error,
    joinSession,
    setError
  };
}
