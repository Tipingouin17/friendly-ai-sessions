
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { useToast } from '@/components/ui/use-toast';
import { createLogger } from '@/utils/debugLogger';

interface UseSessionFlowProps {
  conversationId: number | null;
  participants: any[];
  conversationData: any;
  isAdmin: boolean;
}

interface ResponseCollection {
  questionId: string;
  responses: Array<{
    participantId: number;
    content: string;
    timestamp: string;
  }>;
  totalExpected: number;
  isComplete: boolean;
}

export const useSessionFlow = ({
  conversationId,
  participants,
  conversationData,
  isAdmin
}: UseSessionFlowProps) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentResponseCollection, setCurrentResponseCollection] = useState<ResponseCollection | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [sessionStartNotification, setSessionStartNotification] = useState<string | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  
  const { toast } = useToast();
  const logger = createLogger('SessionFlow', 'session');
  const responseChannelRef = useRef<any>(null);

  // Monitor session start status
  useEffect(() => {
    if (conversationData?.session_started && !isSessionActive) {
      setIsSessionActive(true);
      if (isAdmin) {
        setSessionStartNotification('Session started successfully with AI welcome message');
        setTimeout(() => setSessionStartNotification(null), 8000);
      }
    }
  }, [conversationData?.session_started, isSessionActive, isAdmin]);

  // Set up real-time response collection
  useEffect(() => {
    if (!conversationId || !isAdmin) return;

    const channelName = `session-responses-${conversationId}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (payload.new.role === 'user' && currentResponseCollection) {
          handleNewParticipantResponse(payload.new);
        }
      })
      .subscribe();

    responseChannelRef.current = channel;

    return () => {
      if (responseChannelRef.current) {
        supabase.removeChannel(responseChannelRef.current);
      }
    };
  }, [conversationId, isAdmin, currentResponseCollection]);

  const handleNewParticipantResponse = useCallback((message: any) => {
    if (!currentResponseCollection) return;

    setCurrentResponseCollection(prev => {
      if (!prev) return null;

      const existingResponse = prev.responses.find(r => r.participantId === message.participant_id);
      
      const newResponse = {
        participantId: message.participant_id,
        content: typeof message.content === 'string' ? message.content : message.content.text,
        timestamp: message.created_at
      };

      const updatedResponses = existingResponse
        ? prev.responses.map(r => r.participantId === message.participant_id ? newResponse : r)
        : [...prev.responses, newResponse];

      const isComplete = updatedResponses.length >= prev.totalExpected;

      logger.category('session', `Response collected: ${updatedResponses.length}/${prev.totalExpected}`);

      if (isComplete && !isGeneratingResponse) {
        setTimeout(() => generateAggregatedResponse(updatedResponses), 1000);
      }

      return {
        ...prev,
        responses: updatedResponses,
        isComplete
      };
    });
  }, [currentResponseCollection, isGeneratingResponse]);

  const generateAggregatedResponse = useCallback(async (responses: any[]) => {
    if (!conversationId || isGeneratingResponse) return;

    setIsGeneratingResponse(true);
    logger.category('session', 'Generating aggregated AI response from participant responses');

    try {
      const { data: aiResponse, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: responses.map(r => ({
            id: `response-${r.participantId}`,
            content: r.content,
            sender: 'user',
            participant_id: r.participantId,
            timestamp: r.timestamp
          })),
          conversationId,
          generateReport: false,
          aggregateResponses: true,
          conversation: conversationData
        }
      });

      if (error) throw error;

      // Save the aggregated response to database
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        content: {
          text: aiResponse.content,
          avatar: aiResponse.avatar
        },
        role: 'assistant'
      });

      // Reset response collection for next question
      setCurrentResponseCollection(null);
      
      logger.category('session', 'Successfully generated and saved aggregated response');
      
      toast({
        title: "AI Response Generated",
        description: "Facilitator has responded based on all participant answers.",
      });

    } catch (error) {
      logger.error('Error generating aggregated response:', error);
      toast({
        title: "Error",
        description: "Failed to generate facilitator response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [conversationId, conversationData, isGeneratingResponse, toast, logger]);

  const startResponseCollection = useCallback((questionId: string) => {
    if (!isAdmin) return;

    const totalParticipants = participants.length;
    setCurrentResponseCollection({
      questionId,
      responses: [],
      totalExpected: totalParticipants,
      isComplete: false
    });

    logger.category('session', `Started collecting responses for question: ${questionId}, expecting ${totalParticipants} responses`);
  }, [participants.length, isAdmin, logger]);

  const triggerSessionStart = useCallback(async () => {
    if (!conversationId || !isAdmin || isStartingSession) return false;

    setIsStartingSession(true);
    
    try {
      logger.category('session', 'Starting session with AI welcome generation');
      
      // Show immediate feedback
      setSessionStartNotification('Starting session and generating welcome message...');

      // Mark session as started first
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ session_started: true })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      // Generate and save welcome message
      const { data: welcomeResponse, error: welcomeError } = await supabase.functions.invoke(
        'handle-facilitator-response',
        {
          body: {
            messages: [],
            conversationId,
            generateReport: false,
            sessionStart: true,
            conversation: conversationData
          }
        }
      );

      if (welcomeError) throw welcomeError;

      // Save welcome message to database with proper content structure
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        content: {
          text: welcomeResponse.content,
          avatar: welcomeResponse.avatar
        },
        role: 'assistant'
      });

      if (messageError) throw messageError;

      setIsSessionActive(true);
      setSessionStartNotification('Session started successfully with AI welcome message');
      setTimeout(() => setSessionStartNotification(null), 8000);

      // Start collecting responses for the welcome message
      startResponseCollection(`welcome-${Date.now()}`);

      logger.category('session', 'Session started successfully with welcome message');
      
      toast({
        title: "Session Started",
        description: "Welcome message generated and sent to all participants.",
      });

      return true;

    } catch (error) {
      logger.error('Error starting session:', error);
      setSessionStartNotification('Error starting session. Please try again.');
      setTimeout(() => setSessionStartNotification(null), 5000);
      
      toast({
        title: "Error Starting Session",
        description: "Failed to start session. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsStartingSession(false);
    }
  }, [conversationId, conversationData, isAdmin, startResponseCollection, toast, logger, isStartingSession]);

  return {
    isSessionActive,
    currentResponseCollection,
    isGeneratingResponse,
    sessionStartNotification,
    triggerSessionStart,
    startResponseCollection,
    isStartingSession,
    responseProgress: currentResponseCollection ? {
      collected: currentResponseCollection.responses.length,
      total: currentResponseCollection.totalExpected,
      isComplete: currentResponseCollection.isComplete
    } : null
  };
};
