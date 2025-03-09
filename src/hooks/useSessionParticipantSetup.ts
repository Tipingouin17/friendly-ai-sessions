
import { useCallback, useEffect } from "react";
import { useSessionParticipantManager } from "@/hooks/useSessionParticipantManager";
import { ConversationWithSession } from "@/types/database";

interface UseSessionParticipantSetupProps {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  locationState: { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean 
  } | null;
  refetch: () => void;
  onError: (error: string) => void;
  onSessionFull: (() => void) | undefined;
}

export const useSessionParticipantSetup = ({
  conversationId,
  conversation,
  locationState,
  refetch,
  onError,
  onSessionFull
}: UseSessionParticipantSetupProps) => {
  // Memoize handleSessionFull callback to prevent re-renders
  const memoizedHandleSessionFull = useCallback(() => {
    if (onSessionFull) {
      console.log("Calling memoized handleSessionFull");
      onSessionFull();
    }
  }, [onSessionFull]);

  // Set up participant management
  const {
    participants,
    currentUserParticipantId,
    error: participantError,
    currentParticipantCount,
    maxParticipantsForSession,
    forceRefreshParticipants
  } = useSessionParticipantManager({
    conversationId,
    conversation,
    locationState,
    refetch,
    onSessionFull: memoizedHandleSessionFull
  });

  // Handle participant errors
  useEffect(() => {
    if (participantError) {
      console.error("Participant error:", participantError);
      onError(participantError);
    }
  }, [participantError, onError]);

  // Force periodic refresh of participant data
  useEffect(() => {
    if (conversationId) {
      const interval = setInterval(() => {
        console.log("Forcing periodic refresh of conversation data");
        refetch();
        if (forceRefreshParticipants) {
          forceRefreshParticipants();
        }
      }, 10000); // Every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [conversationId, refetch, forceRefreshParticipants]);

  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession
  };
};
