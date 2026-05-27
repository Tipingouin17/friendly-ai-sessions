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

    // The redesigned waiting room requires an explicit host action to start.
    // Reaching full capacity must not invoke host or participant start callbacks,
    // because those callbacks can flip local UI state or generate facilitator output
    // before the host clicks Start Session.
    if (currentCount >= maxCount && maxCount > 0 && !sessionStarted) {
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [conversationId, conversation, participants]);

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
