export interface SessionAnalyticsMetrics {
  totalEvents: number;
  participantJoins: number;
  participantLeaves: number;
  uniqueParticipants: number;
  reconnectEvents: number;
  messagesSent: number;
  aiResponses: number;
  adminActions: number;
  averageResponseTime: number;
  sessionDuration: number;
  engagementScore: number;
  errorCount: number;
}

export interface SessionEventAnalyticsRow {
  event_type: string | null;
  created_at: string;
  data?: Record<string, unknown> | null;
}

export interface SessionParticipantAnalyticsRow {
  participant_id: string | number | null;
  is_host?: boolean | null;
}

export interface ParticipantSnapshot {
  attendeeParticipants: number;
  hostParticipants: number;
  totalRows: number;
}

const EMPTY_ANALYTICS: SessionAnalyticsMetrics = {
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
  errorCount: 0,
};

const normalizeParticipantId = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const getParticipantIdFromEvent = (event: SessionEventAnalyticsRow): string | null => {
  const eventData = event.data || {};
  return normalizeParticipantId(
    eventData.participant_id
      ?? eventData.participantId
      ?? eventData.user_id
      ?? eventData.userId
  );
};

const isHostOrAdminEvent = (event: SessionEventAnalyticsRow): boolean => {
  const eventData = event.data || {};
  const roleCandidate = String(
    eventData.role
      ?? eventData.participant_role
      ?? eventData.participantRole
      ?? eventData.actor_role
      ?? eventData.actorRole
      ?? ''
  ).toLowerCase();

  return eventData.is_host === true
    || eventData.isHost === true
    || eventData.is_admin === true
    || eventData.isAdmin === true
    || roleCandidate === 'host'
    || roleCandidate === 'admin'
    || roleCandidate === 'facilitator';
};

const isParticipantHistoricalEvent = (event: SessionEventAnalyticsRow): boolean => {
  if (!getParticipantIdFromEvent(event) || isHostOrAdminEvent(event)) return false;
  const eventType = event.event_type || '';
  return eventType.startsWith('participant_')
    || eventType === 'message_sent'
    || eventType === 'reaction_sent'
    || eventType === 'response_submitted'
    || eventType === 'poll_response_submitted';
};

const extractResponseTime = (eventData: Record<string, unknown> | null | undefined): number => {
  const performanceMetrics = eventData?.performance_metrics;
  if (!performanceMetrics || typeof performanceMetrics !== 'object') return 0;
  const responseTime = (performanceMetrics as Record<string, unknown>).responseTime;
  return typeof responseTime === 'number' && Number.isFinite(responseTime) ? responseTime : 0;
};

export const summarizeParticipantSnapshot = (participantRows: SessionParticipantAnalyticsRow[] = []): ParticipantSnapshot => {
  const attendeeIds = new Set<string>();
  const hostIds = new Set<string>();

  participantRows.forEach((participant) => {
    const participantId = normalizeParticipantId(participant.participant_id);
    if (!participantId) return;
    if (participant.is_host) {
      hostIds.add(participantId);
    } else {
      attendeeIds.add(participantId);
    }
  });

  return {
    attendeeParticipants: attendeeIds.size,
    hostParticipants: hostIds.size,
    totalRows: participantRows.length,
  };
};

export const calculateSessionAnalyticsMetrics = (
  events: SessionEventAnalyticsRow[] = [],
  participantRows: SessionParticipantAnalyticsRow[] = [],
): SessionAnalyticsMetrics => {
  const participantSnapshot = summarizeParticipantSnapshot(participantRows);
  const participantIdsFromRows = new Set<string>();

  participantRows.forEach((participant) => {
    const participantId = normalizeParticipantId(participant.participant_id);
    if (participantId && !participant.is_host) participantIdsFromRows.add(participantId);
  });

  if (events.length === 0) {
    return {
      ...EMPTY_ANALYTICS,
      uniqueParticipants: participantSnapshot.attendeeParticipants,
    };
  }

  const totalEvents = events.length;
  const participantJoins = events.filter((event) => event.event_type === 'participant_joined').length;
  const participantLeaves = events.filter((event) => event.event_type === 'participant_left').length;
  const messagesSent = events.filter((event) => event.event_type === 'message_sent').length;
  const aiResponses = events.filter((event) => event.event_type === 'ai_response_generated').length;
  const adminActions = events.filter((event) => event.event_type === 'admin_action').length;
  const errorEvents = events.filter((event) => event.event_type === 'error').length;

  const aiResponseEvents = events.filter((event) => event.event_type === 'ai_response_generated' && extractResponseTime(event.data) > 0);
  const averageResponseTime = aiResponseEvents.length > 0
    ? aiResponseEvents.reduce((sum, event) => sum + extractResponseTime(event.data), 0) / aiResponseEvents.length
    : 0;

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const firstEventTime = firstEvent ? new Date(firstEvent.created_at).getTime() : 0;
  const lastEventTime = lastEvent ? new Date(lastEvent.created_at).getTime() : 0;
  const sessionDuration = firstEventTime > 0 && lastEventTime >= firstEventTime
    ? lastEventTime - firstEventTime
    : 0;

  const participantIdsFromEvents = new Set(
    events
      .filter(isParticipantHistoricalEvent)
      .map(getParticipantIdFromEvent)
      .filter((participantId): participantId is string => Boolean(participantId))
  );

  const uniqueParticipants = new Set([...participantIdsFromRows, ...participantIdsFromEvents]).size;
  const reconnectEvents = Math.max(0, participantJoins - uniqueParticipants);
  const engagementScore = uniqueParticipants > 0 ? messagesSent / uniqueParticipants : 0;

  return {
    totalEvents,
    participantJoins,
    participantLeaves,
    uniqueParticipants,
    reconnectEvents,
    messagesSent,
    aiResponses,
    adminActions,
    averageResponseTime: Math.round(averageResponseTime),
    sessionDuration: Math.round(sessionDuration / 1000),
    engagementScore: Math.round(engagementScore * 100) / 100,
    errorCount: errorEvents,
  };
};
