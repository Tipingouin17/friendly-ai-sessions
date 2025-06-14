
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  const closeSessionAndGenerateReport = async (conversationId: number) => {
    if (!conversationId) {
      console.error("No conversation ID provided to closeSessionAndGenerateReport");
      toast({
        title: "Error",
        description: "No conversation ID provided",
        variant: "destructive"
      });
      return false;
    }

    setIsClosing(true);
    console.log("Starting session closure process for conversation:", conversationId);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("User authentication error:", userError);
        throw new Error('User not authenticated');
      }

      console.log('Calling edge function to close session and generate report...');

      const { data, error } = await supabase.functions.invoke('close-session-and-generate-report', {
        body: {
          conversationId,
          userId: user.id
        }
      });

      console.log("Edge function response:", { data, error });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || 'Failed to close session and generate report');
      }

      if (!data || !data.success) {
        console.error("Edge function returned unsuccessful result:", data);
        throw new Error(data?.error || 'Failed to process session closure');
      }

      console.log("Session closed successfully:", data);
      setClosureResult(data);

      toast({
        title: "Session Closed Successfully",
        description: `Report generated with ${data.sessionData.messageCount} messages from ${data.sessionData.participantCount} participants`,
      });

      setTimeout(() => {
        navigate('/past-workshops');
      }, 2000);

      return true;
    } catch (error) {
      console.error('Error closing session:', error);
      toast({
        title: "Error Closing Session",
        description: error instanceof Error ? error.message : "Failed to close session and generate report",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsClosing(false);
    }
  };

  const downloadReport = (format: 'json' | 'text' = 'text') => {
    if (!closureResult) {
      toast({
        title: "No Report Available",
        description: "Please close a session first to generate a report",
        variant: "destructive"
      });
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `session-report-${timestamp}`;

    if (format === 'json') {
      const dataStr = JSON.stringify(closureResult, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${filename}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      const dataStr = closureResult.reportContent;
      const dataUri = 'data:text/plain;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${filename}.txt`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }

    toast({
      title: "Report Downloaded",
      description: `Session report downloaded as ${format.toUpperCase()} file`,
    });
  };

  return {
    isClosing,
    closureResult,
    closeSessionAndGenerateReport,
    downloadReport
  };
};
