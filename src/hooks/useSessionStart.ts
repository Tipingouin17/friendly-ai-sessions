/**
 * use Session Start
 *
 * Hook for the AIfacilitator application.
 */

import { useState } from 'react';
import api from "@/lib/api";
import { useToast } from '@/components/ui/use-toast';
import { createLogger } from '@/utils/debugLogger';

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
      
      // First, mark the session as started in the database
      const dbUpdateStart = performance.now();
      let { error: updateError } = await api
        .from('conversations')
        .update({ 
          session_started: true,
          session_started_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      const updateErrorText = updateError
        ? [updateError.message, updateError.details, updateError.hint, updateError.code].filter(Boolean).join(' ').toLowerCase()
        : '';

      if (updateErrorText.includes('session_started_at') && (updateErrorText.includes('column') || updateErrorText.includes('does not exist'))) {
        logger.warn('session_started_at column is unavailable; falling back to session_started only.');
        ({ error: updateError } = await api
          .from('conversations')
          .update({ 
            session_started: true
          })
          .eq('id', conversationId));
      }
        
      const dbUpdateDuration = performance.now() - dbUpdateStart;
      logger.category('session', `💾 Database update completed in ${dbUpdateDuration.toFixed(2)}ms`);
        
      if (updateError) {
        logger.error('❌ Error updating session_started:', updateError);
        throw updateError;
      }

      logger.category('session', '✅ Session marked as started in database');

      // Generate the initial facilitator welcome message
      logger.category('session', '🤖 Generating initial facilitator welcome message');
      
      const aiRequestStart = performance.now();
      const requestPayload = {
        messages: [], // Empty for initial welcome message
        conversationId: conversationId,
        generateReport: false,
        sessionStart: true // Flag to indicate this is the session start
      };
      
      logger.category('session', '📤 Edge function request payload:', requestPayload);

      const { data: responseData, error: responseError } = await api.functions.invoke(
        'handle-facilitator-response',
        {
          body: requestPayload
        }
      );

      const aiRequestDuration = performance.now() - aiRequestStart;
      logger.category('session', `⚡ Edge function call completed in ${aiRequestDuration.toFixed(2)}ms`);

      if (responseError) {
        logger.error('❌ Error generating welcome message:', {
          error: responseError,
          duration: aiRequestDuration,
          requestPayload
        });
        throw responseError;
      }

      logger.category('session', '✅ Welcome message generated successfully:', {
        responseData,
        contentLength: responseData?.content?.length,
        generationMethod: responseData?.metrics?.generationMethod,
        hasAvatar: !!responseData?.avatar,
        facilitatorContext: responseData?.facilitator_context,
        sessionContext: responseData?.session_context
      });
      
      const totalDuration = performance.now() - startTime;
      logger.category('session', `🎯 Session start completed in ${totalDuration.toFixed(2)}ms total`);
      
      toast({
        title: "Session started",
        description: "The session has been started and participants will receive the welcome message.",
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
