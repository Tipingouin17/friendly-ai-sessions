
import { useState, useCallback, useEffect, useRef } from "react";
import { Message, ParticipantInfo } from "@/types/chat";
import { useMessageFetching } from "./session-messages/useMessageFetching";
import { useResponseAggregation } from "./session-messages/useResponseAggregation";
import { useOptimizedRealtimeConnection } from "./useOptimizedRealtimeConnection";
import { useSessionAutoStartMonitoring } from "./useSessionAutoStartMonitoring";

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
  const welcomeGeneratedRef = useRef<boolean>(false);

  // Update refs when props change
  useEffect(() => {
    if (conversationData) {
      setConversationState(conversationData);
      sessionStateRef.current = conversationData;
    }
  }, [conversationData]);

  const {
    fetchMessages,
    isGeneratingWelcome,
    processNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    isGeneratingResponse
  } = useMessageFetching({
    conversationId,
    isAdmin: true,
    conversation: conversationState,
    totalParticipants: participants.length
  });

  const {
    recordParticipantResponse,
    startResponseCollection
  } = useResponseAggregation({
    conversationId,
    totalParticipants: participants.length,
    conversation: conversationState
  });

  // Handle conversation updates from realtime
  const handleConversationUpdate = useCallback((payload: any) => {
    console.log('🔄 [HOST] Conversation update received:', payload);
    
    if (payload.new) {
      const updatedConversation = { ...sessionStateRef.current, ...payload.new };
      setConversationState(updatedConversation);
      sessionStateRef.current = updatedConversation;
      
      // Check for session start and trigger immediate welcome message generation
      if (payload.new.session_started && !payload.old?.session_started) {
        console.log('🎉 [HOST] Session started - triggering immediate welcome message generation');
        welcomeGeneratedRef.current = false; // Reset flag to allow generation
        
        // Trigger immediate message fetch to generate welcome message
        setTimeout(() => {
          console.log('🚀 [HOST] Fetching messages for auto-started session...');
          fetchMessages();
        }, 100);
      }
    }
  }, [fetchMessages]);

  // Handle participant changes
  const handleParticipantChange = useCallback((payload: any) => {
    console.log('👥 [HOST] Participant change:', payload);
    // Participant updates are handled by the parent component
  }, []);

  // Handle session events with enhanced auto-start detection
  const handleSessionEvent = useCallback((payload: any) => {
    console.log('📋 [HOST] Session event:', payload);
    
    if (payload.new?.event_type === 'session_auto_started') {
      console.log('🚀 [HOST] Auto-start event detected - triggering welcome message generation');
      welcomeGeneratedRef.current = false; // Reset flag
      
      // Trigger immediate welcome message generation
      setTimeout(() => {
        console.log('🎯 [HOST] Generating welcome message for auto-started session...');
        fetchMessages();
      }, 200);
    }
  }, [fetchMessages]);

  // Set up optimized realtime connection
  useOptimizedRealtimeConnection({
    conversationId,
    onConversationUpdate: handleConversationUpdate,
    onParticipantChange: handleParticipantChange,
    onSessionEvent: handleSessionEvent,
    isHost: true
  });

  // Monitor for auto-start conditions with immediate welcome generation
  const { isProcessingAutoStart } = useSessionAutoStartMonitoring({
    conversationId,
    conversation: conversationState,
    participants,
    onSessionStarted: () => {
      console.log('🎯 [HOST] Session auto-started, triggering immediate welcome generation...');
      welcomeGeneratedRef.current = false; // Reset flag
      
      // Immediate fetch to generate welcome message
      setTimeout(() => {
        console.log('⚡ [HOST] Auto-start welcome message generation triggered');
        fetchMessages();
      }, 100);
    },
    isHost: true
  });

  // Monitor session start state for immediate welcome generation
  useEffect(() => {
    if (conversationState?.session_started && !welcomeGeneratedRef.current) {
      console.log('🔍 [HOST] Session started detected, checking for welcome message generation...');
      welcomeGeneratedRef.current = true;
      
      // Check if we need to generate welcome message
      if (messages.length === 0) {
        console.log('📝 [HOST] No messages found, triggering welcome generation...');
        setTimeout(() => fetchMessages(), 50);
      }
    }
  }, [conversationState?.session_started, messages.length, fetchMessages]);

  const toggleSessionState = useCallback(() => {
    setIsSessionPaused(prev => !prev);
  }, []);

  const handleHostMessage = useCallback((message: string) => {
    console.log('📝 [HOST] Sending host message:', message);
    // Implementation for host messages
  }, []);

  const handleSendHostMessage = useCallback((message: string, isPinned = false, recipientId?: string) => {
    console.log('📤 [HOST] Sending message:', { message, isPinned, recipientId });
    // Implementation for sending host messages
  }, []);

  const triggerFacilitatorResponse = useCallback(async () => {
    console.log('🤖 [HOST] Triggering facilitator response...');
    try {
      await generateAggregatedResponse();
    } catch (error) {
      console.error('❌ [HOST] Error generating facilitator response:', error);
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
    isProcessingAutoStart
  };
};
