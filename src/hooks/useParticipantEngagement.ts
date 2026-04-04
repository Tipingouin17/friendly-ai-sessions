/**
 * useParticipantEngagement
 *
 * Manages participant engagement controls:
 *  - skip: participant skips the current question (logged, excluded from wait count)
 *  - pause / resume: participant temporarily steps away (excluded from wait count while paused)
 *  - message host: participant sends a private message to the host
 *
 * All state changes are written to session_events so they appear in analytics.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EngagementStatus = 'active' | 'paused' | 'skipped';

interface UseParticipantEngagementProps {
  conversationId: number | null;
  participantId: number | null;
  participantName: string;
}

export const useParticipantEngagement = ({
  conversationId,
  participantId,
  participantName,
}: UseParticipantEngagementProps) => {
  const [status, setStatus] = useState<EngagementStatus>('active');
  const [isSendingHostMessage, setIsSendingHostMessage] = useState(false);
  const [hostMessageSent, setHostMessageSent] = useState(false);

  // ─── Write a session_event ────────────────────────────────────────────────
  const writeEvent = useCallback(
    async (eventType: string, data: Record<string, unknown> = {}) => {
      if (!conversationId) return;
      try {
        await supabase.from('session_events').insert({
          conversation_id: conversationId,
          event_type: eventType,
          data: {
            participant_id: participantId,
            participant_name: participantName,
            timestamp: new Date().toISOString(),
            ...data,
          },
        });
      } catch (err) {
        console.error('[useParticipantEngagement] writeEvent error:', err);
      }
    },
    [conversationId, participantId, participantName]
  );

  // ─── Skip current question ────────────────────────────────────────────────
  const skipQuestion = useCallback(async () => {
    setStatus('skipped');
    await writeEvent('participant_skipped');
  }, [writeEvent]);

  // Reset skip status when a new facilitator message arrives
  const resetSkip = useCallback(() => {
    if (status === 'skipped') setStatus('active');
  }, [status]);

  // ─── Pause / resume ───────────────────────────────────────────────────────
  const togglePause = useCallback(async () => {
    if (status === 'paused') {
      setStatus('active');
      await writeEvent('participant_resumed');
    } else {
      setStatus('paused');
      await writeEvent('participant_paused');
    }
  }, [status, writeEvent]);

  // ─── Message host ─────────────────────────────────────────────────────────
  const sendMessageToHost = useCallback(
    async (message: string) => {
      if (!message.trim()) return;
      setIsSendingHostMessage(true);
      try {
        await writeEvent('participant_message_to_host', { message: message.trim() });
        setHostMessageSent(true);
        setTimeout(() => setHostMessageSent(false), 4000);
      } finally {
        setIsSendingHostMessage(false);
      }
    },
    [writeEvent]
  );

  return {
    status,
    isPaused: status === 'paused',
    isSkipped: status === 'skipped',
    isActive: status === 'active',
    skipQuestion,
    resetSkip,
    togglePause,
    sendMessageToHost,
    isSendingHostMessage,
    hostMessageSent,
  };
};
