
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
      
      console.log("📊 Response collection status:", {
        totalParticipants,
        responseCount,
        responseCountAfterUpdate: responseCount + 1,
        allResponded: (responseCount + 1) >= totalParticipants,
        isWaitingForResponses,
        shouldTriggerAI: totalParticipants <= 1 || (responseCount + 1) >= totalParticipants
      });
      
      // For single participant sessions, ALWAYS trigger AI response immediately
      // For multi-participant sessions, wait until all have responded
      const shouldTriggerAIResponse = totalParticipants <= 1 || (responseCount + 1) >= totalParticipants;
      
      console.log("🤖 AI Response Decision:", {
        shouldTriggerAIResponse,
        reason: totalParticipants <= 1 ? 'single-participant' : 'all-participants-responded',
        totalParticipants,
        currentResponseCount: responseCount + 1
      });
      
      if (shouldTriggerAIResponse) {
        console.log("🚀 Triggering AI facilitator response...");
        setIsWaitingForResponse(true);
        stopWaitingForResponses(); // Stop the waiting state
        const aiStartTime = performance.now();

        try {
          // Get facilitator response with updated messages including the new participant message
          const updatedMessages = [...sessionState.messages, newMessage];
          console.log("📨 Sending to AI:", {
            conversationId: currentConversationId,
            messageCount: updatedMessages.length,
            lastMessage: updatedMessages[updatedMessages.length - 1]?.content?.substring(0, 100)
          });
          
          const aiResponse = await requestFacilitatorResponse(
            currentConversationId, 
            updatedMessages,
            conversation
          );
          
          const aiEndTime = performance.now();
          const aiResponseTime = aiEndTime - aiStartTime;
          
          console.log("✅ AI Response received:", {
            responseTime: aiResponseTime,
            contentLength: aiResponse.content?.length,
            aiResponseId: aiResponse.id
          });
          
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
              console.log("🔄 Starting new response collection for multi-participant session");
              setTimeout(() => startResponseCollection(aiResponse.id), 100);
            }
            return newMessages;
          });
        } catch (aiError) {
          console.error("❌ AI Response Error:", aiError);
          setError("Failed to get facilitator response. Please try again.");
          toast({
            title: "AI Response Error",
            description: "Failed to get facilitator response. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsWaitingForResponse(false);
        }
      } else {
        console.log("⏳ Waiting for more participants to respond before triggering AI");
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
