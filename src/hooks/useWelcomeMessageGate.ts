/**
 * use Welcome Message Gate
 *
 * Hook for the AIfacilitator application.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  const checkForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      
      const { data: messages, error } = await supabase
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

  const waitForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !sessionStarted) return true;

    setState(prev => ({ 
      ...prev, 
      isWaitingForMessage: true, 
      error: null,
      timeoutReached: false 
    }));

    // First check if message already exists
    const messageExists = await checkForWelcomeMessage();
    if (messageExists) {
      setState(prev => ({ 
        ...prev, 
        isWaitingForMessage: false, 
        messageReady: true 
      }));
      return true;
    }

    // Check conversation status for AI generation progress
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('welcome_message_status')
        .eq('id', conversationId)
        .single();

      if (conversation?.welcome_message_status === 'ai_ready' || conversation?.welcome_message_status === 'template_ready') {
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

    // Set up timeout (15 seconds for database trigger generation)
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        isWaitingForMessage: false, 
        messageReady: true, 
        timeoutReached: true 
      }));
    }, 15000);

    // Listen for welcome message ready notification and status changes
    const channelName = `welcome-gate-${conversationId}-${Date.now()}`;
    channelRef.current = supabase
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
        if (state.messageReady || state.timeoutReached) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 1000);
    });
  }, [conversationId, sessionStarted, checkForWelcomeMessage, state.messageReady, state.timeoutReached]);

  // Clean up on unmount or conversation change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId]);

  // Reset state when conversation changes
  useEffect(() => {
    setState({
      isWaitingForMessage: false,
      messageReady: false,
      error: null,
      timeoutReached: false
    });
  }, [conversationId]);

  return {
    ...state,
    waitForWelcomeMessage,
    checkForWelcomeMessage
  };
};