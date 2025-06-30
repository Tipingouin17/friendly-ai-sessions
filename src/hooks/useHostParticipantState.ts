
import { useState, useEffect, useCallback } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useSessionParticipantManager } from "@/hooks/useSessionParticipantManager";
import { createLogger } from "@/utils/debugLogger";
import { isNetworkError } from "@/utils/networkUtils";

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
  const logger = createLogger('HostParticipantState', 'admin');
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Mock refetch function for participant manager
  const mockRefetch = useCallback(async () => {
    logger.category('admin', 'Mock refetch called for host participant state');
    return Promise.resolve();
  }, [logger]);

  // Enhanced error handler that filters network errors
  const handleError = useCallback((error: string) => {
    if (isNetworkError({ message: error })) {
      setNetworkError(error);
      logger.category('admin', 'Network error detected:', error);
    } else {
      logger.category('admin', 'Non-network error:', error);
    }
  }, [logger]);

  // Use session participant manager with enhanced error handling
  const {
    participants: managerParticipants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    currentUserParticipantId,
    isSessionFull,
    error,
    forceRefreshParticipants,
    retryCount
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
      logger.category('admin', `Updating participants from manager: ${managerParticipants.length} participants`);
      setParticipants(managerParticipants);
      // Clear network error if we successfully got participants
      setNetworkError(null);
    }
  }, [managerParticipants, logger]);

  // Log state changes
  useEffect(() => {
    logger.category('admin', 'Host participant state updated:', {
      participantCount: participants.length,
      currentParticipantCount,
      maxParticipantsForSession,
      isSessionFull,
      isConnected,
      connectionAttempts,
      error: error || null,
      networkError,
      retryCount
    });
  }, [participants.length, currentParticipantCount, maxParticipantsForSession, isSessionFull, isConnected, connectionAttempts, error, logger, networkError, retryCount]);

  return {
    participants,
    setParticipants,
    isLoadingParticipants: !isConnected && connectionAttempts === 0,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    error: networkError || error, // Prioritize network errors for UI handling
    forceRefreshParticipants,
    retryCount
  };
}
