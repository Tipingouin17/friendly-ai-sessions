import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';

interface UseWelcomeMessageMonitorProps {
  conversationId: number | null;
  participantId: number | null;
  isEnabled: boolean;
}

interface WelcomeMessageState {
  isWaiting: boolean;
  hasMessage: boolean;
  error: string | null;
  retryCount: number;
}

export const useWelcomeMessageMonitor = ({
  conversationId,
  participantId,
  isEnabled
}: UseWelcomeMessageMonitorProps) => {
  const [state, setState] = useState<WelcomeMessageState>({
    isWaiting: false,
    hasMessage: false,
    error: null,
    retryCount: 0
  });

  const checkForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      console.log('🔍 Checking for welcome message in conversation:', conversationId);
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('❌ Error checking for welcome message:', error);
        return false;
      }

      const hasWelcomeMessage = messages && messages.length > 0;
      console.log(`📨 Welcome message check result:`, {
        conversationId,
        messageCount: messages?.length || 0,
        hasWelcomeMessage
      });

      return hasWelcomeMessage;
    } catch (error) {
      console.error('💥 Exception checking for welcome message:', error);
      return false;
    }
  }, [conversationId]);

  const generateFallbackMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      console.log('🔄 Generating fallback welcome message for conversation:', conversationId);
      
      // Create a simple fallback message
      const fallbackMessage = {
        conversation_id: conversationId,
        content: {
          text: "Welcome to your session! The facilitator will be with you shortly. Please feel free to introduce yourself and share what you'd like to get out of today's discussion.",
          avatar: '/api/avatar?name=Facilitator&variant=beam&palette=2'
        },
        role: 'assistant',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('messages')
        .insert(fallbackMessage);

      if (error) {
        console.error('❌ Error creating fallback message:', error);
        return false;
      }

      console.log('✅ Fallback welcome message created successfully');
      
      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify message is actually readable
      const verificationResult = await checkForWelcomeMessage();
      if (!verificationResult) {
        console.error('❌ Created message not readable from database');
        return false;
      }
      
      console.log('✅ Fallback message verified and ready');
      return true;
    } catch (error) {
      console.error('💥 Exception creating fallback message:', error);
      return false;
    }
  }, [conversationId, checkForWelcomeMessage]);

  const waitForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !isEnabled) return false;

    setState(prev => ({ ...prev, isWaiting: true, error: null }));
    console.log('⏳ Starting welcome message monitoring for conversation:', conversationId);

    const maxRetries = 6; // 30 seconds total (5 second intervals)
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      setState(prev => ({ ...prev, retryCount: attempt }));

      console.log(`🔍 Welcome message check attempt ${attempt}/${maxRetries}`);
      
      const hasMessage = await checkForWelcomeMessage();
      
      if (hasMessage) {
        console.log('✅ Welcome message found! Ready to proceed.');
        setState(prev => ({ 
          ...prev, 
          isWaiting: false, 
          hasMessage: true, 
          error: null 
        }));
        return true;
      }

      // If this is the last attempt, try to generate a fallback
      if (attempt === maxRetries) {
        console.log('⚠️ Max retries reached, generating fallback message...');
        const fallbackCreated = await generateFallbackMessage();
        
        if (fallbackCreated) {
          setState(prev => ({ 
            ...prev, 
            isWaiting: false, 
            hasMessage: true, 
            error: null 
          }));
          return true;
        } else {
          setState(prev => ({ 
            ...prev, 
            isWaiting: false, 
            hasMessage: false, 
            error: 'Failed to generate welcome message. Please refresh to try again.' 
          }));
          return false;
        }
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return false;
  }, [conversationId, isEnabled, checkForWelcomeMessage, generateFallbackMessage]);

  // Reset state when conversation changes
  useEffect(() => {
    setState({
      isWaiting: false,
      hasMessage: false,
      error: null,
      retryCount: 0
    });
  }, [conversationId]);

  return {
    ...state,
    waitForWelcomeMessage,
    checkForWelcomeMessage
  };
};