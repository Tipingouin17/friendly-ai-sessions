
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
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
  onError?: (error: string) => void;
  onSessionFull?: () => void;
}

export function useSessionParticipantSetup({
  conversationId,
  conversation,
  locationState,
  refetch,
  onError,
  onSessionFull
}: UseSessionParticipantSetupProps) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState<number | null>(null);
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);

  // Set current user participant ID from location state
  useEffect(() => {
    if (locationState?.participantId) {
      setCurrentUserParticipantId(locationState.participantId);
    }
  }, [locationState]);

  // Set max participants from conversation
  useEffect(() => {
    if (conversation) {
      setMaxParticipantsForSession(conversation.participants || 0);
    }
  }, [conversation]);

  // Check if session is full and trigger callback
  useEffect(() => {
    const isSessionFull = currentParticipantCount >= maxParticipantsForSession && maxParticipantsForSession > 0;
    
    if (isSessionFull && onSessionFull) {
      console.log("Session is full. Triggering onSessionFull callback.");
      onSessionFull();
    }
  }, [currentParticipantCount, maxParticipantsForSession, onSessionFull]);

  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession
  };
}
