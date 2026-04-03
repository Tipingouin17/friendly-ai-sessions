/**
 * use Session Analytics
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionAnalytics {
  totalEvents: number;
  participantJoins: number;
  participantLeaves: number;
  messagesSent: number;
  aiResponses: number;
  adminActions: number;
  averageResponseTime: number;
  sessionDuration: number;
  engagementScore: number;
  errorCount: number;
}

interface AnalyticsOptions {
  conversationId: number;
  realtime?: boolean;
}

export const useSessionAnalytics = ({ conversationId, realtime = false }: AnalyticsOptions) => {
  const [analytics, setAnalytics] = useState<SessionAnalytics>({
    totalEvents: 0,
    participantJoins: 0,
    participantLeaves: 0,
    messagesSent: 0,
    aiResponses: 0,
    adminActions: 0,
    averageResponseTime: 0,
    sessionDuration: 0,
    engagementScore: 0,
    errorCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch all session events for this conversation
      const { data: events, error: eventsError } = await supabase
        .from('session_events')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (eventsError) {
        throw eventsError;
      }

      if (!events || events.length === 0) {
        setAnalytics(prev => ({ ...prev }));
        return;
      }

      // Calculate analytics from events
      const totalEvents = events.length;
      const participantJoins = events.filter(e => e.event_type === 'participant_joined').length;
      const participantLeaves = events.filter(e => e.event_type === 'participant_left').length;
      const messagesSent = events.filter(e => e.event_type === 'message_sent').length;
      const aiResponses = events.filter(e => e.event_type === 'ai_response_generated').length;
      const adminActions = events.filter(e => e.event_type === 'admin_action').length;
      const errorEvents = events.filter(e => e.event_type === 'error').length;

      // Calculate average response time for AI responses with proper type casting
      const aiResponseEvents = events.filter(e => {
        if (e.event_type !== 'ai_response_generated') return false;
        const eventData = e.data as Record<string, any>;
        return eventData?.performance_metrics?.responseTime;
      });
      
      const averageResponseTime = aiResponseEvents.length > 0
        ? aiResponseEvents.reduce((sum, event) => {
            const eventData = event.data as Record<string, any>;
            return sum + (eventData?.performance_metrics?.responseTime || 0);
          }, 0) / aiResponseEvents.length
        : 0;

      // Calculate session duration
      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      const sessionDuration = firstEvent && lastEvent
        ? new Date(lastEvent.created_at).getTime() - new Date(firstEvent.created_at).getTime()
        : 0;

      // Calculate engagement score (messages per participant)
      const uniqueParticipants = new Set(
        events
          .filter(e => {
            const eventData = e.data as Record<string, any>;
            return eventData?.participant_id;
          })
          .map(e => {
            const eventData = e.data as Record<string, any>;
            return eventData.participant_id;
          })
      ).size;
      
      const engagementScore = uniqueParticipants > 0 
        ? messagesSent / uniqueParticipants 
        : 0;

      setAnalytics({
        totalEvents,
        participantJoins,
        participantLeaves,
        messagesSent,
        aiResponses,
        adminActions,
        averageResponseTime: Math.round(averageResponseTime),
        sessionDuration: Math.round(sessionDuration / 1000), // Convert to seconds
        engagementScore: Math.round(engagementScore * 100) / 100,
        errorCount: errorEvents
      });

    } catch (err) {
      console.error('Error calculating session analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate analytics');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Set up realtime updates if requested
  useEffect(() => {
    if (!realtime) {
      calculateAnalytics();
      return;
    }

    // Initial calculation
    calculateAnalytics();

    // Set up realtime subscription
    const channel = supabase
      .channel(`session-analytics-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`
      }, () => {
        calculateAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, realtime, calculateAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: calculateAnalytics
  };
};
