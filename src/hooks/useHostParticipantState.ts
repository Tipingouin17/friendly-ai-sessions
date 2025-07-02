
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useEnhancedHostParticipantManager } from "@/hooks/useEnhancedHostParticipantManager";
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
  const logger = createLogger('HostParticipantState', 'admin');
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

  // Use the enhanced host participant manager (single source of truth)
  const { 
    isConnected, 
    error, 
    participants: enhancedParticipants,
    currentCount,
    maxCount,
    refresh
  } = useEnhancedHostParticipantManager({
    conversationId: currentConversationId,
    onParticipantCountChange: (count) => {
      logger.category('admin', `Participant count updated to: ${count}`);
    },
    onMaxParticipantsChange: (max) => {
      logger.category('admin', `Max participants updated to: ${max}`);
    },
    onParticipantsChange: (newParticipants) => {
      logger.category('admin', `Enhanced manager: Updating participants to ${newParticipants.length}`);
      setParticipants(newParticipants);
    },
    onSessionStarted: () => {
      logger.category('admin', 'Session started notification received');
    },
    onSessionFull: () => {
      logger.category('admin', `Session full detected: ${currentCount}/${maxCount}`);
      if (onSessionFull) {
        onSessionFull();
      }
    },
    enabled: !!currentConversationId
  });

  // Update participants when enhanced manager provides them
  useEffect(() => {
    if (enhancedParticipants && enhancedParticipants.length >= 0) {
      logger.category('admin', `Using enhanced participants: ${enhancedParticipants.length} participants`);
      setParticipants(enhancedParticipants);
    }
  }, [enhancedParticipants, logger]);

  // Log state changes
  useEffect(() => {
    logger.category('admin', 'Host participant state updated:', {
      participantCount: participants.length,
      currentCount,
      maxCount,
      isConnected,
      error: error || null
    });
  }, [participants.length, currentCount, maxCount, isConnected, error, logger]);

  return {
    participants,
    setParticipants,
    isLoadingParticipants: !isConnected,
    currentParticipantCount: currentCount,
    maxParticipantsForSession: maxCount,
    isSessionFull: currentCount >= maxCount && maxCount > 0,
    error,
    forceRefreshParticipants: refresh,
    retryCount: 0 // Enhanced manager handles retries internally
  };
}
