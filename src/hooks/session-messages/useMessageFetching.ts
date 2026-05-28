/**
 * use Message Fetching
 *
 * Session message hook for the AIfacilitator application.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import api from "@/lib/api";
import { useWelcomeMessageRecovery } from '@/hooks/useWelcomeMessageRecovery';

interface UseMessageFetchingProps {
  conversationId: number | null;
  isAdmin: boolean;
  conversation?: any;
  totalParticipants: number;
  /** Participant IDs currently paused — excluded from response counting entirely */
  excludedParticipantIds?: Set<number>;
  /** Participant IDs who skipped the current question — counted as responded */
  skippedParticipantIds?: Set<number>;
}

// Polling interval in milliseconds
const POLLING_INTERVAL = 3000;
const AUTO_CONTINUATION_DELAY_MS = 3500;

export const useMessageFetching = ({
  conversationId,
  isAdmin,
  conversation,
  totalParticipants,
  excludedParticipantIds = new Set(),
  skippedParticipantIds = new Set(),
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

  // Keep refs to the latest Sets so callbacks always see fresh values
  const excludedParticipantIdsRef = useRef(excludedParticipantIds);
  const skippedParticipantIdsRef = useRef(skippedParticipantIds);
  useEffect(() => { excludedParticipantIdsRef.current = excludedParticipantIds; }, [excludedParticipantIds]);
  useEffect(() => { skippedParticipantIdsRef.current = skippedParticipantIds; }, [skippedParticipantIds]);

  // Expose skip/pause counts as plain numbers so useEffects can depend on them reactively.
  // Sets are objects — React won't detect internal changes by reference, so we derive numbers.
  const skippedCount = skippedParticipantIds.size;
  const excludedCount = excludedParticipantIds.size;

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
      const { data: messagesData, error: messagesError } = await api
        .from('messages')
        .select('*')
        .eq('conversation_id', cId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      const formattedMessages: Message[] = (messagesData || []).map(msg => {
        // Normalise content: may arrive as JSONB object, JSON string, or plain string
        let parsedContent: Record<string, unknown> | null = null;
        if (typeof msg.content === 'object' && msg.content && !Array.isArray(msg.content)) {
          parsedContent = msg.content as Record<string, unknown>;
        } else if (typeof msg.content === 'string') {
          try {
            const p = JSON.parse(msg.content);
            if (p && typeof p === 'object' && !Array.isArray(p)) parsedContent = p as Record<string, unknown>;
          } catch { /* plain text string — leave parsedContent null */ }
        }
        const textContent = parsedContent && 'text' in parsedContent ? String(parsedContent.text) : (typeof msg.content === 'string' ? msg.content : '');
        const isPrivateToHost = parsedContent ? Boolean(parsedContent.private_to_host) : false;
        const rawFacilitationTechnique = parsedContent?.facilitation_technique;
        const facilitationTechnique = rawFacilitationTechnique && typeof rawFacilitationTechnique === 'object' && !Array.isArray(rawFacilitationTechnique)
          ? {
              ...(rawFacilitationTechnique as NonNullable<Message['facilitationTechnique']>),
              selected: String(
                (rawFacilitationTechnique as Record<string, unknown>).selected
                ?? (rawFacilitationTechnique as Record<string, unknown>).selected_technique
                ?? ''
              ) || null,
              label: String(
                (rawFacilitationTechnique as Record<string, unknown>).label
                ?? (rawFacilitationTechnique as Record<string, unknown>).display_name
                ?? ''
              ) || null,
            } as Message['facilitationTechnique']
          : null;
        return {
          id: msg.id.toString(),
          content: textContent,
          sender: msg.role === 'assistant' ? 'assistant' : msg.role === 'admin' ? 'admin' : 'user',
          timestamp: new Date(msg.created_at),
          participant: msg.participant_id != null ? String(msg.participant_id) : undefined,
          name: msg.name || undefined,
          avatar: parsedContent && 'avatar' in parsedContent ? String(parsedContent.avatar) : undefined,
          role: msg.role || 'user',
          isPrivateToHost,
          facilitationTechnique,
        };
      });

      // Only update state if messages actually changed. Include rendered content and
      // technique metadata, not only IDs, so the UI refreshes if a row is enriched
      // after insertion or if JSONB content is normalised by the backend.
      const currentSignature = JSON.stringify(messagesRef.current.map(m => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        participant: m.participant,
        facilitationTechnique: m.facilitationTechnique ?? null,
      })));
      const newSignature = JSON.stringify(formattedMessages.map(m => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        participant: m.participant,
        facilitationTechnique: m.facilitationTechnique ?? null,
      })));
      
      if (currentSignature !== newSignature) {
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

    // Do not start polling for ended sessions — one-time fetch is enough
    if (conversation?.is_session_ended) {
      fetchMessagesFromDB();
      return;
    }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [conversationId, fetchMessagesFromDB]);

  // Stop polling when the session becomes ended mid-flight
  const isSessionEnded = conversation?.is_session_ended ?? false;
  useEffect(() => {
    if (isSessionEnded && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [isSessionEnded]);

  // Monitor conversation status for welcome message generation
  useEffect(() => {
    if (!conversationId || !conversation) return;
    // Never generate a welcome message for an already-ended session
    if (conversation?.is_session_ended) return;

    const currentStatus = conversation.welcome_message_status || 'pending';
    setWelcomeMessageStatus(currentStatus);

    // If session started but no welcome message, trigger generation
    // Handle both 'pending' (no trigger) and 'ai_generating' (DB trigger set it but no edge function listener)
    if (conversation.session_started && (currentStatus === 'pending' || currentStatus === 'ai_generating') && !welcomeGeneratedRef.current && messagesRef.current.length === 0) {
      setIsGeneratingWelcome(true);
      welcomeGeneratedRef.current = true;

      // Trigger AI generation
      api.functions.invoke('handle-facilitator-response', {
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

            const { error: insertError } = await api
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
              await api
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

  // Update response collection status based on messages AND skip/pause counts.
  // NOTE: skippedCount and excludedCount are included as dependencies so this re-runs
  // immediately when a participant skips — even before any new message arrives.
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
      // Count ONLY participant (user) responses after the last assistant message.
      // Admin/host messages must NOT be counted as participant responses and must
      // NOT trigger the auto-advance that generates a new AI facilitator reply.
      // Paused participants are excluded from the waiting count.
      const responses = messages.slice(lastAssistantIndex + 1).filter(m => {
        if (m.sender !== 'user') return false;
        // Exclude paused participants (use ref for latest value)
        if (m.participant && excludedParticipantIdsRef.current.has(Number(m.participant))) return false;
        return true;
      });

      // Count unique participants who actually responded (excluding paused)
      const uniqueRespondents = new Set(responses.map(r => r.participant || r.name)).size;
      // Add skipped participants — they count as having responded for auto-advance purposes
      const effectiveResponseCount = uniqueRespondents + skippedParticipantIdsRef.current.size;
      setResponseCount(effectiveResponseCount);

      // Mark as waiting for responses once the AI has asked a question.
      // This is true even if no one has responded yet (e.g. all skipped).
      setIsWaitingForResponses(true);
    } else {
      setIsWaitingForResponses(false);
      setResponseCount(0);
    }
  // skippedCount and excludedCount make this effect re-run reactively when skip/pause state changes
  }, [messages, skippedCount, excludedCount]);

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

  // Generate aggregated response - accepts optional host instruction
  const generateAggregatedResponse = useCallback(async (hostInstruction?: string) => {
    if (!conversationIdRef.current || isGeneratingResponse) return;
    // Never invoke the edge function for an ended session
    if (conversation?.is_session_ended) return;

    setIsGeneratingResponse(true);

    try {
      const body: any = {
        // Exclude private host notes from the AI context — they are internal annotations
        // and must not influence the facilitator's responses.
        messages: messagesRef.current
          .filter(msg => !msg.isPrivateToHost)
          .map(msg => ({
            role: msg.sender === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
        conversationId: conversationIdRef.current,
        sessionStart: false,
        generateReport: false
      };

      // Include host instruction if provided
      if (hostInstruction && hostInstruction.trim()) {
        body.hostInstruction = hostInstruction.trim();
      }

      const { data, error } = await api.functions.invoke('handle-facilitator-response', {
        body
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [isGeneratingResponse, fetchMessagesFromDB]);

  // Server-side auto-advance is the primary path, but the dev backend can miss or
  // delay the trigger after the final participant response. Keep a guarded client
  // fallback so the facilitator continues instead of leaving the room stuck.
  const autoAdvanceForMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId || conversation?.is_session_ended || isGeneratingResponse) return;
    if (messages.length === 0) return;

    const lastAssistantMessage = [...messages].reverse().find(message => message.sender === 'assistant');
    if (!lastAssistantMessage?.id) return;
    if (autoAdvanceForMessageIdRef.current === lastAssistantMessage.id) return;

    const expectedResponses = Math.max(1, totalParticipants - excludedCount);
    if (responseCount < expectedResponses) return;
    if (messages[messages.length - 1]?.sender === 'assistant') return;

    const timer = setTimeout(async () => {
      const currentConversationId = conversationIdRef.current;
      if (!currentConversationId) return;
      if (autoAdvanceForMessageIdRef.current === lastAssistantMessage.id) return;

      try {
        const { data: latestMessages, error } = await api
          .from('messages')
          .select('id, role')
          .eq('conversation_id', currentConversationId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Auto-continuation duplicate check failed:', error);
          return;
        }

        const latestMessage = Array.isArray(latestMessages) ? latestMessages[0] : null;
        if (latestMessage?.role === 'assistant') return;

        autoAdvanceForMessageIdRef.current = lastAssistantMessage.id;
        await generateAggregatedResponse();
      } catch (error) {
        console.error('Auto-continuation fallback failed:', error);
      }
    }, AUTO_CONTINUATION_DELAY_MS);

    return () => clearTimeout(timer);
  }, [conversation?.is_session_ended, conversationId, excludedCount, generateAggregatedResponse, isGeneratingResponse, messages, responseCount, totalParticipants]);

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
