/**
 * use Report Generator
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';

type UseReportGeneratorProps = {
  conversationId: number | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
};

export const useReportGenerator = ({
  conversationId,
  messages,
  setMessages
}: UseReportGeneratorProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle generating the session report
  const handleGenerateReport = useCallback(async () => {
    if (!conversationId) {
      console.error('No conversation ID provided for report generation');
      setError('Cannot generate report: session not found');
      return;
    }
    
    setIsGeneratingReport(true);
    
    try {
      
      // Find the last participant message to determine where we are in the conversation
      let lastParticipantMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].sender === 'user') {
          lastParticipantMessageIndex = i;
          break;
        }
      }
      
      // If we have participant messages, use the API endpoint to generate a report
      if (lastParticipantMessageIndex !== -1) {
        const response = await fetch('/api/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const reportData = await response.json();
        
        // Add the report to our messages
        const reportMessage: Message = {
          id: `report-${Date.now()}`,
          content: reportData.report,
          sender: 'assistant',
          timestamp: new Date(),
          created_at: new Date().toISOString(),
          isReport: true
        };
        
        setMessages(prev => [...prev, reportMessage]);
      } else {
        throw new Error('No participant messages found to generate report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError(`Failed to generate session report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [conversationId, messages, setMessages]);
  
  return {
    handleGenerateReport,
    isGeneratingReport,
    error
  };
};
