/**
 * useSessionDiagnostics
 *
 * Builds a privacy-aware operational timeline from session_events so admins can
 * understand where a participant session stalled without reading full answers.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type SessionEventRow = {
  id: number;
  conversation_id: number;
  event_type: string;
  data: unknown;
  created_at: string;
};

export type DiagnosticSeverity = 'info' | 'warning' | 'error' | 'success';

export type SessionDiagnosticEvent = {
  id: number;
  eventType: string;
  label: string;
  description: string;
  severity: DiagnosticSeverity;
  createdAt: string;
  participantId: number | null;
  participantName: string | null;
  details: Record<string, string | number | boolean | null>;
};

export type SessionDiagnosticsSummary = {
  health: 'healthy' | 'warning' | 'error' | 'empty';
  healthLabel: string;
  totalEvents: number;
  participantEvents: number;
  blockerEvents: number;
  errorEvents: number;
  warningEvents: number;
  messageEvents: number;
  lastEventAt: string | null;
  lastBlockerAt: string | null;
};

const CONTENT_KEYS = new Set([
  'content',
  'message',
  'text',
  'answer',
  'transcript',
  'prompt',
  'raw_message',
  'action_details',
]);

const EVENT_LABELS: Record<string, string> = {
  participant_joined: 'Participant joined',
  participant_left: 'Participant left',
  participant_paused: 'Participant paused',
  participant_resumed: 'Participant resumed',
  participant_skipped: 'Participant skipped a question',
  participant_message_to_host: 'Participant contacted host',
  participant_message_send_started: 'Participant answer send started',
  participant_message_send_failed: 'Participant answer send failed',
  participant_continuation_check_started: 'Continuation check started',
  participant_continuation_check_failed: 'Continuation check failed',
  participant_continuation_waiting_for_more_responses: 'Waiting for more participant responses',
  participant_continuation_skipped_assistant_already_replied: 'Facilitator already replied',
  participant_continuation_triggered: 'Facilitator continuation triggered',
  participant_continuation_completed: 'Facilitator continuation completed',
  participant_continuation_failed: 'Facilitator continuation failed',
  message_sent: 'Message sent',
  ai_response_generated: 'Facilitator response generated',
  performance_metric: 'Performance metric',
  admin_action: 'Admin action',
  error: 'Error recorded',
  session_state_transition: 'Session state changed',
};

const ERROR_EVENTS = new Set([
  'error',
  'participant_message_send_failed',
  'participant_continuation_failed',
  'participant_continuation_check_failed',
]);

const WARNING_EVENTS = new Set([
  'participant_paused',
  'participant_skipped',
  'participant_left',
  'participant_continuation_waiting_for_more_responses',
]);

const SUCCESS_EVENTS = new Set([
  'participant_continuation_completed',
  'participant_continuation_skipped_assistant_already_replied',
  'ai_response_generated',
]);

const BLOCKER_EVENTS = new Set([...ERROR_EVENTS, ...WARNING_EVENTS]);

const PARTICIPANT_EVENTS = new Set([
  'participant_joined',
  'participant_left',
  'participant_paused',
  'participant_resumed',
  'participant_skipped',
  'participant_message_to_host',
  'participant_message_send_started',
  'participant_message_send_failed',
  'participant_continuation_check_started',
  'participant_continuation_check_failed',
  'participant_continuation_waiting_for_more_responses',
  'participant_continuation_triggered',
  'participant_continuation_completed',
  'participant_continuation_failed',
  'message_sent',
]);

const MESSAGE_EVENTS = new Set([
  'message_sent',
  'participant_message_send_started',
  'participant_message_send_failed',
  'participant_message_to_host',
  'ai_response_generated',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toDisplayValue = (value: unknown): string | number | boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return 'metadata available';
  return String(value);
};

const sanitizeEventData = (data: unknown): Record<string, string | number | boolean | null> => {
  if (!isRecord(data)) return {};

  return Object.entries(data).reduce<Record<string, string | number | boolean | null>>((acc, [key, value]) => {
    if (CONTENT_KEYS.has(key)) {
      acc[key] = '[redacted]';
      return acc;
    }

    if (key === 'context' && isRecord(value)) {
      Object.entries(value).forEach(([contextKey, contextValue]) => {
        if (!CONTENT_KEYS.has(contextKey)) {
          acc[`context.${contextKey}`] = toDisplayValue(contextValue);
        }
      });
      return acc;
    }

    if (key === 'performance_metrics' && isRecord(value)) {
      Object.entries(value).forEach(([metricKey, metricValue]) => {
        acc[`performance.${metricKey}`] = toDisplayValue(metricValue);
      });
      return acc;
    }

    acc[key] = toDisplayValue(value);
    return acc;
  }, {});
};

const getSeverity = (eventType: string): DiagnosticSeverity => {
  if (ERROR_EVENTS.has(eventType)) return 'error';
  if (WARNING_EVENTS.has(eventType)) return 'warning';
  if (SUCCESS_EVENTS.has(eventType)) return 'success';
  return 'info';
};

const getDescription = (eventType: string, details: Record<string, string | number | boolean | null>) => {
  switch (eventType) {
    case 'participant_message_send_failed':
      return `The participant answer could not be saved at ${details.stage ?? 'an unknown stage'}.`;
    case 'participant_continuation_failed':
      return `The automatic facilitator continuation failed at ${details.stage ?? 'an unknown stage'}.`;
    case 'participant_continuation_check_failed':
      return `The participant-side recovery check could not complete at ${details.stage ?? 'an unknown stage'}.`;
    case 'participant_continuation_waiting_for_more_responses':
      return `The session is waiting for ${details.expected_participants ?? 'more'} expected participant response(s); ${details.respondent_count ?? 0} response(s) were detected.`;
    case 'participant_paused':
      return 'A participant paused their participation and may not be counted as actively responding.';
    case 'participant_skipped':
      return 'A participant skipped the current question, which may explain fewer answers than expected.';
    case 'participant_left':
      return 'A participant left the session.';
    case 'participant_message_send_started':
      return `A participant started sending an answer of ${details.message_length ?? 'unknown'} characters.`;
    case 'message_sent':
      return `A participant answer was saved with ${details.message_length ?? 'unknown'} characters.`;
    case 'ai_response_generated':
      return 'The facilitator generated the next response.';
    default:
      return EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ');
  }
};

const toDiagnosticEvent = (event: SessionEventRow): SessionDiagnosticEvent => {
  const details = sanitizeEventData(event.data);
  const participantIdValue = details.participant_id;
  const participantNameValue = details.participant_name;

  return {
    id: event.id,
    eventType: event.event_type,
    label: EVENT_LABELS[event.event_type] ?? event.event_type.replace(/_/g, ' '),
    description: getDescription(event.event_type, details),
    severity: getSeverity(event.event_type),
    createdAt: event.created_at,
    participantId: typeof participantIdValue === 'number' ? participantIdValue : null,
    participantName: typeof participantNameValue === 'string' ? participantNameValue : null,
    details,
  };
};

const createSummary = (events: SessionDiagnosticEvent[]): SessionDiagnosticsSummary => {
  const errorEvents = events.filter(event => event.severity === 'error').length;
  const warningEvents = events.filter(event => event.severity === 'warning').length;
  const blockerEvents = events.filter(event => BLOCKER_EVENTS.has(event.eventType)).length;
  const lastBlocker = events.find(event => BLOCKER_EVENTS.has(event.eventType));

  let health: SessionDiagnosticsSummary['health'] = 'healthy';
  let healthLabel = 'No obvious blockers detected';

  if (events.length === 0) {
    health = 'empty';
    healthLabel = 'No diagnostic events yet';
  } else if (errorEvents > 0) {
    health = 'error';
    healthLabel = 'Errors detected';
  } else if (warningEvents > 0) {
    health = 'warning';
    healthLabel = 'Potential blocker detected';
  }

  return {
    health,
    healthLabel,
    totalEvents: events.length,
    participantEvents: events.filter(event => PARTICIPANT_EVENTS.has(event.eventType)).length,
    blockerEvents,
    errorEvents,
    warningEvents,
    messageEvents: events.filter(event => MESSAGE_EVENTS.has(event.eventType)).length,
    lastEventAt: events[0]?.createdAt ?? null,
    lastBlockerAt: lastBlocker?.createdAt ?? null,
  };
};

interface UseSessionDiagnosticsOptions {
  conversationId: number;
  realtime?: boolean;
  limit?: number;
}

export const useSessionDiagnostics = ({
  conversationId,
  realtime = false,
  limit = 80,
}: UseSessionDiagnosticsOptions) => {
  const [events, setEvents] = useState<SessionDiagnosticEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: eventsError } = await api
        .from('session_events')
        .select('id, conversation_id, event_type, data, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventsError) throw eventsError;

      const rows = Array.isArray(data) ? (data as SessionEventRow[]) : [];
      setEvents(rows.map(toDiagnosticEvent));
    } catch (err) {
      console.error('Error loading session diagnostics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session diagnostics');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, limit]);

  useEffect(() => {
    fetchDiagnostics();

    if (!realtime) return;

    const channel = api
      .channel(`session-diagnostics-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        fetchDiagnostics();
      })
      .subscribe();

    return () => {
      api.removeChannel(channel);
    };
  }, [conversationId, realtime, fetchDiagnostics]);

  const summary = useMemo(() => createSummary(events), [events]);

  return {
    events,
    summary,
    isLoading,
    error,
    refetch: fetchDiagnostics,
  };
};
