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
      console.log('🔍 Checking for welcome message in conversation:', conversationId, { onlyAcceptAI });
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(3); // Get first few messages to check their type

      if (error) {
        console.error('❌ Error checking for welcome message:', error);
        return false;
      }

      if (!messages || messages.length === 0) {
        console.log('📭 No messages found');
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
        
        console.log('🤖 AI message check:', {
          isAIGenerated,
          contentLength: (content as any)?.text?.length || 0,
          isFallback: (content as any)?.text?.includes("The facilitator will be with you shortly")
        });
        
        return isAIGenerated;
      }

      const hasWelcomeMessage = messages.length > 0;
      console.log(`📨 Welcome message check result:`, {
        conversationId,
        messageCount: messages.length,
        hasWelcomeMessage,
        firstMessageContent: typeof messages[0]?.content === 'object' && 
          messages[0]?.content && 
          !Array.isArray(messages[0]?.content) &&
          typeof (messages[0]?.content as any).text === 'string' 
            ? (messages[0]?.content as any).text.substring(0, 100) 
            : 'No text content'
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
      console.log('🔄 Triggering template fallback via database function for conversation:', conversationId);
      
      // Use the database function for template fallback
      const { error } = await supabase.rpc('create_template_welcome_message', {
        conversation_id_param: conversationId
      });

      if (error) {
        console.error('❌ Error creating template fallback message:', error);
        return false;
      }

      console.log('✅ Template fallback message created successfully');
      
      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify message is actually readable
      const verificationResult = await checkForWelcomeMessage();
      if (!verificationResult) {
        console.error('❌ Created message not readable from database');
        return false;
      }
      
      console.log('✅ Template fallback message verified and ready');
      return true;
    } catch (error) {
      console.error('💥 Exception creating template fallback message:', error);
      return false;
    }
  }, [conversationId, checkForWelcomeMessage]);

  const waitForWelcomeMessage = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !isEnabled) return false;

    setState(prev => ({ ...prev, isWaiting: true, error: null }));
    console.log('⏳ Starting welcome message monitoring for conversation:', conversationId);

    const maxRetries = 12; // 60 seconds total (5 second intervals) - increased for AI generation
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      setState(prev => ({ ...prev, retryCount: attempt }));

      console.log(`🔍 Welcome message check attempt ${attempt}/${maxRetries}`);
      
      // For first half of attempts, only accept AI-generated messages
      const onlyAcceptAI = attempt <= Math.floor(maxRetries * 0.6); // First 60% of attempts
      const hasMessage = await checkForWelcomeMessage(onlyAcceptAI);
      
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

      // If we're past 60% of attempts and no AI message found, trigger AI generation
      if (attempt === Math.floor(maxRetries * 0.6) + 1) {
        console.log('🤖 [useWelcomeMessageMonitor] Triggering AI welcome message generation at attempt', attempt);
        console.log('📋 [useWelcomeMessageMonitor] AI Generation Request:', {
          conversationId,
          sessionStart: true,
          timestamp: new Date().toISOString(),
          attempt,
          maxRetries
        });
        
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
            console.error('❌ [useWelcomeMessageMonitor] AI generation failed:', {
              error,
              duration,
              conversationId,
              attempt
            });
          } else {
            console.log('✅ [useWelcomeMessageMonitor] AI generation completed successfully:', {
              duration,
              conversationId,
              attempt,
              responseData: data,
              hasContent: !!data?.content,
              contentLength: data?.content?.length || 0
            });
          }
        } catch (error) {
          console.error('💥 [useWelcomeMessageMonitor] Exception triggering AI generation:', {
            error: error.message,
            conversationId,
            attempt,
            stack: error.stack
          });
        }
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