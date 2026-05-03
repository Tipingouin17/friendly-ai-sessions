/**
 * use Host Messages
 *
 * Hook for the AIfacilitator application.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Message, ParticipantInfo } from "@/types/chat";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useMessageFetching } from "./session-messages/useMessageFetching";
import { useResponseAggregation } from "./session-messages/useResponseAggregation";
import { useOptimizedRealtimeConnection } from "./useOptimizedRealtimeConnection";
import { useSessionAutoStartMonitoring } from './useSessionAutoStartMonitoring';
import { useParticipantStatusTracker } from './useParticipantStatusTracker';

interface UseHostMessagesProps {
  conversationId: number | null;
  participants: ParticipantInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationData: any;
}

export const useHostMessages = ({
  conversationId,
  participants,
  messages,
  setMessages,
  conversationData
}: UseHostMessagesProps) => {
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [conversationState, setConversationState] = useState(conversationData);
  const sessionStateRef = useRef(conversationData);
  const { toast } = useToast();
  const welcomeGeneratedRef = useRef<boolean>(false);
  const autoStartHandledRef = useRef<boolean>(false);

  // Update refs when props change
  useEffect(() => {
    if (conversationData) {
      setConversationState(conversationData);
      sessionStateRef.current = conversationData;
    }
  }, [conversationData]);

  // Reactive state for the last assistant message ID.
  // useParticipantStatusTracker depends on this value to reset 'skipped' statuses
  // whenever a new AI question arrives. Using state (not ref) ensures the tracker
  // re-runs reactively when the value changes.
  const [lastAssistantMessageId, setLastAssistantMessageId] = useState<string | null>(null);

  // Track paused/skipped participants for response counting.
  // lastAssistantMessageId resets all 'skipped' statuses when a new AI question arrives.
  const { excludedParticipantIds, skippedParticipantIds } = useParticipantStatusTracker({
    conversationId,
    lastAssistantMessageId,
  });

  const {
    messages: fetchedMessages,
    fetchMessages,
    isGeneratingWelcome,
    processNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse,
    forceRecovery
  } = useMessageFetching({
    conversationId,
    isAdmin: true,
    conversation: conversationState,
    totalParticipants: participants.length,
    excludedParticipantIds,
    skippedParticipantIds,
  });

  // Sync messages from useMessageFetching back to the parent's state
  useEffect(() => {
    if (fetchedMessages && fetchedMessages.length > 0) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages, setMessages]);

  // Keep lastAssistantMessageId in sync with fetchedMessages so that
  // useParticipantStatusTracker resets 'skipped' statuses on each new AI question.
  useEffect(() => {
    if (!fetchedMessages || fetchedMessages.length === 0) return;
    for (let i = fetchedMessages.length - 1; i >= 0; i--) {
      if (fetchedMessages[i].sender === 'assistant') {
        const newId = fetchedMessages[i].id;
        setLastAssistantMessageId(prev => (prev !== newId ? newId : prev));
        break;
      }
    }
  }, [fetchedMessages]);

  const {
    recordParticipantResponse,
    startResponseCollection
  } = useResponseAggregation({
    conversationId,
    totalParticipants: participants.length,
    conversation: conversationState
  });

  // Enhanced immediate welcome generation for auto-started sessions
  const triggerImmediateWelcomeGeneration = useCallback(async () => {
    if (!conversationId || welcomeGeneratedRef.current || !conversationState) {
      return;
    }

    welcomeGeneratedRef.current = true;

    // The message fetching hook will handle the actual generation
    // We just need to trigger it by updating the conversation state
    if (conversationState.session_started && !conversationState.welcome_message_status) { /* no-op */ }
  }, [conversationId, conversationState]);

  // Handle conversation updates from realtime with enhanced auto-start detection
  const handleConversationUpdate = useCallback((payload: any) => {

    if (payload.new) {
      const updatedConversation = { ...sessionStateRef.current, ...payload.new };
      setConversationState(updatedConversation);
      sessionStateRef.current = updatedConversation;

      // Enhanced session start detection with immediate AI generation
      if (payload.new.session_started && !payload.old?.session_started && !autoStartHandledRef.current) {
        autoStartHandledRef.current = true;

        // Trigger immediate AI welcome generation
        setTimeout(() => {
          triggerImmediateWelcomeGeneration();
        }, 500); // Small delay to ensure conversation state is updated
      }
    }
  }, [triggerImmediateWelcomeGeneration]);

  // Handle participant changes
  const handleParticipantChange = useCallback((payload: any) => {
    // Participant updates are handled by the parent component
  }, []);

  // Enhanced session event handling with immediate AI generation
  const handleSessionEvent = useCallback((payload: any) => {

    if (payload.new?.event_type === 'session_auto_started' && !autoStartHandledRef.current) {
      autoStartHandledRef.current = true;

      setTimeout(() => {
        triggerImmediateWelcomeGeneration();
      }, 500);
    }
  }, [triggerImmediateWelcomeGeneration]);

  // Set up optimized realtime connection
  useOptimizedRealtimeConnection({
    conversationId,
    onConversationUpdate: handleConversationUpdate,
    onParticipantChange: useCallback((payload: any) => { /* no-op */ }, []),
    onSessionEvent: useCallback((payload: any) => {

      if (payload.new?.event_type === 'session_auto_started' && !autoStartHandledRef.current) {
        autoStartHandledRef.current = true;

        setTimeout(() => {
          triggerImmediateWelcomeGeneration();
        }, 500);
      }
    }, [triggerImmediateWelcomeGeneration]),
    isHost: true
  });

  // Enhanced auto-start monitoring with immediate AI generation
  const { isProcessingAutoStart } = useSessionAutoStartMonitoring({
    conversationId,
    conversation: conversationState,
    participants,
    onSessionStarted: () => {
      if (!autoStartHandledRef.current) {
        autoStartHandledRef.current = true;
        setTimeout(() => {
          triggerImmediateWelcomeGeneration();
        }, 500);
      }
    },
    isHost: true
  });

  // Enhanced session start state monitoring for immediate welcome generation
  useEffect(() => {
    if (conversationState?.session_started && !welcomeGeneratedRef.current && !autoStartHandledRef.current) {

      // Check if we need to generate welcome message
      if (messages.length === 0) {
        autoStartHandledRef.current = true;
        setTimeout(() => {
          triggerImmediateWelcomeGeneration();
        }, 500);
      }
    }
  }, [conversationState?.session_started, messages.length, triggerImmediateWelcomeGeneration]);

  // Reset flags when conversation changes
  useEffect(() => {
    welcomeGeneratedRef.current = false;
    autoStartHandledRef.current = false;
  }, [conversationId]);

  const toggleSessionState = useCallback(() => {
    setIsSessionPaused(prev => !prev);
  }, []);

  const handleHostMessage = useCallback((message: string) => {
    // Implementation for host messages
  }, []);

  const handleSendHostMessage = useCallback(async (message: string, isPinned = false, recipientId?: string) => {
    if (!conversationId || !message.trim()) return;

    // Optimistically add to local state so the host sees it immediately
    const optimisticMsg: Message = {
      id: `host-${Date.now()}`,
      content: message,
      sender: 'admin',
      timestamp: new Date(),
      isPinned,
      recipientId,
      isAdminMessage: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { error } = await api
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: { text: message, isPinned, recipientId },
          role: 'admin',
          name: 'Host',
        });

      if (error) {
        console.error('[HOST] Error sending message:', error);
        toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
        // Roll back optimistic update
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      } else {
        toast({
          title: 'Message sent',
          description: recipientId
            ? 'Your message has been sent to the selected participant'
            : 'Your message has been sent to all participants',
        });
      }
    } catch (e) {
      console.error('[HOST] Exception sending message:', e);
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  }, [conversationId, setMessages, toast]);

  const triggerFacilitatorResponse = useCallback(async (hostInstruction?: string) => {
    try {
      await generateAggregatedResponse(hostInstruction);
    } catch (error) {
      console.error('[HOST] Error generating facilitator response:', error);
    }
  }, [generateAggregatedResponse]);

  return {
    isSessionPaused,
    toggleSessionState,
    handleHostMessage,
    handleSendHostMessage,
    responseCount,
    isWaitingForResponses,
    totalParticipants: participants.length,
    triggerFacilitatorResponse,
    isGeneratingWelcome,
    isGeneratingResponse,
    isProcessingAutoStart,
    forceRecovery
  };
};
