
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

  const fetchInProgressRef = useRef(false);
  const welcomeGeneratedRef = useRef(false);
  const autoStartProcessedRef = useRef(false);

  // Welcome message recovery hook
  const { isRecovering, attemptRecovery, forceRecovery } = useWelcomeMessageRecovery({
    conversationId,
    welcomeMessageStatus,
    onRecoverySuccess: () => {
      console.log('🎉 Welcome message recovery successful, fetching messages');
      fetchMessages();
    }
  });

  // Enhanced message fetching with recovery
  const fetchMessages = useCallback(async (forceRefresh = false) => {
    if (!conversationId || fetchInProgressRef.current) return;

    if (!forceRefresh && messages.length > 0) {
      console.log('⏭️ Skipping fetch - messages already loaded');
      return;
    }

    fetchInProgressRef.current = true;
    console.log(`📨 Fetching messages for conversation ${conversationId}`);

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError);
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

      console.log(`✅ Loaded ${formattedMessages.length} messages for conversation ${conversationId}`);
      setMessages(formattedMessages);

      // Check if we have a welcome message
      const hasWelcomeMessage = formattedMessages.some(msg => msg.sender === 'assistant');
      if (hasWelcomeMessage) {
        setWelcomeMessageStatus('ai_ready');
        setIsGeneratingWelcome(false);
        welcomeGeneratedRef.current = true;
      }

    } catch (error) {
      console.error('💥 Exception fetching messages:', error);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [conversationId, messages.length]);

  // Monitor conversation status for welcome message generation
  useEffect(() => {
    if (!conversationId || !conversation) return;

    const currentStatus = conversation.welcome_message_status || 'pending';
    setWelcomeMessageStatus(currentStatus);

    console.log('🔍 useMessageFetching - Welcome message status:', {
      conversationId,
      currentStatus,
      sessionStarted: conversation.session_started,
      hasMessages: messages.length > 0
    });

    // If session started but no welcome message, trigger generation
    if (conversation.session_started && currentStatus === 'pending' && !welcomeGeneratedRef.current) {
      console.log('🚀 Session started, triggering welcome message generation');
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
      }).then(({ data, error }) => {
        if (error) {
          console.error('❌ Welcome message generation failed:', error);
          setIsGeneratingWelcome(false);
          // Trigger recovery on failure
          setTimeout(() => attemptRecovery(), 5000);
        } else {
          console.log('✅ Welcome message generation successful:', data);
          setTimeout(() => fetchMessages(true), 1000);
        }
      });
    }

    // Handle different welcome message states
    if (currentStatus === 'ai_generating' && !isGeneratingWelcome) {
      setIsGeneratingWelcome(true);
    } else if (currentStatus === 'ai_ready' || currentStatus === 'fallback_ready') {
      setIsGeneratingWelcome(false);
      if (messages.length === 0) {
        fetchMessages(true);
      }
    }
  }, [conversationId, conversation, messages.length, isGeneratingWelcome, attemptRecovery, fetchMessages]);

  // Process new messages from realtime
  const processNewMessage = useCallback((message: Message) => {
    console.log('📝 Processing new message:', message.id);

    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        console.log('⏭️ Message already exists, skipping');
        return prev;
      }

      const updated = [...prev, message];
      console.log(`✅ Added new message, total: ${updated.length}`);
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
    if (!conversationId || isGeneratingResponse) return;

    setIsGeneratingResponse(true);
    console.log('🤖 Generating aggregated facilitator response');

    try {
      const { data, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: messages.map(msg => ({
            role: msg.sender === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          conversationId,
          sessionStart: false,
          generateReport: false
        }
      });

      if (error) {
        console.error('❌ Error generating facilitator response:', error);
        return;
      }

      console.log('✅ Facilitator response generated successfully');

      // Fetch messages to get the new response
      setTimeout(() => fetchMessages(true), 1000);

    } catch (error) {
      console.error('💥 Exception generating facilitator response:', error);
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [conversationId, messages, isGeneratingResponse, fetchMessages]);

  // Reset flags when conversation changes
  useEffect(() => {
    welcomeGeneratedRef.current = false;
    autoStartProcessedRef.current = false;
    setMessages([]);
    setWelcomeMessageStatus('pending');
    setIsGeneratingWelcome(false);
  }, [conversationId]);

  return {
    messages,
    setMessages,
    fetchMessages,
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
