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

  console.log('🚪 [WelcomeMessageGate] [AI-TRACKING] State:', {
    conversationId,
    isAdmin,
    sessionStarted,
    isWaitingForMessage: state.isWaitingForMessage,
    messageReady: state.messageReady,
    timeoutReached: state.timeoutReached,
    error: state.error
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
      console.log(`📨 [WelcomeMessageGate] [AI-TRACKING] Welcome message check:`, {
        conversationId,
        hasMessage,
        messageCount: messages?.length || 0,
        firstMessage: messages?.[0] ? {
          id: messages[0].id,
          role: messages[0].role,
          contentPreview: typeof messages[0].content === 'object' && messages[0].content && (messages[0].content as any).text 
            ? (messages[0].content as any).text.substring(0, 100) + '...'
            : 'No text content'
        } : null
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

    // Check conversation status for AI generation progress
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('welcome_message_status')
        .eq('id', conversationId)
        .single();

      console.log('📊 [AI-TRACKING] Conversation welcome message status:', {
        conversationId,
        welcomeMessageStatus: conversation?.welcome_message_status
      });

      if (conversation?.welcome_message_status === 'ai_ready' || conversation?.welcome_message_status === 'template_ready') {
        console.log('✅ [WelcomeMessageGate] [AI-TRACKING] Welcome message ready via status check:', {
          status: conversation.welcome_message_status
        });
        setState(prev => ({ 
          ...prev, 
          isWaitingForMessage: false, 
          messageReady: true 
        }));
        return true;
      } else if (conversation?.welcome_message_status === 'ai_generating') {
        console.log('🤖 [AI-TRACKING] AI generation in progress, continuing to wait...');
      } else if (conversation?.welcome_message_status === 'failed') {
        console.error('❌ [AI-TRACKING] Welcome message generation failed');
      }
    } catch (error) {
      console.error('❌ [WelcomeMessageGate] [AI-TRACKING] Error checking conversation status:', error);
    }

    // Set up timeout (15 seconds for database trigger generation)
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ [WelcomeMessageGate] Timeout reached, proceeding anyway');
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
        console.log('📬 [WelcomeMessageGate] [AI-TRACKING] Message inserted:', {
          messageId: payload.new?.id,
          role: payload.new?.role,
          conversationId: payload.new?.conversation_id,
          participantId: payload.new?.participant_id,
          hasContent: !!payload.new?.content,
          contentPreview: payload.new?.content?.text ? 
            payload.new.content.text.substring(0, 100) + '...' : 
            'No text content'
        });
        
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
        console.log('🔄 [WelcomeMessageGate] [AI-TRACKING] Conversation status updated:', {
          oldStatus: payload.old?.welcome_message_status,
          newStatus,
          conversationId: payload.new?.id
        });
        
        if (newStatus === 'ai_ready' || newStatus === 'template_ready') {
          console.log('✅ [AI-TRACKING] Welcome message generation completed:', { status: newStatus });
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
          console.error('❌ [AI-TRACKING] Welcome message generation failed via status update');
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