
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
  const [pendingResponses, setPendingResponses] = useState<{ [key: number]: boolean }>({});
  const [totalResponses, setTotalResponses] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [viewMode, setViewMode] = useState<"participant" | "admin">("participant");
  
  // Ensure current participant is locked to their assigned ID
  const currentParticipant = currentUserParticipantId || 1;

  // Add welcome message if present
  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      const welcomeId = nanoid();
      setMessages([
        {
          id: welcomeId,
          content: welcomeMessage,
          sender: "assistant",
          timestamp: new Date(),
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
            timestamp: new Date(),
            isReport: true,
            likes: []
          }
        ]);
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Record a response to a facilitator question
  const recordResponse = (participantId: number, hasResponded: boolean) => {
    console.log("Recording response for participant:", participantId, "with hasResponded:", hasResponded);
    
    setPendingResponses(prev => {
      const newResponses = {
        ...prev,
        [participantId]: hasResponded
      };
      console.log("New pending responses:", newResponses);
      return newResponses;
    });
    
    if (hasResponded && participantId === currentParticipant) {
      setHasAnswered(true);
    }
  };
  
  // Update total responses count based on pendingResponses
  useEffect(() => {
    const count = Object.values(pendingResponses).filter(Boolean).length;
    console.log("Updating total responses count to:", count);
    setTotalResponses(count);
  }, [pendingResponses]);

  // Reset answer state when a new facilitator message arrives
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.sender === "assistant" && !latestMessage.isReport) {
      console.log("New facilitator message detected, resetting response state");
      setHasAnswered(false);
      setPendingResponses({});
      setTotalResponses(0);
    }
  }, [messages]);

  return {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    currentParticipant,
    isRecording,
    setIsRecording,
    handleGenerateReport,
    isGeneratingReport,
    recordResponse,
    totalResponses,
    hasAnswered,
    pendingResponses,
    viewMode,
    setViewMode
  };
}
