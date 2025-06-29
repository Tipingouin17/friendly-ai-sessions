
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { createLogger } from '@/utils/debugLogger';

interface UseSessionStartProps {
  conversationId: number | null;
  participants: any[];
  conversationData: any;
}

export const useSessionStart = ({
  conversationId,
  participants,
  conversationData
}: UseSessionStartProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();
  const logger = createLogger('SessionStart', 'session');

  const clearWelcomeMessageCache = (convId: number) => {
    try {
      const cacheKey = `session_welcome_message_${convId}`;
      localStorage.removeItem(cacheKey);
      logger.category('session', `🗑️ Cleared welcome message cache for session ${convId}`);
    } catch (error) {
      logger.error('Error clearing welcome message cache:', error);
    }
  };

  const generateAndSaveWelcomeMessage = async (convId: number) => {
    logger.category('session', `🤖 Generating AI welcome message for session ${convId}`);
    
    try {
      const { data: responseData, error: responseError } = await supabase.functions.invoke(
        'handle-facilitator-response',
        {
          body: {
            messages: [],
            conversationId: convId,
            generateReport: false,
            sessionStart: true,
            conversation: conversationData
          }
        }
      );

      if (responseError) {
        logger.error('❌ Error generating welcome message:', responseError);
        throw responseError;
      }

      if (!responseData?.content) {
        logger.error('⚠️ Empty response from AI generation');
        throw new Error('Empty AI response');
      }

      // Save the generated message to database
      const { error: dbError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          content: { 
            text: responseData.content,
            avatar: responseData.avatar
          },
          role: 'assistant',
          created_at: new Date().toISOString()
        });

      if (dbError) {
        logger.error('❌ Error saving welcome message to database:', dbError);
        throw dbError;
      }

      logger.category('session', '✅ Welcome message generated and saved to database:', {
        contentLength: responseData.content.length,
        generationMethod: responseData.metrics?.generationMethod,
        hasAvatar: !!responseData.avatar
      });

      return responseData;
    } catch (error) {
      logger.error('💥 Welcome message generation failed:', error);
      throw error;
    }
  };

  const startSession = async () => {
    if (!conversationId || !conversationData) {
      logger.error('Cannot start session: Missing conversation data', {
        conversationId,
        hasConversationData: !!conversationData
      });
      return false;
    }

    setIsStarting(true);
    const startTime = performance.now();
    
    try {
      logger.category('session', `🚀 Starting session for conversation: ${conversationId} with ${participants.length} participants`);
      
      // Clear any existing cached welcome messages to ensure fresh AI generation
      clearWelcomeMessageCache(conversationId);
      
      // Mark the session as started in the database first
      const dbUpdateStart = performance.now();
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          session_started: true 
        })
        .eq('id', conversationId);
        
      const dbUpdateDuration = performance.now() - dbUpdateStart;
      logger.category('session', `💾 Database update completed in ${dbUpdateDuration.toFixed(2)}ms`);
        
      if (updateError) {
        logger.error('❌ Error updating session_started:', updateError);
        throw updateError;
      }

      logger.category('session', '✅ Session marked as started in database');

      // Generate AI welcome message with full context
      const welcomeMessageStart = performance.now();
      await generateAndSaveWelcomeMessage(conversationId);
      const welcomeMessageDuration = performance.now() - welcomeMessageStart;
      
      logger.category('session', `🎯 Welcome message generation completed in ${welcomeMessageDuration.toFixed(2)}ms`);
      
      const totalDuration = performance.now() - startTime;
      logger.category('session', `🎉 Session start completed in ${totalDuration.toFixed(2)}ms total`);
      
      toast({
        title: "Session started",
        description: "The session has been started and participants will receive an AI-generated welcome message.",
      });
      
      return true;
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      logger.error('💥 Error starting session:', {
        error,
        duration: totalDuration,
        conversationId,
        participantCount: participants.length,
        stackTrace: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      toast({
        title: "Error starting session",
        description: "There was a problem starting the session. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsStarting(false);
    }
  };

  return {
    startSession,
    isStarting
  };
};
