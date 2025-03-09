
import { useState, useEffect } from "react";
import { ConversationWithSession } from "@/types/database";
import { useParticipantManagement } from "@/hooks/useParticipantManagement";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";

interface UseSessionParticipantManagerProps {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  locationState: { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
  } | null;
  refetch: () => void;
  onSessionFull?: () => void;
}

export function useSessionParticipantManager({
  conversationId,
  conversation,
  locationState,
  refetch,
  onSessionFull
}: UseSessionParticipantManagerProps) {
  const [error, setError] = useState<string | null>(null);

  // Get participant management utilities
  const {
    participants,
    setParticipants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    error: participantError
  } = useParticipantManagement({
    conversationId,
    conversation,
    refetch,
    onError: (err) => setError(err)
  });

  // Get current participant ID
  const currentUserParticipantId = useCurrentParticipant({ 
    locationState, 
    conversation 
  });

  // Trigger onSessionFull callback when session becomes full
  useEffect(() => {
    if (isSessionFull && onSessionFull) {
      console.log("Session is full, triggering onSessionFull callback");
      onSessionFull();
    }
  }, [isSessionFull, onSessionFull]);

  // Propagate errors
  useEffect(() => {
    if (participantError) {
      setError(participantError);
    }
  }, [participantError]);

  return {
    participants,
    setParticipants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    currentUserParticipantId,
    isSessionFull,
    error
  };
}
