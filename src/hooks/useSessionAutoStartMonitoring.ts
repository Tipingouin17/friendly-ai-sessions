/**
 * use Session Auto Start Monitoring
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useCallback, useRef } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import { getScheduledStartIso } from '@/services/facilitatorService';

interface AutoStartConversation {
  current_participants?: number | null;
  participants?: number | null;
  session_started?: boolean | null;
  flow_config?: unknown;
}

interface UseSessionAutoStartMonitoringProps {
  conversationId: number | null;
  conversation: AutoStartConversation | null;
  participants: ParticipantInfo[];
  onSessionStarted?: () => void;
  onAIMessageGenerated?: (message: Message) => void;
  isHost?: boolean;
}

export const useSessionAutoStartMonitoring = ({
  conversationId,
  conversation,
  onSessionStarted,
  isHost = false
}: UseSessionAutoStartMonitoringProps) => {
  const lastProcessedCountRef = useRef<number>(0);
  const sessionStartProcessingRef = useRef<boolean>(false);

  const handleSessionAutoStart = useCallback(async () => {
    if (!conversationId || !conversation || sessionStartProcessingRef.current) return;

    const currentCount = conversation.current_participants || 0;
    const maxCount = conversation.participants || 0;
    const sessionStarted = conversation.session_started;
    const isScheduledWaitingRoom = Boolean(getScheduledStartIso(conversation.flow_config)) && !sessionStarted;

    // Scheduled sessions must remain waiting until the host explicitly starts them.
    if (isScheduledWaitingRoom) return;

    // Only process if the count has actually changed
    if (currentCount === lastProcessedCountRef.current) return;
    lastProcessedCountRef.current = currentCount;

    // Check if session should auto-start
    if (currentCount >= maxCount && maxCount > 0 && !sessionStarted) {
      sessionStartProcessingRef.current = true;
      
      try {
        // For host, trigger AI message generation immediately
        if (isHost) {
          // The database trigger will handle setting session_started = true
          // We just need to wait for that update to propagate
          onSessionStarted?.();
        }
        
        // For participants, just notify about session start
        if (!isHost && onSessionStarted) {
          onSessionStarted();
        }
        
      } catch (error) {
        console.error(`[${isHost ? 'HOST' : 'PARTICIPANT'}] Error during session auto-start:`, error);
      } finally {
        // Reset processing flag after a delay
        setTimeout(() => {
          sessionStartProcessingRef.current = false;
        }, 2000);
      }
    }
  }, [conversationId, conversation, onSessionStarted, isHost]);

  // Monitor conversation changes for auto-start
  useEffect(() => {
    if (conversation?.current_participants !== undefined) {
      handleSessionAutoStart();
    }
  }, [conversation?.current_participants, conversation?.session_started, handleSessionAutoStart]);

  return {
    isProcessingAutoStart: sessionStartProcessingRef.current
  };
};
