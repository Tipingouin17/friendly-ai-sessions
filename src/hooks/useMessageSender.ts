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
import { useEnhancedSessionLogger } from "./useEnhancedSessionLogger";
import { useResponseCollection } from "./useResponseCollection";
import api from "@/lib/api";

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
  const continuationInProgressRef = useRef(false);
  
  // Import our helper hooks
  const { saveUserMessage } = useMessageSaver();
  const { logMessageSent, logPerformanceMetric } = useEnhancedSessionLogger();
  
  // Use the live participant array length for accurate multi-participant counting.
  // conversation.participants is a static DB column set at session creation and may be stale.
  // participants.length reflects the actual number of people who have joined.
  const totalParticipants = participants.length > 0 ? participants.length : (conversation?.participants ?? 1);
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
      
      // Primary continuation remains server/host-driven. As a resilience fallback,
      // the participant checks shortly after sending whether all expected answers
      // are present and whether no facilitator message has appeared yet. This keeps
      // single-participant and host-tab-closed sessions from getting stuck.
      window.setTimeout(async () => {
        if (continuationInProgressRef.current || !currentConversationId) return;

        try {
          const { data: latestMessages, error } = await api
            .from('messages')
            .select('id, role, content, participant_id, name, created_at')
            .eq('conversation_id', currentConversationId)
            .order('created_at', { ascending: true });

          if (error || !Array.isArray(latestMessages) || latestMessages.length === 0) {
            if (error) console.error('Participant continuation check failed:', error);
            return;
          }

          const lastMessage = latestMessages[latestMessages.length - 1];
          if (lastMessage?.role === 'assistant') return;

          let lastAssistantIndex = -1;
          for (let i = latestMessages.length - 1; i >= 0; i -= 1) {
            if (latestMessages[i]?.role === 'assistant') {
              lastAssistantIndex = i;
              break;
            }
          }
          if (lastAssistantIndex === -1) return;

          const respondentKeys = new Set(
            latestMessages
              .slice(lastAssistantIndex + 1)
              .filter(message => message.role !== 'assistant' && message.role !== 'admin')
              .map(message => message.participant_id ?? message.name)
              .filter(Boolean)
          );
          if (respondentKeys.size < Math.max(1, totalParticipants)) return;

          continuationInProgressRef.current = true;
          const facilitatorContext = latestMessages.map(message => {
            let content = '';
            if (typeof message.content === 'string') {
              try {
                const parsed = JSON.parse(message.content);
                content = parsed?.text ? String(parsed.text) : message.content;
              } catch {
                content = message.content;
              }
            } else if (message.content && typeof message.content === 'object' && 'text' in message.content) {
              content = String((message.content as { text?: unknown }).text ?? '');
            }

            return {
              role: message.role === 'assistant' ? 'assistant' : 'user',
              content,
            };
          });

          await api.functions.invoke('handle-facilitator-response', {
            body: {
              messages: facilitatorContext,
              conversationId: currentConversationId,
              sessionStart: false,
              generateReport: false,
            },
          });
        } catch (error) {
          console.error('Participant continuation fallback failed:', error);
        } finally {
          continuationInProgressRef.current = false;
        }
      }, 4500);
      
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
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
    logMessageSent,
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
