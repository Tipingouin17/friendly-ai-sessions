
import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { useWelcomeMessageRecovery } from '@/hooks/useWelcomeMessageRecovery';

interface UseMessageFetchingProps {
  conversationId: number | null;
  isAdmin: boolean;
  conversation?: any;
  totalParticipants: number;
}

// Polling interval in milliseconds
const POLLING_INTERVAL = 3000;

export const useMessageFetching = ({
  conversationId,
  isAdmin,
  conversation,
  totalParticipants
}: UseMessageFetchingProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGeneratingWelcome, setIsGeneratingWelcome] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isWaitingForResponses, setIsWaitingForResponses] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const [welcomeMessageStatus, setWelcomeMessageStatus] = useState<string>('pending');

  const welcomeGeneratedRef = useRef(false);
  const autoStartProcessedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationIdRef = useRef<number | null>(null);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Welcome message recovery hook
  const { isRecovering, attemptRecovery, forceRecovery } = useWelcomeMessageRecovery({
    conversationId,
    welcomeMessageStatus,
    onRecoverySuccess: () => {
      fetchMessagesFromDB();
    }
  });

  // Core message fetching function - always fetches from DB
  const fetchMessagesFromDB = useCallback(async () => {
    const cId = conversationIdRef.current;
    if (!cId) return;

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', cId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      const formattedMessages: Message[] = (messagesData || []).map(msg => ({
        id: msg.id.toString(),
        content: typeof msg.content === 'string' ? msg.content : (msg.content && typeof msg.content === 'object' && 'text' in msg.content ? String(msg.content.text) : ''),
        sender: msg.role === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date(msg.created_at),
        participant: msg.participant_id ? `P${msg.participant_id}` : undefined,
        name: msg.name || undefined,
        avatar: typeof msg.content === 'object' && msg.content && !Array.isArray(msg.content) && 'avatar' in msg.content ? String(msg.content.avatar) : undefined,
        role: msg.role || 'user'
      }));

      // Only update state if messages actually changed
      const currentIds = messagesRef.current.map(m => m.id).join(',');
      const newIds = formattedMessages.map(m => m.id).join(',');
      
      if (currentIds !== newIds) {
        setMessages(formattedMessages);
      }

      // Check if we have a welcome message
      const hasWelcomeMessage = formattedMessages.some(msg => msg.sender === 'assistant');
      if (hasWelcomeMessage) {
        setWelcomeMessageStatus('ai_ready');
        setIsGeneratingWelcome(false);
        welcomeGeneratedRef.current = true;
      }

    } catch (error) {
      console.error('Exception fetching messages:', error);
    }
  }, []); // No dependencies - uses ref for conversationId

  // Polling: set up and tear down based on conversationId
  useEffect(() => {
    // Update the ref
    conversationIdRef.current = conversationId;
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!conversationId) return;

    // Reset state for new conversation
    setMessages([]);
    setWelcomeMessageStatus('pending');
    setIsGeneratingWelcome(false);
    welcomeGeneratedRef.current = false;
    autoStartProcessedRef.current = false;

    // Initial fetch after a short delay to let state settle
    const initialFetchTimer = setTimeout(() => {
      fetchMessagesFromDB();
    }, 300);

    // Set up polling interval
    pollingRef.current = setInterval(() => {
      fetchMessagesFromDB();
    }, POLLING_INTERVAL);

    return () => {
      clearTimeout(initialFetchTimer);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [conversationId, fetchMessagesFromDB]);

  // Monitor conversation status for welcome message generation
  useEffect(() => {
    if (!conversationId || !conversation) return;

    const currentStatus = conversation.welcome_message_status || 'pending';
    setWelcomeMessageStatus(currentStatus);

    // If session started but no welcome message, trigger generation
    // Handle both 'pending' (no trigger) and 'ai_generating' (DB trigger set it but no edge function listener)
    if (conversation.session_started && (currentStatus === 'pending' || currentStatus === 'ai_generating') && !welcomeGeneratedRef.current && messagesRef.current.length === 0) {
      setIsGeneratingWelcome(true);
      welcomeGeneratedRef.current = true;

      // Trigger AI generation
      supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false
        }
      }).then(async ({ data, error }) => {
        if (error) {
          console.error('Welcome message generation failed:', error);

          // Client-side fallback if Edge Function fails
          try {
            const fallbackContent = "Welcome to the session! I'm your AI facilitator. I'm here to guide the conversation and help you get the most out of our time together. To begin, could everyone please introduce themselves?";

            const { error: insertError } = await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                content: { text: fallbackContent },
                role: 'assistant',
                name: 'Facilitator',
                is_anonymous: false
              });

            if (insertError) {
              console.error('Client-side fallback failed:', insertError);
              setIsGeneratingWelcome(false);
              setTimeout(() => attemptRecovery(), 5000);
            } else {
              setWelcomeMessageStatus('fallback_ready');
              setIsGeneratingWelcome(false);
              welcomeGeneratedRef.current = true;

              // Update conversation status
              await supabase
                .from('conversations')
                .update({ welcome_message_status: 'fallback_ready' })
                .eq('id', conversationId);

              // Force immediate re-fetch
              setTimeout(() => fetchMessagesFromDB(), 500);
            }
          } catch (e) {
            console.error('Exception during client-side fallback:', e);
            setIsGeneratingWelcome(false);
          }
        } else {
          // Edge function succeeded - force immediate re-fetch
          setIsGeneratingWelcome(false);
          setTimeout(() => fetchMessagesFromDB(), 500);
        }
      });
    }

    // Handle different welcome message states
    if (currentStatus === 'ai_ready' || currentStatus === 'fallback_ready') {
      setIsGeneratingWelcome(false);
      if (messagesRef.current.length === 0) {
        fetchMessagesFromDB();
      }
    }
  }, [conversationId, conversation, isGeneratingWelcome, attemptRecovery, fetchMessagesFromDB]);

  // Update response collection status based on messages
  useEffect(() => {
    if (messages.length === 0) {
      setIsWaitingForResponses(false);
      setResponseCount(0);
      return;
    }

    // Find the last assistant message index
    let lastAssistantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'assistant') {
        lastAssistantIndex = i;
        break;
      }
    }

    if (lastAssistantIndex !== -1) {
      // We are in a response collection phase
      setIsWaitingForResponses(true);

      // Count user responses AFTER the last assistant message
      const responses = messages.slice(lastAssistantIndex + 1).filter(m => m.sender === 'user');

      // Count unique participants
      const uniqueRespondents = new Set(responses.map(r => r.participant || r.name)).size;
      setResponseCount(uniqueRespondents);
    } else {
      setIsWaitingForResponses(false);
      setResponseCount(0);
    }
  }, [messages]);

  // Process new messages from realtime (kept for compatibility)
  const processNewMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        return prev;
      }
      const updated = [...prev, message];
      return updated;
    });

    // If this is a welcome message, update status
    if (message.sender === 'assistant' && !welcomeGeneratedRef.current) {
      setWelcomeMessageStatus('ai_ready');
      setIsGeneratingWelcome(false);
      welcomeGeneratedRef.current = true;
    }
  }, []);

  // Generate aggregated response
  const generateAggregatedResponse = useCallback(async () => {
    if (!conversationIdRef.current || isGeneratingResponse) return;

    setIsGeneratingResponse(true);

    try {
      const { data, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: messagesRef.current.map(msg => ({
            role: msg.sender === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          conversationId: conversationIdRef.current,
          sessionStart: false,
          generateReport: false
        }
      });

      if (error) {
        console.error('Error generating facilitator response:', error);
        return;
      }

      // Force immediate re-fetch to get the new response
      setTimeout(() => fetchMessagesFromDB(), 500);

    } catch (error) {
      console.error('Exception generating facilitator response:', error);
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [isGeneratingResponse, fetchMessagesFromDB]);

  // Auto-advance logic: Trigger response when all participants have answered
  const autoAdvanceTriggeredRef = useRef(false);

  useEffect(() => {
    // Reset trigger flag when response count resets (new round)
    if (responseCount === 0) {
      autoAdvanceTriggeredRef.current = false;
    }

    // Check if we should auto-advance
    if (
      isWaitingForResponses &&
      totalParticipants > 0 &&
      responseCount >= totalParticipants &&
      !isGeneratingResponse &&
      !autoAdvanceTriggeredRef.current
    ) {
      autoAdvanceTriggeredRef.current = true;
      generateAggregatedResponse();
    }
  }, [isWaitingForResponses, responseCount, totalParticipants, isGeneratingResponse, generateAggregatedResponse]);

  return {
    messages,
    setMessages,
    fetchMessages: fetchMessagesFromDB,
    isGeneratingWelcome: isGeneratingWelcome || isRecovering,
    isGeneratingResponse,
    processNewMessage,
    isWaitingForResponses,
    responseCount,
    generateAggregatedResponse,
    welcomeMessageStatus,
    forceRecovery
  };
};
