
import { useState, useEffect, useCallback } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useSessionParticipantManager } from "@/hooks/useSessionParticipantManager";
import { createLogger } from "@/utils/debugLogger";

interface UseHostParticipantStateProps {
  locationState?: any;
  conversationData: ConversationWithSession | null;
  currentConversationId: number | null;
  onSessionFull?: () => void;
}

export function useHostParticipantState({
  locationState,
  conversationData,
  currentConversationId,
  onSessionFull
}: UseHostParticipantStateProps) {
  const logger = createLogger('HostParticipantState', 'host');
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

  // Mock refetch function for participant manager
  const mockRefetch = useCallback(async () => {
    logger.category('host', 'Mock refetch called for host participant state');
    return Promise.resolve();
  }, [logger]);

  // Use session participant manager with session full callback
  const {
    participants: managerParticipants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    currentUserParticipantId,
    isSessionFull,
    error,
    forceRefreshParticipants
  } = useSessionParticipantManager({
    conversationId: currentConversationId,
    conversation: conversationData,
    refetch: mockRefetch,
    onSessionFull,
    locationState
  });

  // Update local participants state when manager participants change
  useEffect(() => {
    if (managerParticipants && managerParticipants.length > 0) {
      logger.category('host', `Updating participants from manager: ${managerParticipants.length} participants`);
      setParticipants(managerParticipants);
    }
  }, [managerParticipants, logger]);

  // Log state changes
  useEffect(() => {
    logger.category('host', 'Host participant state updated:', {
      participantCount: participants.length,
      currentParticipantCount,
      maxParticipantsForSession,
      isSessionFull,
      isConnected,
      connectionAttempts,
      error: error || null
    });
  }, [participants.length, currentParticipantCount, maxParticipantsForSession, isSessionFull, isConnected, connectionAttempts, error, logger]);

  return {
    participants,
    setParticipants,
    isLoadingParticipants: !isConnected && connectionAttempts === 0,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    error,
    forceRefreshParticipants
  };
}
