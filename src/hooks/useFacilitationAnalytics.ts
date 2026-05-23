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

export interface FacilitationTimelineBucket {
  label: string;
  speechTurns: number;
  spokenWords: number;
  ttsEvents: number;
  averageConfidence: number | null;
}

export interface FacilitationInsightFlags {
  lowParticipationCoverage: boolean;
  imbalancedParticipation: boolean;
  elevatedTopicDrift: boolean;
  lowTtsCompletion: boolean;
  longSilenceDetected: boolean;
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
  failedTtsRate: number;
  averageWordsPerTurn: number;
  estimatedSilenceGapCount: number;
  longestSilenceGapMs: number | null;
  facilitatorResponseCount: number;
  facilitatorResponsivenessScore: number;
  timelineBuckets: FacilitationTimelineBucket[];
  insightFlags: FacilitationInsightFlags;
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

function calculateTimelineBuckets(
  turns: SessionSpeechTurn[],
  ttsEvents: FacilitatorTtsEvent[],
  bucketMinutes = 5
): FacilitationTimelineBucket[] {
  const bucketMs = bucketMinutes * 60 * 1000;
  const buckets = new Map<number, { speechTurns: number; spokenWords: number; ttsEvents: number; confidenceTotal: number; confidenceCount: number }>();

  const ensureBucket = (timestamp: string | null | undefined) => {
    const dateMs = timestamp ? Date.parse(timestamp) : NaN;
    const bucket = Number.isFinite(dateMs) ? Math.floor(dateMs / bucketMs) * bucketMs : 0;
    const current = buckets.get(bucket) ?? { speechTurns: 0, spokenWords: 0, ttsEvents: 0, confidenceTotal: 0, confidenceCount: 0 };
    buckets.set(bucket, current);
    return current;
  };

  turns.forEach((turn) => {
    const bucket = ensureBucket(turn.created_at ?? turn.ended_at);
    bucket.speechTurns += 1;
    bucket.spokenWords += countWords(turn.transcript);
    if (typeof turn.confidence === 'number') {
      bucket.confidenceTotal += turn.confidence;
      bucket.confidenceCount += 1;
    }
  });

  ttsEvents.forEach((event) => {
    const bucket = ensureBucket(event.created_at ?? event.started_at);
    bucket.ttsEvents += 1;
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([timestamp, bucket]) => ({
      label: timestamp > 0 ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unscheduled',
      speechTurns: bucket.speechTurns,
      spokenWords: bucket.spokenWords,
      ttsEvents: bucket.ttsEvents,
      averageConfidence: bucket.confidenceCount > 0 ? clampScore(bucket.confidenceTotal / bucket.confidenceCount) : null,
    }));
}

function calculateSilenceGaps(turns: SessionSpeechTurn[], thresholdMs = 45_000): { count: number; longestMs: number | null } {
  const sorted = [...turns]
    .map((turn) => Date.parse(turn.ended_at ?? turn.created_at ?? ''))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (sorted.length < 2) return { count: 0, longestMs: null };

  let count = 0;
  let longestMs = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const gap = sorted[index] - sorted[index - 1];
    if (gap >= thresholdMs) count += 1;
    longestMs = Math.max(longestMs, gap);
  }
  return { count, longestMs: longestMs > 0 ? longestMs : null };
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
  const failedTtsRate = ttsEvents.length > 0
    ? clampScore(ttsEvents.filter(event => event.status === 'failed' || event.status === 'cancelled').length / ttsEvents.length)
    : 0;
  const averageWordsPerTurn = turns.length > 0 ? Math.round(spokenWordCount / turns.length) : 0;
  const silenceGaps = calculateSilenceGaps(turns);
  const facilitatorResponseCount = ttsEvents.filter(event => event.status === 'completed' || event.status === 'speaking').length;
  const facilitatorResponsivenessScore = turns.length > 0
    ? clampScore(Math.min(facilitatorResponseCount, turns.length) / turns.length)
    : 0;
  const timelineBuckets = calculateTimelineBuckets(turns, ttsEvents);
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
    failedTtsRate,
    averageWordsPerTurn,
    estimatedSilenceGapCount: silenceGaps.count,
    longestSilenceGapMs: silenceGaps.longestMs,
    facilitatorResponseCount,
    facilitatorResponsivenessScore,
    timelineBuckets,
    insightFlags: {
      lowParticipationCoverage: participationCoverage < 0.6,
      imbalancedParticipation: participantBalance < 0.55,
      elevatedTopicDrift: topicDriftScore > 0.55,
      lowTtsCompletion: ttsEvents.length > 0 && completedTtsRate < 0.8,
      longSilenceDetected: silenceGaps.count > 0,
    },
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
            failedTtsRate: nextAnalytics.failedTtsRate,
            averageWordsPerTurn: nextAnalytics.averageWordsPerTurn,
            estimatedSilenceGapCount: nextAnalytics.estimatedSilenceGapCount,
            longestSilenceGapMs: nextAnalytics.longestSilenceGapMs,
            facilitatorResponseCount: nextAnalytics.facilitatorResponseCount,
            facilitatorResponsivenessScore: nextAnalytics.facilitatorResponsivenessScore,
            timelineBuckets: nextAnalytics.timelineBuckets,
            insightFlags: nextAnalytics.insightFlags,
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
      ttsCompletionPercent: Math.round(analytics.completedTtsRate * 100),
      responsivenessPercent: Math.round(analytics.facilitatorResponsivenessScore * 100),
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
