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

    const maxRetries = 15;
    let attempt = 0;
    let aiGenerationTriggered = false;

    // ── Trigger AI generation immediately (fire-and-forget) ──────────────────
    // We kick off the AI welcome message generation right away so it runs in
    // parallel with the first poll.  This means the message is typically ready
    // within 5-10 seconds instead of waiting 24+ seconds for the old 40%-of-
    // retries threshold to be reached.
    try {
      aiGenerationTriggered = true;
      supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false
        }
      }).catch((err: unknown) => {
        console.error('[useWelcomeMessageMonitor] Immediate AI generation failed:', err);
      });
    } catch (err) {
      console.error('[useWelcomeMessageMonitor] Exception triggering immediate AI generation:', err);
    }

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
      
      // For the first 6 attempts (~24s) only accept a proper AI message;
      // after that accept any message so we don't block forever.
      const onlyAcceptAI = attempt <= 6;
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

      // If any message exists but isn't AI-quality yet, just wait for it
      const anyMessageExists = await checkForWelcomeMessage(false);
      if (anyMessageExists) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }

      // If AI generation hasn't been triggered yet (shouldn't happen) or if
      // we've been waiting a long time with no message, try again once.
      if (!aiGenerationTriggered || attempt === 8) {
        aiGenerationTriggered = true;
        try {
          supabase.functions.invoke('handle-facilitator-response', {
            body: {
              messages: [],
              conversationId,
              sessionStart: true,
              generateReport: false
            }
          }).catch((err: unknown) => {
            console.error('[useWelcomeMessageMonitor] Retry AI generation failed:', err);
          });
        } catch (err) {
          console.error('[useWelcomeMessageMonitor] Exception on retry AI generation:', err);
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
