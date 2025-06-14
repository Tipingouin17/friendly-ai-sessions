
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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

  const startSession = async () => {
    if (!conversationId || !conversationData) {
      console.error('Cannot start session: Missing conversation data');
      return false;
    }

    setIsStarting(true);
    
    try {
      console.log('Starting session for conversation:', conversationId);
      
      // First, mark the session as started in the database
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          session_started: true 
        })
        .eq('id', conversationId);
        
      if (updateError) {
        console.error('Error updating session_started:', updateError);
        throw updateError;
      }

      console.log('Session marked as started in database');

      // Generate the initial facilitator welcome message
      console.log('Generating initial facilitator welcome message');

      const { data: responseData, error: responseError } = await supabase.functions.invoke(
        'handle-facilitator-response',
        {
          body: {
            messages: [], // Empty for initial welcome message
            conversationId: conversationId,
            generateReport: false,
            sessionStart: true // Flag to indicate this is the session start
          }
        }
      );

      if (responseError) {
        console.error('Error generating welcome message:', responseError);
        throw responseError;
      }

      console.log('Welcome message generated successfully:', responseData);
      
      toast({
        title: "Session started",
        description: "The session has been started and participants will receive the welcome message.",
      });
      
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
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
