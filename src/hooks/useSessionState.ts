
import { useState, useEffect } from "react";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface UseSessionStateProps {
  conversationId: number | null;
  welcomeMessage?: string;
}

export const useSessionState = ({ conversationId, welcomeMessage }: UseSessionStateProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState(1);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [participantMessages, setParticipantMessages] = useState<{[key: string]: string}>({});
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (welcomeMessage && !welcomeMessageSent) {
      setMessages([{
        id: Date.now().toString(),
        content: welcomeMessage,
        sender: "assistant",
        timestamp: new Date(),
      }]);
      setWelcomeMessageSent(true);
    }
  }, [welcomeMessage, welcomeMessageSent]);

  const handleGenerateReport = async () => {
    if (!conversationId) return;
    
    setIsGeneratingReport(true);
    try {
      const response = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages,
          conversationId,
          generateReport: true
        }
      });

      if (response.error) throw new Error(response.error.message || 'Failed to generate report');
      if (!response.data) throw new Error('No response data received');

      const reportResponse: Message = {
        id: response.data.id || Date.now().toString(),
        content: response.data.content,
        sender: "assistant",
        timestamp: new Date(),
        isReport: true
      };
      
      setMessages(prev => [...prev, reportResponse]);
      
      toast({
        title: "Report Generated",
        description: "The conversation report has been generated successfully.",
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return {
    messages,
    setMessages,
    currentParticipant,
    setCurrentParticipant,
    inputMessage,
    setInputMessage,
    isRecording,
    setIsRecording,
    participantMessages,
    setParticipantMessages,
    isGeneratingReport,
    handleGenerateReport
  };
};
