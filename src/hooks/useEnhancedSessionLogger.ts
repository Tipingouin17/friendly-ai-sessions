/**
 * use Enhanced Session Logger
 *
 * Hook for the AIfacilitator application.
 */

import { useCallback } from 'react';
import api from "@/lib/api";
import { useToast } from '@/hooks/use-toast';

interface SessionEvent {
  conversationId: number;
  eventType: string;
  eventData?: Record<string, any>;
  performanceMetrics?: {
    timestamp: number;
    duration?: number;
    responseTime?: number;
  };
  participantId?: number;
  userId?: string;
}

export const useEnhancedSessionLogger = () => {
  const { toast } = useToast();

  const logSessionEvent = useCallback(async (event: SessionEvent) => {
    try {
      const { data: { session } } = await api.auth.getSession();
      const user = session?.user ?? null;
      
      const eventRecord = {
        conversation_id: event.conversationId,
        event_type: event.eventType,
        data: {
          ...event.eventData,
          participant_id: event.participantId,
          user_id: event.userId || user?.id,
          performance_metrics: event.performanceMetrics,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          page_url: window.location.href
        }
      };

      const { error } = await api
        .from('session_events')
        .insert(eventRecord);

      if (error) {
        console.error('Failed to log session event:', error);
      } else { /* no-op */ }
    } catch (error) {
      console.error('Error logging session event:', error);
    }
  }, []);

  // Specific event loggers
  const logParticipantJoin = useCallback((conversationId: number, participantId: number, participantName: string) => {
    logSessionEvent({
      conversationId,
      eventType: 'participant_joined',
      participantId,
      eventData: {
        participant_name: participantName,
        join_method: 'manual'
      },
      performanceMetrics: {
        timestamp: performance.now()
      }
    });
  }, [logSessionEvent]);

  const logParticipantLeave = useCallback((conversationId: number, participantId: number, reason?: string) => {
    logSessionEvent({
      conversationId,
      eventType: 'participant_left',
      participantId,
      eventData: {
        leave_reason: reason || 'unknown'
      },
      performanceMetrics: {
        timestamp: performance.now()
      }
    });
  }, [logSessionEvent]);

  const logMessageSent = useCallback((conversationId: number, participantId: number, messageLength: number, messageType: string) => {
    logSessionEvent({
      conversationId,
      eventType: 'message_sent',
      participantId,
      eventData: {
        message_length: messageLength,
        message_type: messageType
      },
      performanceMetrics: {
        timestamp: performance.now()
      }
    });
  }, [logSessionEvent]);

  const logAIResponse = useCallback((conversationId: number, responseTime: number, method: string, tokenCount?: number) => {
    logSessionEvent({
      conversationId,
      eventType: 'ai_response_generated',
      eventData: {
        generation_method: method,
        token_count: tokenCount,
        quality_score: method === 'ai' ? 'high' : 'medium'
      },
      performanceMetrics: {
        timestamp: performance.now(),
        responseTime
      }
    });
  }, [logSessionEvent]);

  const logAdminAction = useCallback((conversationId: number, action: string, details?: Record<string, any>) => {
    logSessionEvent({
      conversationId,
      eventType: 'admin_action',
      eventData: {
        action_type: action,
        action_details: details
      },
      performanceMetrics: {
        timestamp: performance.now()
      }
    });
  }, [logSessionEvent]);

  const logSessionTransition = useCallback((conversationId: number, fromState: string, toState: string) => {
    logSessionEvent({
      conversationId,
      eventType: 'session_state_transition',
      eventData: {
        from_state: fromState,
        to_state: toState
      },
      performanceMetrics: {
        timestamp: performance.now()
      }
    });
  }, [logSessionEvent]);

  const logPerformanceMetric = useCallback((conversationId: number, metricName: string, value: number, context?: Record<string, any>) => {
    logSessionEvent({
      conversationId,
      eventType: 'performance_metric',
      eventData: {
        metric_name: metricName,
        metric_value: value,
        context
      },
      performanceMetrics: {
        timestamp: performance.now()
      }
    });
  }, [logSessionEvent]);

  return {
    logSessionEvent,
    logParticipantJoin,
    logParticipantLeave,
    logMessageSent,
    logAIResponse,
    logAdminAction,
    logSessionTransition,
    logPerformanceMetric
  };
};
