/**
 * use Message Sender
 *
 * Hook for the AIfacilitator application.
 */

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
    // Enhanced validation with detailed logging

    // Prevent duplicate sends
    if (requestInProgressRef.current || isWaitingForResponse) {
      return;
    }
    
    // Check for conversation ID
    if (!currentConversationId) {
      console.error("No conversation ID available");
      setError("Session not properly initialized. Please refresh the page.");
      toast({
        title: "Session Error",
        description: "Session not properly initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    // CRITICAL FIX: Always allow message sending for participants
    // Check URL parameters to determine if this is a participant context
    const urlParams = new URLSearchParams(window.location.search);
    const hasParticipantParams = urlParams.has('participantId') || urlParams.has('name');
    const isParticipantContext = hasParticipantParams || sessionState.viewMode === "participant";
    
    // Only block pure admin views without participant context
    if (!isParticipantContext && sessionState.viewMode === "admin" && !hasParticipantParams) {
      return;
    }
    
    // Don't send empty messages
    if (!sessionState.inputMessage.trim()) {
      return;
    }

    const currentParticipant = sessionState.currentParticipant;
    const currentParticipantKey = String(currentParticipant);
    const participantInfo = participants.find(p => p.id === currentParticipant);
    const messageStartTime = performance.now();
    
    try {
      requestInProgressRef.current = true;
      setError(null); // Clear any previous errors
      
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

      // Update UI immediately
      sessionState.setMessages(prev => [...prev, newMessage]);
      const sentMessage = sessionState.inputMessage;
      
      // CRITICAL: Clear the input field immediately after sending
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
      
      // For single participant sessions, ALWAYS trigger AI response immediately
      // For multi-participant sessions, wait until all have responded
      const shouldTriggerAIResponse = totalParticipants <= 1 || (responseCount + 1) >= totalParticipants;
      
      if (shouldTriggerAIResponse) {
        setIsWaitingForResponse(true);
        stopWaitingForResponses(); // Stop the waiting state
        const aiStartTime = performance.now();

        try {
          // Get facilitator response with updated messages including the new participant message
          const updatedMessages = [...sessionState.messages, newMessage];
          
          const aiResponse = await requestFacilitatorResponse(
            currentConversationId, 
            updatedMessages,
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
        } catch (aiError) {
          console.error("AI Response Error:", aiError);
          setError("Failed to get facilitator response. Please try again.");
          toast({
            title: "AI Response Error",
            description: "Failed to get facilitator response. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsWaitingForResponse(false);
        }
      } else { /* no-op */ }
      
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
