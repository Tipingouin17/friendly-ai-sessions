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

  console.log('🚪 [WelcomeMessageGate] State:', {
    conversationId,
    isAdmin,
    sessionStarted,
    ...state
  });

  const checkForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      console.log('🔍 [WelcomeMessageGate] Checking for welcome message...');
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, content, role, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('❌ [WelcomeMessageGate] Error checking messages:', error);
        return false;
      }

      const hasMessage = messages && messages.length > 0;
      console.log(`📨 [WelcomeMessageGate] Welcome message check:`, {
        conversationId,
        hasMessage,
        messageCount: messages?.length || 0
      });

      return hasMessage;
    } catch (error) {
      console.error('💥 [WelcomeMessageGate] Exception checking welcome message:', error);
      return false;
    }
  }, [conversationId]);

  const waitForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !sessionStarted) return true;

    console.log('⏳ [WelcomeMessageGate] Starting welcome message wait...');
    
    setState(prev => ({ 
      ...prev, 
      isWaitingForMessage: true, 
      error: null,
      timeoutReached: false 
    }));

    // First check if message already exists
    const messageExists = await checkForWelcomeMessage();
    if (messageExists) {
      console.log('✅ [WelcomeMessageGate] Welcome message already exists');
      setState(prev => ({ 
        ...prev, 
        isWaitingForMessage: false, 
        messageReady: true 
      }));
      return true;
    }

    // Set up timeout (30 seconds for server-side generation)
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ [WelcomeMessageGate] Timeout reached, proceeding anyway');
      setState(prev => ({ 
        ...prev, 
        isWaitingForMessage: false, 
        messageReady: true, 
        timeoutReached: true 
      }));
    }, 30000);

    // Listen for welcome message ready notification
    const channelName = `welcome-gate-${conversationId}-${Date.now()}`;
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        console.log('📬 [WelcomeMessageGate] Message inserted:', payload);
        
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