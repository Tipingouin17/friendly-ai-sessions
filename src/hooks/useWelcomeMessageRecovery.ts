
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      const { data: conversation } = await supabase
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
          console.log('🔄 Auto-recovery triggered for stuck welcome message generation');
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
      console.log('⏰ Recovery cooldown active, skipping attempt');
      return;
    }

    if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      console.log('🚫 Max recovery attempts reached');
      return;
    }

    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);
    setLastRecoveryTime(Date.now());

    try {
      console.log(`🔄 Attempting welcome message recovery (attempt ${recoveryAttempts + 1}/${MAX_RECOVERY_ATTEMPTS})`);

      // First, reset the status to pending
      await supabase
        .from('conversations')
        .update({ 
          welcome_message_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Wait a moment for the reset to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to generate the welcome message again
      const { data, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false
        }
      });

      if (error) {
        console.error('❌ Recovery attempt failed:', error);
      } else {
        console.log('✅ Recovery attempt successful:', data);
        setRecoveryAttempts(0); // Reset on success
        if (onRecoverySuccess) {
          onRecoverySuccess();
        }
      }
    } catch (error) {
      console.error('💥 Exception during recovery:', error);
    } finally {
      setIsRecovering(false);
    }
  }, [conversationId, isRecovering, recoveryAttempts, lastRecoveryTime, onRecoverySuccess]);

  const forceRecovery = useCallback(async () => {
    if (!conversationId || isRecovering) return;

    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);

    try {
      console.log('🔧 Force recovery triggered by user');

      // Reset conversation status
      await supabase
        .from('conversations')
        .update({ 
          welcome_message_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Try generation again
      const { data, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false
        }
      });

      if (error) {
        console.error('❌ Force recovery failed:', error);
      } else {
        console.log('✅ Force recovery successful:', data);
        setRecoveryAttempts(0);
        if (onRecoverySuccess) {
          onRecoverySuccess();
        }
      }
    } catch (error) {
      console.error('💥 Exception during force recovery:', error);
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
