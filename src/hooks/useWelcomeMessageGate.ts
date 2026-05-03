/**
 * use Welcome Message Gate
 *
 * Hook for the AIfacilitator application.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import api from "@/lib/api";

interface UseWelcomeMessageGateProps {
  conversationId: number | null;
  isAdmin: boolean;
  sessionStarted: boolean;
}

interface WelcomeMessageGateState {
  isWaitingForMessage: boolean;
  messageReady: boolean;
  error: string | null;
  timeoutReached: boolean;
}

export const useWelcomeMessageGate = ({
  conversationId,
  isAdmin,
  sessionStarted
}: UseWelcomeMessageGateProps) => {
  const [state, setState] = useState<WelcomeMessageGateState>({
    isWaitingForMessage: false,
    messageReady: false,
    error: null,
    timeoutReached: false
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  // BUG #3 FIX: Track the conversation ID for which messageReady was confirmed.
  // Once messageReady is true for a given session, never reset it back to false
  // for the same session — even if the conversation object re-fetches or the
  // component briefly re-mounts during a backend reconnection.
  const messageReadyForConversationRef = useRef<number | null>(null);

  const checkForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      
      const { data: messages, error } = await api
        .from('messages')
        .select('id, content, role, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('[WelcomeMessageGate] Error checking messages:', error);
        return false;
      }

      const hasMessage = messages && messages.length > 0;

      return hasMessage;
    } catch (error) {
      console.error('[WelcomeMessageGate] Exception checking welcome message:', error);
      return false;
    }
  }, [conversationId]);

  // BUG #3 FIX: Remove state.messageReady and state.timeoutReached from the
  // dependency array. These caused a new waitForWelcomeMessage reference on
  // every state change, which could trigger re-renders that reset the gate.
  // Use refs instead to read the latest values inside the callback.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const waitForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !sessionStarted) return true;

    // BUG #3 FIX: If messageReady was already confirmed for this session, skip.
    if (messageReadyForConversationRef.current === conversationId) return true;

    // PERF FIX: Check if message already exists BEFORE setting isWaitingForMessage=true.
    // Previously we set isWaitingForMessage=true immediately, which forced phase='ai_generating'
    // for 500ms-1s even when the welcome message was already in DB — causing a visible flash.
    const messageExists = await checkForWelcomeMessage();
    if (messageExists) {
      messageReadyForConversationRef.current = conversationId;
      setState(prev => ({ 
        ...prev, 
        isWaitingForMessage: false, 
        messageReady: true,
        error: null,
        timeoutReached: false
      }));
      return true;
    }

    // Message not ready yet — now set isWaitingForMessage=true to show the loading UI
    setState(prev => ({ 
      ...prev, 
      isWaitingForMessage: true, 
      error: null,
      timeoutReached: false 
    }));

    // Check conversation status for AI generation progress
    try {
      const { data: conversation } = await api
        .from('conversations')
        .select('welcome_message_status')
        .eq('id', conversationId)
        .single();

      if (conversation?.welcome_message_status === 'ai_ready' || conversation?.welcome_message_status === 'template_ready') {
        messageReadyForConversationRef.current = conversationId;
        setState(prev => ({ 
          ...prev, 
          isWaitingForMessage: false, 
          messageReady: true 
        }));
        return true;
      } else if (conversation?.welcome_message_status === 'ai_generating') { /* no-op */ } else if (conversation?.welcome_message_status === 'failed') {
        console.error('[AI-TRACKING] Welcome message generation failed');
      }
    } catch (error) {
      console.error('[WelcomeMessageGate] [AI-TRACKING] Error checking conversation status:', error);
    }

    // Set up timeout (45 seconds — accounts for Railway cold start + OpenAI generation time).
    // On timeout, set timeoutReached=true but keep isWaitingForMessage=false so the UI
    // shows the timeout phase with a "Try Again" button instead of blocking indefinitely.
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        isWaitingForMessage: false, 
        messageReady: false, 
        timeoutReached: true 
      }));
    }, 45000);

    // Listen for welcome message ready notification and status changes
    const channelName = `welcome-gate-${conversationId}`;
    channelRef.current = api
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        messageReadyForConversationRef.current = conversationId;
        setState(prev => ({ 
          ...prev, 
          isWaitingForMessage: false, 
          messageReady: true 
        }));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, async (payload) => {
        const newStatus = payload.new?.welcome_message_status;
        
        if (newStatus === 'ai_ready' || newStatus === 'template_ready') {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          messageReadyForConversationRef.current = conversationId;
          setState(prev => ({ 
            ...prev, 
            isWaitingForMessage: false, 
            messageReady: true 
          }));
        } else if (newStatus === 'failed') {
          console.error('[AI-TRACKING] Welcome message generation failed via status update');
          setState(prev => ({ 
            ...prev, 
            error: 'AI generation failed',
            isWaitingForMessage: false
          }));
        }
      })
      .subscribe();

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        // BUG #3 FIX: Use ref instead of stale closure over state
        if (stateRef.current.messageReady || stateRef.current.timeoutReached) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 1000);
    });
  // BUG #3 FIX: Removed state.messageReady and state.timeoutReached from deps
  // to prevent new function references on every state change.
  }, [conversationId, sessionStarted, checkForWelcomeMessage]);

  // Clean up on unmount or conversation change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (channelRef.current) {
        api.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId]);

  // BUG #3 FIX: Only reset state when conversation ID actually changes to a
  // DIFFERENT session. If the same conversation ID re-renders (e.g., after a
  // backend reconnection), preserve the messageReady=true state to prevent
  // the "Session Starting" screen from flashing back.
  const prevConversationIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (conversationId !== prevConversationIdRef.current) {
      prevConversationIdRef.current = conversationId;
      // Only reset if we don't already have messageReady confirmed for this session
      if (messageReadyForConversationRef.current !== conversationId) {
        setState({
          isWaitingForMessage: false,
          messageReady: false,
          error: null,
          timeoutReached: false
        });
      }
    }
  }, [conversationId]);

  // BUG #3 FIX: If messageReady was already confirmed for this conversationId
  // (e.g., after a reconnection re-mounts the component), restore it immediately.
  useEffect(() => {
    if (conversationId && messageReadyForConversationRef.current === conversationId && !state.messageReady) {
      setState(prev => ({ ...prev, messageReady: true, isWaitingForMessage: false }));
    }
  }, [conversationId, state.messageReady]);

  return {
    ...state,
    waitForWelcomeMessage,
    checkForWelcomeMessage
  };
};
