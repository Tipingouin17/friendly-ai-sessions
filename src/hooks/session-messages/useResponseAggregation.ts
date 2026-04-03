/**
 * use Response Aggregation
 *
 * Session message hook for the AIfacilitator application.
 */

import { useState, useCallback, useEffect } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';

interface UseResponseAggregationProps {
  conversationId: number | null;
  totalParticipants: number;
  conversation?: any;
}

interface ParticipantResponse {
  participantId: string;
  content: string;
  timestamp: Date;
}

export const useResponseAggregation = ({
  conversationId,
  totalParticipants,
  conversation
}: UseResponseAggregationProps) => {
  const [pendingResponses, setPendingResponses] = useState<ParticipantResponse[]>([]);
  const [isWaitingForResponses, setIsWaitingForResponses] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  // Track participant responses
  const recordParticipantResponse = useCallback((message: Message) => {
    if (!message.participant || !currentQuestionId) return;

    const response: ParticipantResponse = {
      participantId: message.participant,
      content: message.content,
      timestamp: message.timestamp || new Date()
    };

    setPendingResponses(prev => {
      const existing = prev.find(r => r.participantId === message.participant);
      if (existing) {
        return prev.map(r => r.participantId === message.participant ? response : r);
      }
      return [...prev, response];
    });

    debugLog('all', `Recorded response from ${message.participant}: ${message.content.substring(0, 50)}...`);
  }, [currentQuestionId]);

  // Check if all participants have responded
  const allParticipantsResponded = pendingResponses.length >= totalParticipants;

  // Generate AI response based on aggregated participant responses
  const generateAggregatedResponse = useCallback(async (): Promise<Message | null> => {
    if (!conversationId || !allParticipantsResponded || isGeneratingResponse) return null;

    setIsGeneratingResponse(true);

    try {
      debugLog('all', `Generating AI response based on ${pendingResponses.length} participant responses`);

      // Prepare context with all participant responses
      const responseContext = {
        participantResponses: pendingResponses.map(r => ({
          participant: r.participantId,
          content: r.content,
          timestamp: r.timestamp.toISOString()
        })),
        totalResponses: pendingResponses.length,
        questionContext: currentQuestionId
      };

      const { data: aiResponse, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: pendingResponses.map(r => ({
            id: `response-${r.participantId}`,
            content: r.content,
            sender: 'user',
            participant: r.participantId,
            timestamp: r.timestamp
          })),
          conversationId,
          generateReport: false,
          aggregateResponses: true,
          responseContext
        }
      });

      if (error) {
        throw new Error(`AI aggregation failed: ${error.message}`);
      }

      if (!aiResponse?.content) {
        throw new Error('AI response is empty');
      }

      const aggregatedMessage: Message = {
        id: `aggregated-${Date.now()}`,
        content: aiResponse.content,
        sender: 'assistant',
        timestamp: new Date(),
        created_at: new Date().toISOString(),
        avatar: aiResponse.avatar || '/api/avatar?name=Facilitator&variant=beam&palette=2',
        isAIGenerated: true
      };

      // Clear pending responses after successful aggregation
      setPendingResponses([]);
      setIsWaitingForResponses(false);
      setCurrentQuestionId(null);

      debugLog('all', 'Successfully generated aggregated AI response');
      return aggregatedMessage;

    } catch (error) {
      console.error('Error generating aggregated response:', error);
      return null;
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [conversationId, pendingResponses, allParticipantsResponded, currentQuestionId, isGeneratingResponse]);

  // Start collecting responses for a new question
  const startResponseCollection = useCallback((questionId: string) => {
    setCurrentQuestionId(questionId);
    setPendingResponses([]);
    setIsWaitingForResponses(true);
    debugLog('all', `Started collecting responses for question: ${questionId}`);
  }, []);

  // Stop collecting responses
  const stopResponseCollection = useCallback(() => {
    setIsWaitingForResponses(false);
    setCurrentQuestionId(null);
    setPendingResponses([]);
  }, []);

  // Auto-generate response when all participants have responded
  useEffect(() => {
    if (allParticipantsResponded && isWaitingForResponses && !isGeneratingResponse) {
      debugLog('all', 'All participants responded, generating aggregated response');
      generateAggregatedResponse();
    }
  }, [allParticipantsResponded, isWaitingForResponses, generateAggregatedResponse, isGeneratingResponse]);

  return {
    pendingResponses,
    isWaitingForResponses,
    allParticipantsResponded,
    responseCount: pendingResponses.length,
    recordParticipantResponse,
    generateAggregatedResponse,
    startResponseCollection,
    stopResponseCollection,
    isGeneratingResponse
  };
};
