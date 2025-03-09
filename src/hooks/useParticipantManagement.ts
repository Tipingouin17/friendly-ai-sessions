
import { useState, useEffect, useCallback } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useParticipantCounts } from "@/hooks/useParticipantCounts";
import { useParticipantChannel } from "@/hooks/useParticipantChannel";
import { useRealtimeConnectionHandler } from "@/hooks/useRealtimeConnectionHandler";

interface UseParticipantManagementProps {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  refetch: () => void;
  onError?: (error: string) => void;
}

export function useParticipantManagement({
  conversationId,
  conversation,
  refetch,
  onError
}: UseParticipantManagementProps) {
  // Participant state
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  
  // Realtime connection management
  const {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    connectionError
  } = useRealtimeConnectionHandler({
    conversationId,
    refetch,
    onConnectionError: onError
  });

  // Participant counts management
  const {
    currentParticipantCount,
    setCurrentParticipantCount,
    maxParticipantsForSession,
    setMaxParticipantsForSession
  } = useParticipantCounts(conversation);

  // Set up participant channel
  const { error: channelError } = useParticipantChannel({
    conversationId,
    setIsConnected,
    attemptReconnection,
    setCurrentParticipantCount,
    setMaxParticipantsForSession,
    refetch
  });

  // Handle channel errors
  useEffect(() => {
    if (channelError && onError) {
      onError(channelError);
    }
  }, [channelError, onError]);

  // Check if session is full
  const isSessionFull = useCallback(() => {
    return maxParticipantsForSession > 0 && 
           currentParticipantCount >= maxParticipantsForSession;
  }, [currentParticipantCount, maxParticipantsForSession]);

  return {
    participants,
    setParticipants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull: isSessionFull(),
    error: connectionError || channelError
  };
}
