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

      // First, reset the status to pending
      await api
        .from('conversations')
        .update({ 
          welcome_message_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Wait a moment for the reset to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to generate the welcome message again
      const { data, error } = await api.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false
        }
      });

      if (error) {
        console.error('Recovery attempt failed:', error);
      } else {
        setRecoveryAttempts(0); // Reset on success
        if (onRecoverySuccess) {
          onRecoverySuccess();
        }
      }
    } catch (error) {
      console.error('Exception during recovery:', error);
    } finally {
      setIsRecovering(false);
    }
  }, [conversationId, isRecovering, recoveryAttempts, lastRecoveryTime, onRecoverySuccess]);

  const forceRecovery = useCallback(async () => {
    if (!conversationId || isRecovering) return;

    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);

    try {

      // Reset conversation status
      await api
        .from('conversations')
        .update({ 
          welcome_message_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Try generation again
      const { data, error } = await api.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false
        }
      });

      if (error) {
        console.error('Force recovery failed:', error);
      } else {
        setRecoveryAttempts(0);
        if (onRecoverySuccess) {
          onRecoverySuccess();
        }
      }
    } catch (error) {
      console.error('Exception during force recovery:', error);
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
