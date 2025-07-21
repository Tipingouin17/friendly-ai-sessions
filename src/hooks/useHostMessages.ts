
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
  const autoStartHandledRef = useRef<boolean>(false);

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
    isGeneratingResponse,
    forceRecovery
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

  // Enhanced immediate welcome generation for auto-started sessions
  const triggerImmediateWelcomeGeneration = useCallback(async () => {
    if (!conversationId || welcomeGeneratedRef.current || !conversationState) {
      console.log('⚠️ [HOST] Skipping immediate welcome generation:', {
        hasConversationId: !!conversationId,
        alreadyGenerated: welcomeGeneratedRef.current,
        hasConversationState: !!conversationState
      });
      return;
    }

    console.log('🚀 [HOST] Triggering immediate AI welcome generation for auto-started session...');
    welcomeGeneratedRef.current = true;

    // The message fetching hook will handle the actual generation
    // We just need to trigger it by updating the conversation state
    if (conversationState.session_started && !conversationState.welcome_message_status) {
      console.log('🔄 [HOST] Session started, message fetching hook will handle generation');
    }
  }, [conversationId, conversationState]);

  // Handle conversation updates from realtime with enhanced auto-start detection
  const handleConversationUpdate = useCallback((payload: any) => {
    console.log('🔄 [HOST] Enhanced conversation update received:', payload);
    
    if (payload.new) {
      const updatedConversation = { ...sessionStateRef.current, ...payload.new };
      setConversationState(updatedConversation);
      sessionStateRef.current = updatedConversation;
      
      // Enhanced session start detection with immediate AI generation
      if (payload.new.session_started && !payload.old?.session_started && !autoStartHandledRef.current) {
        console.log('🎉 [HOST] Session auto-started - triggering immediate AI welcome generation');
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
    console.log('👥 [HOST] Enhanced participant change:', payload);
    // Participant updates are handled by the parent component
  }, []);

  // Enhanced session event handling with immediate AI generation
  const handleSessionEvent = useCallback((payload: any) => {
    console.log('📋 [HOST] Enhanced session event:', payload);
    
    if (payload.new?.event_type === 'session_auto_started' && !autoStartHandledRef.current) {
      console.log('🚀 [HOST] Auto-start event detected - triggering immediate AI generation');
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
    onParticipantChange: useCallback((payload: any) => {
      console.log('👥 [HOST] Enhanced participant change:', payload);
    }, []),
    onSessionEvent: useCallback((payload: any) => {
      console.log('📋 [HOST] Enhanced session event:', payload);
      
      if (payload.new?.event_type === 'session_auto_started' && !autoStartHandledRef.current) {
        console.log('🚀 [HOST] Auto-start event detected - triggering immediate AI generation');
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
        console.log('🎯 [HOST] Auto-start monitoring detected session start, triggering AI generation...');
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
      console.log('🔍 [HOST] Enhanced session started detected, checking for welcome message generation...');
      
      // Check if we need to generate welcome message
      if (messages.length === 0) {
        console.log('📝 [HOST] No messages found, triggering immediate AI welcome generation...');
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
    isProcessingAutoStart,
    forceRecovery
  };
};
