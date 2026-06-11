/**
 * use Session Closure
 *
 * Hook for the AIfacilitator application.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSessionClosureValidation } from './session-closure/useSessionClosureValidation';
import { useSessionClosureExecution } from './session-closure/useSessionClosureExecution';
import { useReportDownloader } from './session-closure/useReportDownloader';
import api from "@/lib/api";
import { calculateCanonicalSessionDurationMinutes, calculateEngagementScore } from '@/utils/sessionLifecycle';

interface SessionClosureResult {
  reportId: string;
  reportContent: string;
  sessionData: {
    participantCount: number;
    messageCount: number;
    duration: number;
    engagementScore: number;
  };
}

export const useSessionClosure = () => {
  const [isClosing, setIsClosing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [closureProgress, setClosureProgress] = useState<string>('');
  const [closureResult, setClosureResult] = useState<SessionClosureResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { validateSessionClosure } = useSessionClosureValidation();
  const { executeSessionClosure } = useSessionClosureExecution();
  const { downloadReport: downloadReportFile } = useReportDownloader();

  /** Close session AND generate AI report (existing behaviour). */
  const closeSessionAndGenerateReport = async (conversationId: number) => {
    setIsClosing(true);
    setClosureProgress('Initializing session closure...');

    // 30-second timeout guard — prevents infinite spinner if backend is slow/sleeping
    const timeoutId = setTimeout(() => {
      setIsClosing(false);
      setClosureProgress('');
      toast({
        title: "Request Timed Out",
        description: "The server took too long to respond. The backend may be waking up — please try again in a few seconds.",
        variant: "destructive",
      });
    }, 30000);

    try {
      // Step 1-3: Validation
      setClosureProgress('Validating session permissions...');
      const { user } = await validateSessionClosure(conversationId);

      // Step 4: Execute closure
      setClosureProgress('Closing session and generating report...');
      const data = await executeSessionClosure(conversationId, user.id);
      
      setClosureResult(data);
      setClosureProgress('Session closed successfully!');

      // Step 5: Final cleanup and navigation
      setClosureProgress('Updating dashboard...');
      
      // Additional query invalidation for safety
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-workshops'] });
      queryClient.invalidateQueries({ queryKey: ['past-workshops'] });

      toast({
        title: "Session Closed Successfully",
        description: `Report generated with ${data.sessionData.messageCount} messages from ${data.sessionData.participantCount} participants`,
      });

      // Ensure navigation happens
      clearTimeout(timeoutId);
      setTimeout(() => {
        navigate('/past-workshops', { replace: true });
      }, 1000);

      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error in closeSessionAndGenerateReport:', error);
      
      let errorMessage = "Failed to close session and generate report";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setClosureProgress('');
      
      toast({
        title: "Error Closing Session",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsClosing(false);
      setTimeout(() => setClosureProgress(''), 3000);
    }
  };

  /**
   * Stop session immediately WITHOUT generating a report.
   * Marks the conversation as ended in the DB and redirects to the dashboard.
   */
  const stopSessionWithoutReport = async (conversationId: number) => {
    setIsStopping(true);
    setClosureProgress('Stopping session...');

    // 30-second timeout guard
    const timeoutId = setTimeout(() => {
      setIsStopping(false);
      setClosureProgress('');
      toast({
        title: "Request Timed Out",
        description: "The server took too long to respond. The backend may be waking up — please try again in a few seconds.",
        variant: "destructive",
      });
    }, 30000);

    try {
      // Reuse the same validation (ownership + not-already-ended checks)
      await validateSessionClosure(conversationId);

      // --- Compute session stats before closing ---
      // 1. Fetch the conversation to get created_at for duration calculation
      const { data: convData } = await api
        .from('conversations')
        .select('created_at, session_started_at')
        .eq('id', conversationId)
        .single();

      // 2. Count all messages in this conversation
      const { data: allMessages } = await api
        .from('messages')
        .select('id, role, user_id')
        .eq('conversation_id', conversationId);

      const totalMessages = allMessages?.length ?? 0;
      const userMessages = allMessages?.filter(m => m.role === 'user') ?? [];
      const uniqueRespondents = new Set(userMessages.map(m => m.user_id).filter(Boolean)).size;

      // 3. Count participants
      const { count: participantCount } = await api
        .from('session_participants')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      // 4. Compute engagement score: ratio of participants who sent at least one message
      const activeParticipants = participantCount ?? 0;
      const engagementScore = calculateEngagementScore({
        uniqueRespondents,
        participantCount: activeParticipants,
      });

      // 5. Compute duration from the canonical start timestamp when available.
      // Fall back to created_at for legacy rows that predate session_started_at.
      const now = new Date().toISOString();
      const durationMinutes = calculateCanonicalSessionDurationMinutes({
        startedAt: convData?.session_started_at,
        createdAt: convData?.created_at,
        endedAt: now,
      });

      // The DB has a CHECK (participants >= 1) constraint, so we clamp to minimum 1.
      // A session with 0 registered participants is still valid (host ran it alone).
      const participantsForDb = Math.max(1, activeParticipants);

      // Mark the conversation as ended with all stats
      const { error } = await api
        .from('conversations')
        .update({
          is_session_ended: true,
          ended_at: now,
          total_messages: totalMessages,
          participants: participantsForDb,
          participant_engagement_score: engagementScore,
          session_duration_minutes: durationMinutes,
        })
        .eq('id', conversationId);

      if (error) {
        throw new Error(`Failed to stop session: ${error.message}`);
      }

      setClosureProgress('Session stopped.');

      // Invalidate all relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['active-workshops'] }),
        queryClient.invalidateQueries({ queryKey: ['past-workshops'] }),
        queryClient.invalidateQueries({ queryKey: ['session-participants', conversationId] }),
      ]);

      toast({
        title: "Session Stopped",
        description: "The session has been ended. No report was generated.",
      });

      clearTimeout(timeoutId);
      setTimeout(() => {
        navigate('/past-workshops', { replace: true });
      }, 800);

      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error in stopSessionWithoutReport:', error);

      let errorMessage = "Failed to stop session";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setClosureProgress('');

      toast({
        title: "Error Stopping Session",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsStopping(false);
      setTimeout(() => setClosureProgress(''), 3000);
    }
  };

  const downloadReport = (format: 'json' | 'text' = 'text') => {
    downloadReportFile(closureResult, format);
  };

  return {
    isClosing,
    isStopping,
    closureProgress,
    closureResult,
    closeSessionAndGenerateReport,
    stopSessionWithoutReport,
    downloadReport
  };
};
