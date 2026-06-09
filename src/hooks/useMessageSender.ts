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
  const { logMessageSent, logPerformanceMetric, logSessionEvent } = useEnhancedSessionLogger();
  
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

  const getDiagnosticErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  };

  const logParticipantDiagnostic = useCallback((eventType: string, eventData: Record<string, any> = {}) => {
    if (!currentConversationId) return;

    logSessionEvent({
      conversationId: currentConversationId,
      eventType,
      participantId: sessionState.currentParticipant,
      eventData: {
        diagnostic_scope: 'participant_message_flow',
        participant_name: participants.find(p => p.id === sessionState.currentParticipant)?.name ?? null,
        ...eventData,
      },
      performanceMetrics: {
        timestamp: performance.now(),
      },
    });
  }, [currentConversationId, logSessionEvent, participants, sessionState.currentParticipant]);

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
    
    // Don't send empty messages. Snapshot the draft before any async work so
    // late speech-recognition events or network latency cannot keep the old
    // answer visible in the participant composer.
    const sentMessage = sessionState.inputMessage.trim();
    if (!sentMessage) {
      return;
    }

    const currentParticipant = sessionState.currentParticipant;
    const currentParticipantKey = String(currentParticipant);
    const participantInfo = participants.find(p => p.id === currentParticipant);
    const messageStartTime = performance.now();
    
    try {
      requestInProgressRef.current = true;
      setError(null); // Clear any previous errors
      
      logParticipantDiagnostic('participant_message_send_started', {
        message_length: sentMessage.length,
        view_mode: sessionState.viewMode,
        participant_context: isParticipantContext ? 'participant' : 'admin',
      });

      // Clear the composer immediately after the participant sends. If the
      // save fails, the catch block restores the draft so no answer is lost.
      sessionState.setInputMessage("");

      // Save user message
      const newMessage = await saveUserMessage({
        message: sentMessage,
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
        sentMessage.length,
        isAnonymous ? 'anonymous' : 'named'
      );

      // Update UI immediately
      sessionState.setMessages(prev => [...prev, newMessage]);
      
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
          logParticipantDiagnostic('participant_continuation_check_started', {
            expected_participants: Math.max(1, totalParticipants),
          });

          const { data: latestMessages, error } = await api
            .from('messages')
            .select('id, role, content, participant_id, name, created_at')
            .eq('conversation_id', currentConversationId)
            .order('created_at', { ascending: true });

          if (error || !Array.isArray(latestMessages) || latestMessages.length === 0) {
            if (error) console.error('Participant continuation check failed:', error);
            logParticipantDiagnostic('participant_continuation_check_failed', {
              stage: 'fetch_latest_messages',
              error_message: error ? getDiagnosticErrorMessage(error) : 'No latest messages returned',
            });
            return;
          }

          const lastMessage = latestMessages[latestMessages.length - 1];
          if (lastMessage?.role === 'assistant') {
            logParticipantDiagnostic('participant_continuation_skipped_assistant_already_replied', {
              latest_message_role: lastMessage.role,
              latest_message_id: lastMessage.id,
            });
            return;
          }

          let lastAssistantIndex = -1;
          for (let i = latestMessages.length - 1; i >= 0; i -= 1) {
            if (latestMessages[i]?.role === 'assistant') {
              lastAssistantIndex = i;
              break;
            }
          }
          if (lastAssistantIndex === -1) {
            logParticipantDiagnostic('participant_continuation_check_failed', {
              stage: 'no_prior_assistant_message',
              message_count: latestMessages.length,
            });
            return;
          }

          const respondentKeys = new Set(
            latestMessages
              .slice(lastAssistantIndex + 1)
              .filter(message => message.role !== 'assistant' && message.role !== 'admin')
              .map(message => message.participant_id ?? message.name)
              .filter(Boolean)
          );
          const expectedParticipants = Math.max(1, totalParticipants);
          if (respondentKeys.size < expectedParticipants) {
            logParticipantDiagnostic('participant_continuation_waiting_for_more_responses', {
              respondent_count: respondentKeys.size,
              expected_participants: expectedParticipants,
              last_assistant_message_index: lastAssistantIndex,
            });
            return;
          }

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

          logParticipantDiagnostic('participant_continuation_triggered', {
            respondent_count: respondentKeys.size,
            expected_participants: expectedParticipants,
            message_count: latestMessages.length,
          });

          const { error: invokeError } = await api.functions.invoke('handle-facilitator-response', {
            body: {
              messages: facilitatorContext,
              conversationId: currentConversationId,
              sessionStart: false,
              generateReport: false,
            },
          });

          if (invokeError) {
            logParticipantDiagnostic('participant_continuation_failed', {
              stage: 'invoke_facilitator_response',
              error_message: getDiagnosticErrorMessage(invokeError),
            });
          } else {
            logParticipantDiagnostic('participant_continuation_completed', {
              respondent_count: respondentKeys.size,
              expected_participants: expectedParticipants,
            });
          }
        } catch (error) {
          console.error('Participant continuation fallback failed:', error);
          logParticipantDiagnostic('participant_continuation_failed', {
            stage: 'unexpected_client_error',
            error_message: getDiagnosticErrorMessage(error),
          });
        } finally {
          continuationInProgressRef.current = false;
        }
      }, 4500);
      
    } catch (error: unknown) {
      sessionState.setInputMessage(sentMessage);
      logParticipantDiagnostic('participant_message_send_failed', {
        stage: 'save_or_update_message',
        message_length: sentMessage.length,
        error_message: getDiagnosticErrorMessage(error),
      });
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
      logParticipantDiagnostic,
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
