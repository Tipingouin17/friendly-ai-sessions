import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import type {
  FacilitatorTtsEvent,
  SessionFacilitationAnalyticsSnapshot,
  SessionSpeechTurn,
} from '@/types/facilitator';
import { upsertFacilitationAnalytics } from '@/services/facilitator/phase3RuntimeService';

export interface ParticipantSpeechMetric {
  participantId: number | null;
  label: string;
  turnCount: number;
  wordCount: number;
  share: number;
}

interface SessionParticipantRosterRow {
  id: number;
}

export interface FacilitationAnalytics {
  conversationId: number;
  speechTurnCount: number;
  ttsEventCount: number;
  spokenWordCount: number;
  participantBalance: number;
  participationCoverage: number;
  topicDriftScore: number;
  facilitationHealthScore: number;
  averageSpeechConfidence: number | null;
  averageSpeechDurationMs: number | null;
  completedTtsRate: number;
  participantMetrics: ParticipantSpeechMetric[];
  lastSpeechAt: string | null;
  lastTtsAt: string | null;
  persistedSnapshot: SessionFacilitationAnalyticsSnapshot | null;
}

interface UseFacilitationAnalyticsOptions {
  conversationId: number | null;
  facilitatorId?: number | null;
  realtime?: boolean;
  persist?: boolean;
}

const clampScore = (value: number): number => Math.max(0, Math.min(1, Number(value.toFixed(4))));

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

function calculateParticipantBalance(metrics: ParticipantSpeechMetric[]): number {
  if (metrics.length <= 1) return metrics.length === 1 ? 1 : 0;
  const idealShare = 1 / metrics.length;
  const totalDeviation = metrics.reduce((sum, metric) => sum + Math.abs(metric.share - idealShare), 0);
  const maxDeviation = 2 * (1 - idealShare);
  return clampScore(1 - totalDeviation / maxDeviation);
}

function calculateTopicDriftScore(turns: SessionSpeechTurn[]): number {
  if (turns.length < 4) return 0;
  const recent = turns.slice(0, 8).map((turn) => turn.transcript.toLowerCase());
  const earlier = turns.slice(8, 20).map((turn) => turn.transcript.toLowerCase());
  if (earlier.length === 0) return 0;

  const tokenize = (items: string[]) => new Set(items.join(' ').split(/[^a-z0-9]+/).filter(token => token.length > 4));
  const recentTokens = tokenize(recent);
  const earlierTokens = tokenize(earlier);
  if (recentTokens.size === 0 || earlierTokens.size === 0) return 0;

  const overlap = Array.from(recentTokens).filter(token => earlierTokens.has(token)).length;
  const union = new Set([...Array.from(recentTokens), ...Array.from(earlierTokens)]).size;
  return clampScore(1 - overlap / Math.max(1, union));
}

function buildAnalytics(
  conversationId: number,
  turns: SessionSpeechTurn[],
  ttsEvents: FacilitatorTtsEvent[],
  participants: SessionParticipantRosterRow[],
  persistedSnapshot: SessionFacilitationAnalyticsSnapshot | null
): FacilitationAnalytics {
  const participantMap = new Map<string, ParticipantSpeechMetric>();
  let spokenWordCount = 0;

  turns.forEach((turn) => {
    const participantKey = String(turn.participant_id ?? turn.speaker_role ?? 'unknown');
    const label = turn.participant_id ? `Participant ${turn.participant_id}` : turn.speaker_role;
    const wordCount = countWords(turn.transcript);
    spokenWordCount += wordCount;
    const current = participantMap.get(participantKey) ?? {
      participantId: turn.participant_id ?? null,
      label,
      turnCount: 0,
      wordCount: 0,
      share: 0,
    };
    current.turnCount += 1;
    current.wordCount += wordCount;
    participantMap.set(participantKey, current);
  });

  const participantMetrics = Array.from(participantMap.values())
    .map((metric) => ({ ...metric, share: spokenWordCount > 0 ? clampScore(metric.wordCount / spokenWordCount) : 0 }))
    .sort((a, b) => b.wordCount - a.wordCount);

  const participantBalance = calculateParticipantBalance(participantMetrics);
  const activeParticipantIds = new Set(
    turns
      .map(turn => turn.participant_id)
      .filter((participantId): participantId is number => typeof participantId === 'number')
  );
  const rosterCount = participants.length;
  const participationCoverage = rosterCount > 0
    ? clampScore(activeParticipantIds.size / rosterCount)
    : turns.length > 0
      ? clampScore(participantMetrics.length > 0 ? 1 : 0)
      : 0;
  const topicDriftScore = calculateTopicDriftScore(turns);
  const confidenceValues = turns.map(turn => turn.confidence).filter((value): value is number => typeof value === 'number');
  const durationValues = turns.map(turn => turn.duration_ms).filter((value): value is number => typeof value === 'number' && value >= 0);
  const averageSpeechConfidence = confidenceValues.length > 0
    ? clampScore(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
    : null;
  const averageSpeechDurationMs = durationValues.length > 0
    ? Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length)
    : null;
  const completedTtsRate = ttsEvents.length > 0
    ? clampScore(ttsEvents.filter(event => event.status === 'completed').length / ttsEvents.length)
    : 0;
  const facilitationHealthScore = clampScore(
    (participantBalance * 0.35) +
    (participationCoverage * 0.25) +
    ((1 - topicDriftScore) * 0.2) +
    (completedTtsRate * 0.2)
  );

  return {
    conversationId,
    speechTurnCount: turns.length,
    ttsEventCount: ttsEvents.length,
    spokenWordCount,
    participantBalance,
    participationCoverage,
    topicDriftScore,
    facilitationHealthScore,
    averageSpeechConfidence,
    averageSpeechDurationMs,
    completedTtsRate,
    participantMetrics,
    lastSpeechAt: turns[0]?.created_at ?? null,
    lastTtsAt: ttsEvents[0]?.created_at ?? null,
    persistedSnapshot,
  };
}

export function useFacilitationAnalytics({
  conversationId,
  facilitatorId = null,
  realtime = false,
  persist = true,
}: UseFacilitationAnalyticsOptions) {
  const [analytics, setAnalytics] = useState<FacilitationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!conversationId) {
      setAnalytics(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [speechResponse, ttsResponse, participantResponse, snapshotResponse] = await Promise.all([
        api.from<SessionSpeechTurn>('session_speech_turns')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false }),
        api.from<FacilitatorTtsEvent>('facilitator_tts_events')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false }),
        api.from<SessionParticipantRosterRow>('session_participants')
          .select('id')
          .eq('conversation_id', conversationId),
        api.from<SessionFacilitationAnalyticsSnapshot>('session_facilitation_analytics')
          .select('*')
          .eq('conversation_id', conversationId)
          .maybeSingle(),
      ]);

      if (speechResponse.error) throw speechResponse.error;
      if (ttsResponse.error) throw ttsResponse.error;
      if (participantResponse.error) throw participantResponse.error;
      if (snapshotResponse.error) throw snapshotResponse.error;

      const nextAnalytics = buildAnalytics(
        conversationId,
        (speechResponse.data ?? []) as SessionSpeechTurn[],
        (ttsResponse.data ?? []) as FacilitatorTtsEvent[],
        (participantResponse.data ?? []) as SessionParticipantRosterRow[],
        (snapshotResponse.data as SessionFacilitationAnalyticsSnapshot | null) ?? null
      );
      setAnalytics(nextAnalytics);

      if (persist) {
        void upsertFacilitationAnalytics({
          conversationId,
          facilitatorId,
          speechTurnCount: nextAnalytics.speechTurnCount,
          ttsEventCount: nextAnalytics.ttsEventCount,
          participantBalance: nextAnalytics.participantBalance,
          participationCoverage: nextAnalytics.participationCoverage,
          topicDriftScore: nextAnalytics.topicDriftScore,
          facilitationHealthScore: nextAnalytics.facilitationHealthScore,
          snapshot: {
            spokenWordCount: nextAnalytics.spokenWordCount,
            averageSpeechConfidence: nextAnalytics.averageSpeechConfidence,
            averageSpeechDurationMs: nextAnalytics.averageSpeechDurationMs,
            completedTtsRate: nextAnalytics.completedTtsRate,
            participantMetrics: nextAnalytics.participantMetrics,
            lastSpeechAt: nextAnalytics.lastSpeechAt,
            lastTtsAt: nextAnalytics.lastTtsAt,
          },
        });
      }
    } catch (err) {
      console.error('Error loading facilitation analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load facilitation analytics');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, facilitatorId, persist]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!conversationId || !realtime) return;
    const channel = api
      .channel(`facilitation-analytics-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_speech_turns', filter: `conversation_id=eq.${conversationId}` }, () => void loadAnalytics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilitator_tts_events', filter: `conversation_id=eq.${conversationId}` }, () => void loadAnalytics())
      .subscribe();

    return () => api.removeChannel(channel);
  }, [conversationId, loadAnalytics, realtime]);

  const summary = useMemo(() => {
    if (!analytics) return null;
    return {
      healthPercent: Math.round(analytics.facilitationHealthScore * 100),
      balancePercent: Math.round(analytics.participantBalance * 100),
      coveragePercent: Math.round(analytics.participationCoverage * 100),
      driftPercent: Math.round(analytics.topicDriftScore * 100),
    };
  }, [analytics]);

  return {
    analytics,
    summary,
    isLoading,
    error,
    refetch: loadAnalytics,
  };
}
