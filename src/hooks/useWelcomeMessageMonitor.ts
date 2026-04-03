/**
 * use Welcome Message Monitor
 *
 * Hook for the AIfacilitator application.
 */

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

  const checkForWelcomeMessage = useCallback(async (onlyAcceptAI = false): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(3); // Get first few messages to check their type

      if (error) {
        console.error('Error checking for welcome message:', error);
        return false;
      }

      if (!messages || messages.length === 0) {
        return false;
      }

      // If we only want AI messages, check if the first message is AI-generated
      if (onlyAcceptAI) {
        const firstMessage = messages[0];
        const content = firstMessage.content;
        
        // Check if it's a rich AI message (not just the fallback)
        const isAIGenerated = typeof content === 'object' && 
          content && 
          !Array.isArray(content) &&
          typeof (content as any).text === 'string' &&
          (content as any).text.length > 200 && // AI messages are typically longer
          !(content as any).text.includes("The facilitator will be with you shortly"); // Not the fallback text
        
        return isAIGenerated;
      }

      const hasWelcomeMessage = messages.length > 0;

      return hasWelcomeMessage;
    } catch (error) {
      console.error('Exception checking for welcome message:', error);
      return false;
    }
  }, [conversationId]);

  const checkWelcomeMessageStatus = useCallback(async (): Promise<string | null> => {
    if (!conversationId) return null;

    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('welcome_message_status')
        .eq('id', conversationId)
        .single();

      if (error || !conversation) {
        console.error('Error checking welcome message status:', error);
        return null;
      }

      return conversation.welcome_message_status;
    } catch (error) {
      console.error('Exception checking welcome message status:', error);
      return null;
    }
  }, [conversationId]);

  const recoverStuckWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      
      const { error } = await supabase.functions.invoke('recover-stuck-welcome-messages');
      
      if (error) {
        console.error('Error calling recovery function:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception calling recovery function:', error);
      return false;
    }
  }, [conversationId]);

  const generateFallbackMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      
      // Use the database function for template fallback
      const { error } = await supabase.rpc('create_template_welcome_message', {
        conversation_id_param: conversationId
      });

      if (error) {
        console.error('Error creating template fallback message:', error);
        return false;
      }

      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify message is actually readable
      const verificationResult = await checkForWelcomeMessage();
      if (!verificationResult) {
        console.error('Created message not readable from database');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception creating template fallback message:', error);
      return false;
    }
  }, [conversationId, checkForWelcomeMessage]);

  const waitForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !isEnabled) return false;

    setState(prev => ({ ...prev, isWaiting: true, error: null }));

    const maxRetries = 15; // Increased for better recovery
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      setState(prev => ({ ...prev, retryCount: attempt }));

      // Check welcome message status first
      const status = await checkWelcomeMessageStatus();
      
      // If status is failed or we're stuck in ai_generating for too long, try recovery
      if ((status === 'failed' || (status === 'ai_generating' && attempt > 8)) && attempt === 9) {
        await recoverStuckWelcomeMessage();
        // Give recovery some time
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // For first half of attempts, only accept AI-generated messages
      const onlyAcceptAI = attempt <= Math.floor(maxRetries * 0.4); // First 40% of attempts
      const hasMessage = await checkForWelcomeMessage(onlyAcceptAI);
      
      if (hasMessage) {
        setState(prev => ({ 
          ...prev, 
          isWaiting: false, 
          hasMessage: true, 
          error: null 
        }));
        return true;
      }

      // If we're past 40% of attempts and no AI message found, trigger AI generation
      // But first check if ANY message already exists (even non-AI) to avoid double-triggering
      const anyMessageExists = await checkForWelcomeMessage(false);
      if (anyMessageExists) {
        // A message exists but isn't AI-quality yet — just wait for it
        await new Promise(resolve => setTimeout(resolve, 4000));
        continue;
      }
      if (attempt === Math.floor(maxRetries * 0.4) + 1) {
        
        try {
          const startTime = Date.now();
          const { data, error } = await supabase.functions.invoke('handle-facilitator-response', {
            body: {
              messages: [],
              conversationId,
              sessionStart: true,
              generateReport: false
            }
          });
          
          const duration = Date.now() - startTime;
          
          if (error) {
            console.error('[useWelcomeMessageMonitor] AI generation failed:', {
              error,
              duration,
              conversationId,
              attempt
            });
          } else { /* no-op */ }
        } catch (error) {
          console.error('[useWelcomeMessageMonitor] Exception triggering AI generation:', {
            error: error.message,
            conversationId,
            attempt,
            stack: error.stack
          });
        }
      }

      // If this is the last attempt, try to generate a fallback
      if (attempt === maxRetries) {
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

      // Wait 4 seconds before next check (reduced for faster recovery)
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    return false;
  }, [conversationId, isEnabled, checkForWelcomeMessage, checkWelcomeMessageStatus, recoverStuckWelcomeMessage, generateFallbackMessage]);

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
