
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Message } from "@/types/chat";
import { participantColors } from "@/utils/sessionHelpers";
import { useMessageSaver } from "./messageSender/useMessageSaver";
import { useFacilitatorResponse } from "./messageSender/useFacilitatorResponse";
import { useEnhancedSessionLogger } from "./useEnhancedSessionLogger";
import { useResponseCollection } from "./useResponseCollection";

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
  
  // Add response collection logic
  const totalParticipants = conversation?.participants ?? 1;
  const {
    responseCount,
    isWaitingForResponses,
    allParticipantsResponded,
    currentUserHasResponded,
    startNewResponseCollection,
    recordParticipantResponse,
    stopWaitingForResponses
  } = useResponseCollection({
    totalParticipants,
    currentUserParticipantId: sessionState.currentParticipant
  });

  // Start collecting responses when facilitator asks a question
  const startResponseCollection = useCallback((questionId: string) => {
    if (totalParticipants > 1) {
      startNewResponseCollection(questionId);
    }
  }, [totalParticipants, startNewResponseCollection]);

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
      recordParticipantResponse(currentParticipant);
      
      // Log message processing time
      const messageProcessTime = performance.now() - messageStartTime;
      logPerformanceMetric(
        currentConversationId,
        'message_processing_time',
        messageProcessTime,
        { participant_id: currentParticipant, message_length: sentMessage.length }
      );
      
      console.log("Response collection status:", {
        totalParticipants,
        responseCount: responseCount + 1, // +1 because we just added this response
        allResponded: (responseCount + 1) >= totalParticipants,
        isWaitingForResponses
      });
      
      // Check if we need a facilitator response
      const updatedTotalResponses = sessionState.totalResponses + 1;
      
      // Only trigger facilitator response if all participants have responded OR it's a single participant session
      if (totalParticipants <= 1 || (responseCount + 1) >= totalParticipants) {
        setIsWaitingForResponse(true);
        stopWaitingForResponses(); // Stop the waiting state
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
            'ai',
            undefined
          );
          
          // Add AI response to UI and start new response collection
          sessionState.setMessages(prev => {
            const newMessages = [...prev, aiResponse];
            // Start collecting responses for the new question
            if (totalParticipants > 1 && !aiResponse.isReport) {
              setTimeout(() => startResponseCollection(aiResponse.id), 100);
            }
            return newMessages;
          });
        } finally {
          setIsWaitingForResponse(false);
        }
      }
      // If not all participants have responded, we just wait (the UI will show the waiting indicator)
      
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
    conversation,
    totalParticipants,
    responseCount,
    toast,
    saveUserMessage,
    requestFacilitatorResponse,
    logMessageSent,
    logAIResponse,
    logPerformanceMetric,
    recordParticipantResponse,
    stopWaitingForResponses,
    startResponseCollection
  ]);

  return {
    isWaitingForResponse,
    isWaitingForResponses,
    responseCount,
    totalParticipants,
    currentUserHasResponded,
    handleSendMessage,
    error,
    startResponseCollection
  };
};
