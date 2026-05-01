/**
 * useParticipantStatusTracker
 *
 * Polls session_events to build a live map of participant engagement statuses.
 * Used by the host side to exclude paused/skipped participants from response counting.
 *
 * Logic:
 *  - participant_paused  → participant is excluded until participant_resumed arrives
 *  - participant_skipped → participant is excluded for the current question round
 *    (reset when a new assistant message arrives, tracked externally via lastAssistantMessageId)
 *  - participant_resumed → participant is re-included
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import api from "@/lib/api";

type ParticipantEngagementStatus = 'active' | 'paused' | 'skipped';

interface UseParticipantStatusTrackerProps {
  conversationId: number | null;
  /** ID of the last assistant message — when it changes, all skipped statuses are reset */
  lastAssistantMessageId?: string | null;
  pollingIntervalMs?: number;
}

export const useParticipantStatusTracker = ({
  conversationId,
  lastAssistantMessageId,
  pollingIntervalMs = 5000,
}: UseParticipantStatusTrackerProps) => {
  const [statusMap, setStatusMap] = useState<Map<number, ParticipantEngagementStatus>>(new Map());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await api
        .from('session_events')
        .select('event_type, data, created_at')
        .eq('conversation_id', conversationId)
        .in('event_type', ['participant_paused', 'participant_resumed', 'participant_skipped'])
        .order('created_at', { ascending: true });

      if (error || !data) return;

      // Replay events in chronological order to build the current status map
      const map = new Map<number, ParticipantEngagementStatus>();

      for (const event of data) {
        const eventData = event.data as Record<string, unknown> | null;
        const participantId = eventData?.participant_id as number | undefined;
        if (!participantId) continue;

        if (event.event_type === 'participant_paused') {
          map.set(participantId, 'paused');
        } else if (event.event_type === 'participant_resumed') {
          map.set(participantId, 'active');
        } else if (event.event_type === 'participant_skipped') {
          // Only mark as skipped if not already paused
          if (map.get(participantId) !== 'paused') {
            map.set(participantId, 'skipped');
          }
        }
      }

      setStatusMap(new Map(map));
    } catch (err) {
      console.error('[useParticipantStatusTracker] fetchStatuses error:', err);
    }
  }, [conversationId]);

  // Reset all skipped statuses when a new facilitator question arrives
  useEffect(() => {
    if (!lastAssistantMessageId) return;
    setStatusMap(prev => {
      const next = new Map(prev);
      for (const [id, status] of next) {
        if (status === 'skipped') next.set(id, 'active');
      }
      return next;
    });
  }, [lastAssistantMessageId]);

  // Polling
  useEffect(() => {
    if (!conversationId) return;

    fetchStatuses();
    pollingRef.current = setInterval(fetchStatuses, pollingIntervalMs);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversationId, fetchStatuses, pollingIntervalMs]);

  // Paused participants: excluded from response counting AND don't count as responded
  const pausedParticipantIds = new Set<number>(
    Array.from(statusMap.entries())
      .filter(([, status]) => status === 'paused')
      .map(([id]) => id)
  );

  // Skipped participants: NOT excluded from counting — they count AS responded
  const skippedParticipantIds = new Set<number>(
    Array.from(statusMap.entries())
      .filter(([, status]) => status === 'skipped')
      .map(([id]) => id)
  );

  // Combined excluded set for backward compat (only paused now)
  const excludedParticipantIds = pausedParticipantIds;

  return { statusMap, excludedParticipantIds, pausedParticipantIds, skippedParticipantIds };
};
