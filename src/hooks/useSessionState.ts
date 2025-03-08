import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

type UseSessionStateProps = {
  conversationId: number | null;
  welcomeMessage: string | null;
  currentUserParticipantId?: number | null;
};

export function useSessionState({
  conversationId,
  welcomeMessage,
  currentUserParticipantId
}: UseSessionStateProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [participantMessages, setParticipantMessages] = useState<{ [key: string]: string }>({});
  const [currentParticipant, setCurrentParticipant] = useState<number>(currentUserParticipantId || 1);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Enforce that user can only use their assigned participant
  useEffect(() => {
    if (currentUserParticipantId) {
      setCurrentParticipant(currentUserParticipantId);
    }
  }, [currentUserParticipantId]);

  // Add welcome message if present
  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      const welcomeId = nanoid();
      setMessages([
        {
          id: welcomeId,
          content: welcomeMessage,
          sender: "assistant",
          createdAt: new Date().toISOString(),
          likes: []
        }
      ]);
    }
  }, [welcomeMessage, messages.length]);

  // Generate session report
  const handleGenerateReport = async () => {
    if (!conversationId) {
      console.error("No conversation ID provided");
      return;
    }

    setIsGeneratingReport(true);
    try {
      // Aggregate all messages into a single string
      const allMessages = messages.map(m => `${m.sender}: ${m.content}`).join('\n');

      // Call the Supabase function to generate the report
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          conversationId: conversationId,
          messages: allMessages
        }
      });

      if (error) {
        console.error("Error generating report:", error);
      } else {
        console.log("Report generated successfully:", data);

        // Add the report to the messages
        const reportId = nanoid();
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: reportId,
            content: data,
            sender: "assistant",
            createdAt: new Date().toISOString(),
            isReport: true,
            likes: []
          }
        ]);
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    participantMessages,
    setParticipantMessages, 
    currentParticipant,
    setCurrentParticipant,
    isRecording,
    setIsRecording,
    handleGenerateReport,
    isGeneratingReport
  };
}
