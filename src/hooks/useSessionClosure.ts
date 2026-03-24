
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSessionClosureValidation } from './session-closure/useSessionClosureValidation';
import { useSessionClosureExecution } from './session-closure/useSessionClosureExecution';
import { useReportDownloader } from './session-closure/useReportDownloader';

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
  const [closureProgress, setClosureProgress] = useState<string>('');
  const [closureResult, setClosureResult] = useState<SessionClosureResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { validateSessionClosure } = useSessionClosureValidation();
  const { executeSessionClosure } = useSessionClosureExecution();
  const { downloadReport: downloadReportFile } = useReportDownloader();

  const closeSessionAndGenerateReport = async (conversationId: number) => {
    setIsClosing(true);
    setClosureProgress('Initializing session closure...');

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
      setTimeout(() => {
        navigate('/past-workshops', { replace: true });
      }, 1000);

      return true;
    } catch (error) {
      console.error('💥 Error in closeSessionAndGenerateReport:', error);
      
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

  const downloadReport = (format: 'json' | 'text' = 'text') => {
    downloadReportFile(closureResult, format);
  };

  return {
    isClosing,
    closureProgress,
    closureResult,
    closeSessionAndGenerateReport,
    downloadReport
  };
};
