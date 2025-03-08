
import { useState } from "react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useSessionParticipants } from "@/hooks/useSessionParticipants";
import { useSessionJoiner } from "@/hooks/useSessionJoiner";

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
    // Use session-specific max or fall back to plan limit
    const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
      maxParticipantsForSession : planMaxParticipants;

    // Check if the session is full
    if (currentParticipantCount >= effectiveMaxParticipants && effectiveMaxParticipants > 0) {
      setError("This session has reached its maximum capacity of participants.");
      return;
    }

    await joinSession({
      conversationId,
      participantName,
      avatarSeed,
      conversation,
      currentParticipantCount,
      refetch
    });
  };
  
  // Calculate effective max participants
  const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
    maxParticipantsForSession : planMaxParticipants;
    
  // Only consider full if the max is greater than 0 and we've reached it
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
