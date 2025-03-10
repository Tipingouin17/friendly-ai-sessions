
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";
import { useNavigateToSession } from "./useNavigateToSession";
import { useSessionCapacityCheck } from "./useSessionCapacityCheck";
import { registerParticipant } from "./useParticipantRegistration";
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
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { navigateToSession } = useNavigateToSession();
  const { isCheckingCapacity, checkCapacityAndUpdate } = useSessionCapacityCheck();
  const { isAdmin: contextIsAdmin } = useSessionAdminStatus();

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
      // Force refresh data before joining to ensure we have latest counts
      await refetch();
      
      if (!conversation) {
        throw new Error("Session not found");
      }
      
      if (!conversationId) {
        throw new Error("Invalid session ID");
      }
      
      const effectiveIsAdmin = forceAdmin || contextIsAdmin;
      console.log("Attempting to join session with ID:", conversationId);
      console.log("Current participant count before update:", currentParticipantCount);
      console.log("Admin status:", effectiveIsAdmin);
      
      // Check capacity and update participant count
      const capacityResult = await checkCapacityAndUpdate(conversationId, effectiveIsAdmin);
      
      if (!capacityResult.canJoin && !effectiveIsAdmin) {
        throw new Error(capacityResult.error || "This session is full and cannot accept more participants.");
      }
      
      // Use the returned participant count as the participant ID
      const newParticipantId = capacityResult.newParticipantId;
      console.log("New participant ID:", newParticipantId);
      
      // Store the participant information in the session_participants table
      await registerParticipant({
        conversationId, 
        participantId: newParticipantId,
        participantName,
        avatarSeed,
        isAnonymous,
        isAdmin: effectiveIsAdmin
      });
      
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
    isJoining: isJoining || isCheckingCapacity,
    error,
    joinSession,
    setError
  };
}
