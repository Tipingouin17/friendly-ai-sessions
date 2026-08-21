/**
 * use Session Start
 *
 * Hook for the AIfacilitator application.
 */

import { useState } from 'react';
import api from "@/lib/api";
import { useToast } from '@/components/ui/use-toast';
import { createLogger } from '@/utils/debugLogger';
import { trackFirstRealSessionStarted } from '@/lib/tracking';

interface UseSessionStartProps {
  conversationId: number | null;
  participants: any[];
  conversationData: any;
}

export const useSessionStart = ({
  conversationId,
  participants,
  conversationData
}: UseSessionStartProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();
  const logger = createLogger('SessionStart', 'session');

  const startSession = async () => {
    if (!conversationId || !conversationData) {
      logger.error('Cannot start session: Missing conversation data', {
        conversationId,
        hasConversationData: !!conversationData
      });
      return false;
    }

    setIsStarting(true);
    const startTime = performance.now();

    try {
      logger.category('session', `🚀 Starting session for conversation: ${conversationId} with ${participants.length} participants`);

      // Log session context
      logger.category('session', '📋 Session context:', {
        conversationId,
        participantCount: participants.length,
        facilitatorName: conversationData?.sessions?.facilitator_details?.title,
        sessionObjective: conversationData?.sessions?.objective,
        participantDescription: conversationData?.participant_description,
        language: conversationData?.language
      });

      // One server-owned lifecycle operation commits the room transition and
      // schedules the welcome in the background.  Do not wait for an LLM here:
      // doing so freezes host UI and delays every participant transition.
      const lifecycleStart = performance.now();
      const { data: lifecycleData, error: lifecycleError } = await api.functions.invoke(
        'start-session',
        { body: { conversationId } },
      );
      const lifecycleDuration = performance.now() - lifecycleStart;

      if (lifecycleError || !lifecycleData?.success) {
        logger.error('❌ Error starting server-owned session lifecycle:', {
          error: lifecycleError,
          response: lifecycleData,
          duration: lifecycleDuration,
        });
        throw lifecycleError ?? new Error(lifecycleData?.message || 'Failed to start the session');
      }

      const totalDuration = performance.now() - startTime;
      logger.category('session', `🎯 Session made live in ${totalDuration.toFixed(2)}ms; welcome scheduled server-side`);
      trackFirstRealSessionStarted('session_start');

      toast({
        title: "Session started",
        description: "The room is live. Your facilitator is preparing the welcome message.",
      });

      return true;
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      logger.error('💥 Error starting session:', {
        error,
        duration: totalDuration,
        conversationId,
        participantCount: participants.length,
        stackTrace: error instanceof Error ? error.stack : 'No stack trace'
      });

      toast({
        title: "Error starting session",
        description: "There was a problem starting the session. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsStarting(false);
    }
  };

  return {
    startSession,
    isStarting
  };
};
