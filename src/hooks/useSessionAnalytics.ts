/**
 * use Session Analytics
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useCallback } from 'react';
import api from "@/lib/api";
import {
  calculateSessionAnalyticsMetrics,
  type SessionAnalyticsMetrics,
  type SessionEventAnalyticsRow,
  type SessionParticipantAnalyticsRow,
} from "@/utils/sessionAnalyticsMetrics";

type SessionAnalytics = SessionAnalyticsMetrics;

interface AnalyticsOptions {
  conversationId: number;
  realtime?: boolean;
}

export const useSessionAnalytics = ({ conversationId, realtime = false }: AnalyticsOptions) => {
  const [analytics, setAnalytics] = useState<SessionAnalytics>({
    totalEvents: 0,
    participantJoins: 0,
    participantLeaves: 0,
    uniqueParticipants: 0,
    reconnectEvents: 0,
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
      
      // Fetch all session events and participant rows for this conversation.
      // Events explain operational activity; participant rows provide the best
      // available unique attendee count without treating reconnects as new seats.
      const [{ data: events, error: eventsError }, { data: participantRows, error: participantsError }] = await Promise.all([
        api
          .from('session_events')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
        api
          .from('session_participants')
          .select('participant_id, is_host')
          .eq('conversation_id', conversationId),
      ]);

      if (eventsError) {
        throw eventsError;
      }

      if (participantsError) {
        console.warn('Unable to load session participants for diagnostics', participantsError);
      }

      const calculatedAnalytics = calculateSessionAnalyticsMetrics(
        (events || []) as SessionEventAnalyticsRow[],
        (participantRows || []) as SessionParticipantAnalyticsRow[],
      );

      setAnalytics(calculatedAnalytics);

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
    const channel = api
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
      api.removeChannel(channel);
    };
  }, [conversationId, realtime, calculateAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: calculateAnalytics
  };
};
