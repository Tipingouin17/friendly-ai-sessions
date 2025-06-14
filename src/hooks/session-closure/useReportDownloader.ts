
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

export const useReportDownloader = () => {
  const { toast } = useToast();

  const downloadReport = (closureResult: SessionClosureResult | null, format: 'json' | 'text' = 'text') => {
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

  return { downloadReport };
};
