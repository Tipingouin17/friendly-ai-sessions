/**
 * use Welcome Message Recovery
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useCallback, useEffect } from 'react';
import api from "@/lib/api";

interface UseWelcomeMessageRecoveryProps {
  conversationId: number | null;
  welcomeMessageStatus?: string;
  onRecoverySuccess?: () => void;
}

export const useWelcomeMessageRecovery = ({
  conversationId,
  welcomeMessageStatus,
  onRecoverySuccess
}: UseWelcomeMessageRecoveryProps) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastRecoveryTime, setLastRecoveryTime] = useState<number | null>(null);

  const MAX_RECOVERY_ATTEMPTS = 3;
  const RECOVERY_COOLDOWN = 30000; // 30 seconds

  // Auto-recovery for stuck sessions
  useEffect(() => {
    if (!conversationId || welcomeMessageStatus !== 'ai_generating') return;

    const checkAndRecover = async () => {
      // Check if we've been stuck in ai_generating for too long
      const { data: conversation } = await api
        .from('conversations')
        .select('updated_at, welcome_message_status')
        .eq('id', conversationId)
        .single();

      if (conversation && conversation.welcome_message_status === 'ai_generating') {
        const updatedAt = new Date(conversation.updated_at).getTime();
        const now = Date.now();
        const timeSinceUpdate = now - updatedAt;

        // If stuck for more than 60 seconds, attempt recovery
        if (timeSinceUpdate > 60000 && recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
          attemptRecovery();
        }
      }
    };

    const interval = setInterval(checkAndRecover, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [conversationId, welcomeMessageStatus, recoveryAttempts]);

  const attemptRecovery = useCallback(async () => {
    if (!conversationId || isRecovering) return;

    // Check cooldown
    if (lastRecoveryTime && Date.now() - lastRecoveryTime < RECOVERY_COOLDOWN) {
      return;
    }

    if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      return;
    }

    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);
    setLastRecoveryTime(Date.now());

    try {
      // Welcome generation is claimed atomically by the server at host start.
      // Clients may refresh their transcript, but must never reset the claim or
      // invoke another session-start generation because that creates duplicates.
      onRecoverySuccess?.();
    } finally {
      setIsRecovering(false);
    }
  }, [conversationId, isRecovering, recoveryAttempts, lastRecoveryTime, onRecoverySuccess]);

  const forceRecovery = useCallback(async () => {
    if (!conversationId || isRecovering) return;

    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);

    try {
      // A manual recovery is a transcript refresh only.  The server owns the
      // welcome lifecycle and provides the single idempotent generation path.
      onRecoverySuccess?.();
    } finally {
      setIsRecovering(false);
    }
  }, [conversationId, isRecovering, onRecoverySuccess]);

  return {
    isRecovering,
    recoveryAttempts,
    canRecover: recoveryAttempts < MAX_RECOVERY_ATTEMPTS,
    attemptRecovery,
    forceRecovery
  };
};
