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
      // End the room through one authenticated, idempotent server operation.
      // This avoids a mobile browser having to complete a sequence of separate
      // reads, count queries, and a generic PATCH before participants can leave.
      const { error } = await api.functions.invoke('stop-session', {
        body: { conversation_id: conversationId },
        // Session stop is intentionally fast, but leave enough headroom for a
        // Railway wake-up while keeping a browser-level fetch abort bounded.
        timeoutMs: 12_000,
      });
      if (error) throw new Error(error.message || 'Failed to stop session');

      setClosureProgress('Session stopped.');

      // Cache refresh is best effort. The server has already atomically ended
      // the session; a stale query or transient network failure must never turn
      // that successful closure into an alarming “failed to fetch” UI error.
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['active-workshops'] }),
        queryClient.invalidateQueries({ queryKey: ['past-workshops'] }),
        queryClient.invalidateQueries({ queryKey: ['session-participants', conversationId] }),
      ]).then((results) => {
        if (results.some((result) => result.status === 'rejected')) {
          console.warn('Some post-stop cache refreshes failed; the session is already closed on the server.');
        }
      });

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

      let errorMessage = "The session could not be stopped. Please try again.";
      if (error instanceof Error) {
        errorMessage = /failed to fetch|abort|timed out/i.test(error.message)
          ? 'The connection to the session service was interrupted. Please wait a few seconds and try again.'
          : error.message;
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
