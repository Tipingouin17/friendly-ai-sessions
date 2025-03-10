
import { useState } from "react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useSessionParticipants } from "@/hooks/useSessionParticipants";
import { useSessionJoiner } from "@/hooks/useSessionJoiner";
import { ConversationWithSession } from "@/types/database";

export function useJoinSessionData(conversationId: number | null) {
  // Participant state
  const [participantName, setParticipantName] = useState("");
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString());
  
  // Fetch plan limits as fallback
  const { maxParticipants: planMaxParticipants } = usePlanLimits();
  
  // Use our new hooks
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

  const handleJoinSession = async () => {
    // Force a refetch before joining to ensure we have the latest counts
    await refetch();
    
    // Use session-specific max or fall back to plan limit
    const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
      maxParticipantsForSession : planMaxParticipants;

    console.log("Join session check:", {
      currentParticipantCount,
      effectiveMaxParticipants,
      isFull: effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants
    });

    // Only check if session is full if effectiveMaxParticipants is greater than 0
    if (effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants) {
      setError("This session has reached its maximum capacity of participants.");
      return Promise.resolve(); // Return a resolved promise for async compatibility
    }

    return joinSession({
      conversationId,
      participantName,
      avatarSeed,
      conversation: conversation as ConversationWithSession,
      currentParticipantCount,
      refetch
    });
  };
  
  // Calculate effective max participants
  const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
    maxParticipantsForSession : planMaxParticipants;
    
  // Only consider session full if effectiveMaxParticipants is greater than 0
  const isFull = effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants;

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
