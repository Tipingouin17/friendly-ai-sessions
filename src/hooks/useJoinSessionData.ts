
import { useState, useEffect } from "react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useSessionParticipants } from "@/hooks/useSessionParticipants";
import { useSessionJoiner } from "@/hooks/useSessionJoiner";
import { ConversationWithSession } from "@/types/database";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useToast } from "@/components/ui/use-toast";

export function useJoinSessionData(conversationId: number | null) {
  // Participant state
  const [participantName, setParticipantName] = useState("");
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString());
  const { toast } = useToast();
  const { isAdmin } = useSessionAdminStatus();
  
  // Fetch plan limits as fallback
  const { maxParticipants: planMaxParticipants } = usePlanLimits();
  
  // Use our hooks
  const { 
    currentParticipantCount, 
    maxParticipantsForSession, 
    conversation,
    error: participantsError,
    refetch
  } = useSessionParticipants(conversationId);
  
  const { 
    isJoining, 
    error: joinerError, 
    joinSession,
    setError 
  } = useSessionJoiner();

  // Combine errors from both hooks
  const error = participantsError || joinerError;

  // Check if this is an admin joining
  useEffect(() => {
    if (isAdmin && conversationId) {
      console.log("Admin detected in useJoinSessionData - should bypass session full checks");
    }
  }, [isAdmin, conversationId]);

  const handleJoinSession = async () => {
    // Force a refetch before joining to ensure we have the latest counts
    await refetch();
    
    // Use session-specific max or fall back to plan limit
    const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
      maxParticipantsForSession : planMaxParticipants;

    console.log("Join session check:", {
      currentParticipantCount,
      effectiveMaxParticipants,
      isFull: effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants,
      isAdmin
    });

    // Skip check if admin - they should always be able to join
    if (isAdmin) {
      console.log("Admin user detected, bypassing session full check");
      // Continue with join process for admin users
      return joinSession({
        conversationId,
        participantName,
        avatarSeed,
        conversation: conversation as ConversationWithSession,
        currentParticipantCount,
        refetch,
        isAdmin: true  // Pass the admin status to joinSession
      });
    }

    // Only check if session is full if effectiveMaxParticipants is greater than 0
    // and we're not an admin
    if (effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants) {
      toast({
        title: "Session Full",
        description: "This session has reached its maximum capacity of participants.",
        variant: "destructive",
      });
      setError("This session has reached its maximum capacity of participants.");
      return Promise.resolve(); // Return a resolved promise for async compatibility
    }

    return joinSession({
      conversationId,
      participantName,
      avatarSeed,
      conversation: conversation as ConversationWithSession,
      currentParticipantCount,
      refetch,
      isAdmin: false
    });
  };
  
  // Calculate effective max participants
  const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
    maxParticipantsForSession : planMaxParticipants;
    
  // Only consider session full if effectiveMaxParticipants is greater than 0
  // And we're not an admin
  const isFull = !isAdmin && effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants;

  return {
    participantName,
    setParticipantName,
    avatarSeed,
    setAvatarSeed,
    isJoining,
    currentParticipantCount,
    effectiveMaxParticipants,
    isFull,
    conversation,
    isLoading: !conversation && !error,
    error,
    handleJoinSession
  };
}
