
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
  const [closureResult, setClosureResult] = useState<SessionClosureResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { validateSessionClosure } = useSessionClosureValidation();
  const { executeSessionClosure } = useSessionClosureExecution();
  const { downloadReport: downloadReportFile } = useReportDownloader();

  const closeSessionAndGenerateReport = async (conversationId: number) => {
    setIsClosing(true);

    try {
      // Step 1-3: Validation
      const { user } = await validateSessionClosure(conversationId);

      // Step 4: Execute closure
      const data = await executeSessionClosure(conversationId, user.id);
      
      setClosureResult(data);

      // Step 5: Invalidate relevant queries to ensure real-time sync
      console.log("🔄 Invalidating queries for real-time sync...");
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-workshops'] });
      queryClient.invalidateQueries({ queryKey: ['past-workshops'] });

      toast({
        title: "Session Closed Successfully",
        description: `Report generated with ${data.sessionData.messageCount} messages from ${data.sessionData.participantCount} participants`,
      });

      return true;
    } catch (error) {
      console.error('💥 Error in closeSessionAndGenerateReport:', error);
      
      let errorMessage = "Failed to close session and generate report";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error Closing Session",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsClosing(false);
    }
  };

  const downloadReport = (format: 'json' | 'text' = 'text') => {
    downloadReportFile(closureResult, format);
  };

  return {
    isClosing,
    closureResult,
    closeSessionAndGenerateReport,
    downloadReport
  };
};
