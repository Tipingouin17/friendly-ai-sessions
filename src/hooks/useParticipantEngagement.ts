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

import { useState, useCallback, useRef } from 'react';
import api from "@/lib/api";

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

  // Keep a ref to the latest status so resetSkip never has a stale closure
  const statusRef = useRef<EngagementStatus>('active');
  statusRef.current = status;

  // ─── Write a session_event ────────────────────────────────────────────────
  const writeEvent = useCallback(
    async (eventType: string, data: Record<string, unknown> = {}) => {
      if (!conversationId) return;
      try {
        await api.from('session_events').insert({
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

  // Reset skip status when a new facilitator message arrives.
  // Uses a ref so the callback is always stable and never captures a stale status.
  const resetSkip = useCallback(() => {
    if (statusRef.current === 'skipped') setStatus('active');
  }, []); // stable — reads from ref, not from closure

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
      if (!message.trim() || !conversationId) return;
      setIsSendingHostMessage(true);
      try {
        // 1. Log the event for analytics
        await writeEvent('participant_message_to_host', { message: message.trim() });

        // 2. Insert a messages row so the host sees it in their message list.
        //    role: 'admin' ensures it renders as a centred admin announcement.
        //    private_to_host: true marks it as a private participant note.
        await api.from('messages').insert({
          conversation_id: conversationId,
          content: {
            text: `🔒 Private message from ${participantName}: ${message.trim()}`,
            private_to_host: true,
            participant_id: participantId,
            participant_name: participantName,
          },
          role: 'admin',
          name: 'Host Note',
          participant_id: participantId,
        });

        setHostMessageSent(true);
        setTimeout(() => setHostMessageSent(false), 4000);
      } finally {
        setIsSendingHostMessage(false);
      }
    },
    [writeEvent, conversationId, participantId, participantName]
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
