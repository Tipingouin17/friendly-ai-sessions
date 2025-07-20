
import { useState, useEffect, useRef } from "react";
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
  
  // Debounce rapid updates
  const lastSessionFullCallRef = useRef<number>(0);
  const participantsRef = useRef<ParticipantInfo[]>([]);

  // Use the enhanced host participant manager with stabilized callbacks
  const { 
    isConnected, 
    error, 
    participants: enhancedParticipants,
    currentCount,
    maxCount,
    refresh,
    pollingActive
  } = useEnhancedHostParticipantManager({
    conversationId: currentConversationId,
    onParticipantCountChange: (count) => {
      // Reduce logging frequency to prevent console spam
      if (count !== participantsRef.current.length) {
        logger.category('admin', `Participant count updated to: ${count}`);
      }
    },
    onMaxParticipantsChange: (max) => {
      // Only log when max actually changes
      const currentMax = conversationData?.participants || 0;
      if (max !== currentMax) {
        logger.category('admin', `Max participants updated to: ${max}`);
      }
    },
    onParticipantsChange: (newParticipants) => {
      // Only update if participants actually changed
      const currentParticipantIds = participantsRef.current.map(p => p.id).sort();
      const newParticipantIds = newParticipants.map(p => p.id).sort();
      
      if (JSON.stringify(currentParticipantIds) !== JSON.stringify(newParticipantIds)) {
        logger.category('admin', `Enhanced manager: Updating participants from ${participantsRef.current.length} to ${newParticipants.length}`);
        setParticipants(newParticipants);
        participantsRef.current = newParticipants;
      }
    },
    onSessionStarted: () => {
      logger.category('admin', 'Session started notification received');
    },
    onSessionFull: () => {
      const now = Date.now();
      // Debounce session full calls to prevent rapid firing
      if (now - lastSessionFullCallRef.current > 10000) { // 10 second cooldown
        logger.category('admin', `Session full detected: ${currentCount}/${maxCount}`);
        lastSessionFullCallRef.current = now;
        if (onSessionFull) {
          onSessionFull();
        }
      }
    },
    enabled: !!currentConversationId
  });

  // Update participants ref when enhanced participants change
  useEffect(() => {
    if (enhancedParticipants && enhancedParticipants.length !== participantsRef.current.length) {
      participantsRef.current = enhancedParticipants;
      setParticipants(enhancedParticipants);
    }
  }, [enhancedParticipants]);

  // Log state changes less frequently
  useEffect(() => {
    const logTimeout = setTimeout(() => {
      logger.category('admin', 'Host participant state summary:', {
        participantCount: participants.length,
        currentCount,
        maxCount,
        isConnected,
        pollingActive,
        hasError: !!error
      });
    }, 2000); // Log summary every 2 seconds at most

    return () => clearTimeout(logTimeout);
  }, [participants.length, currentCount, maxCount, isConnected, error, pollingActive, logger]);

  return {
    participants,
    setParticipants,
    isLoadingParticipants: !isConnected && !pollingActive,
    currentParticipantCount: currentCount,
    maxParticipantsForSession: maxCount,
    isSessionFull: currentCount >= maxCount && maxCount > 0,
    error,
    forceRefreshParticipants: refresh,
    retryCount: 0 // Enhanced manager handles retries internally
  };
}
