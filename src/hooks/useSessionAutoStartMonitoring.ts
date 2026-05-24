/**
 * use Session Auto Start Monitoring
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useCallback, useRef } from 'react';
import { Message } from '@/types/chat';

interface UseSessionAutoStartMonitoringProps {
  conversationId: number | null;
  conversation: any;
  participants: any[];
  onSessionStarted?: () => void;
  onAIMessageGenerated?: (message: Message) => void;
  isHost?: boolean;
}

export const useSessionAutoStartMonitoring = ({
  conversationId,
  conversation,
  participants,
  onSessionStarted,
  onAIMessageGenerated,
  isHost = false
}: UseSessionAutoStartMonitoringProps) => {
  const lastProcessedCountRef = useRef<number>(0);
  const sessionStartProcessingRef = useRef<boolean>(false);

  const handleSessionAutoStart = useCallback(async () => {
    if (!conversationId || !conversation || sessionStartProcessingRef.current) return;

    const currentCount = conversation.current_participants || 0;
    const maxCount = conversation.participants || 0;
    const sessionStarted = conversation.session_started;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [conversationId, conversation, participants, onSessionStarted, isHost]);

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
