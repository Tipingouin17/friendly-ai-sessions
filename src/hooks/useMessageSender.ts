
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Message } from "@/types/chat";
import { participantColors } from "@/utils/sessionHelpers";
import { useMessageSaver } from "./messageSender/useMessageSaver";
import { useFacilitatorResponse } from "./messageSender/useFacilitatorResponse";
import { useEnhancedSessionLogger } from "./useEnhancedSessionLogger";

type UseMessageSenderProps = {
  currentConversationId: number | null;
  sessionState: {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    inputMessage: string;
    setInputMessage: (message: string) => void;
    currentParticipant: number;
    recordResponse: (participantId: number, hasResponded: boolean) => void;
    totalResponses: number;
    hasAnswered: boolean;
    viewMode: "participant" | "admin";
  };
  participants: any[];
  isAnonymous: boolean;
  conversation: any;
};

export const useMessageSender = ({
  currentConversationId,
  sessionState,
  participants,
  isAnonymous,
  conversation
}: UseMessageSenderProps) => {
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const requestInProgressRef = useRef(false);
  
  // Import our helper hooks
  const { saveUserMessage } = useMessageSaver();
  const { requestFacilitatorResponse } = useFacilitatorResponse();
  const { logMessageSent, logAIResponse, logPerformanceMetric } = useEnhancedSessionLogger();
  
  const handleSendMessage = useCallback(async () => {
    // Prevent duplicate sends
    if (requestInProgressRef.current || isWaitingForResponse || !currentConversationId) {
      console.log("Request already in progress or missing conversation ID, ignoring duplicate send");
      return;
    }
    
    // Block sending in admin mode
    if (sessionState.viewMode === "admin") return;
    
    // Don't send empty messages
    if (!sessionState.inputMessage.trim()) return;

    const currentParticipant = sessionState.currentParticipant;
    const currentParticipantKey = `P${currentParticipant}`;
    const participantInfo = participants.find(p => p.id === currentParticipant);
    const messageStartTime = performance.now();
    
    console.log("Sending message with participant info:", {
      currentParticipant,
      currentParticipantKey,
      participantInfo,
      message: sessionState.inputMessage
    });
    
    try {
      requestInProgressRef.current = true;
      
      // Save user message
      const newMessage = await saveUserMessage({
        message: sessionState.inputMessage,
        currentConversationId,
        currentParticipant,
        participantInfo,
        isAnonymous,
        color: participantColors[currentParticipantKey] || "#CCCCCC"
      });

      // Log message sent event
      logMessageSent(
        currentConversationId,
        currentParticipant,
        sessionState.inputMessage.length,
        isAnonymous ? 'anonymous' : 'named'
      );

      // Update UI
      sessionState.setMessages(prev => [...prev, newMessage]);
      const sentMessage = sessionState.inputMessage;
      sessionState.setInputMessage("");
      
      // Record that this participant has responded
      sessionState.recordResponse(currentParticipant, true);
      
      // Log message processing time
      const messageProcessTime = performance.now() - messageStartTime;
      logPerformanceMetric(
        currentConversationId,
        'message_processing_time',
        messageProcessTime,
        { participant_id: currentParticipant, message_length: sentMessage.length }
      );
      
      // Check if we need a facilitator response
      const totalParticipants = conversation?.participants ?? 1;
      const updatedTotalResponses = sessionState.totalResponses + 1;
      
      console.log("Total expected participants:", totalParticipants);
      console.log("Current total responses:", updatedTotalResponses);
      console.log("Single participant check:", totalParticipants <= 1);
      console.log("All participants responded check:", updatedTotalResponses >= totalParticipants);
      
      if (totalParticipants <= 1 || updatedTotalResponses >= totalParticipants) {
        setIsWaitingForResponse(true);
        const aiStartTime = performance.now();

        try {
          // Get facilitator response
          const aiResponse = await requestFacilitatorResponse(
            currentConversationId, 
            sessionState.messages,
            conversation
          );
          
          const aiEndTime = performance.now();
          const aiResponseTime = aiEndTime - aiStartTime;
          
          // Log AI response metrics
          logAIResponse(
            currentConversationId,
            aiResponseTime,
            'ai', // Assuming AI method, could be enhanced to detect actual method
            undefined // Token count not available here
          );
          
          // Add AI response to UI
          sessionState.setMessages(prev => [...prev, aiResponse]);
        } finally {
          setIsWaitingForResponse(false);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      toast({
        title: "Error sending message",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      requestInProgressRef.current = false;
    }
  }, [
    isWaitingForResponse, 
    sessionState, 
    currentConversationId, 
    participants, 
    isAnonymous, 
    conversation?.participants,
    conversation?.sessions?.facilitator_details?.profile_picture,
    conversation?.sessions?.facilitator_details?.id,
    toast,
    saveUserMessage,
    requestFacilitatorResponse,
    logMessageSent,
    logAIResponse,
    logPerformanceMetric
  ]);

  return {
    isWaitingForResponse,
    handleSendMessage,
    error
  };
};
