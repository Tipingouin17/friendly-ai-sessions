import api from '@/lib/api';
import type {
  FacilitatorAvatarState,
  FacilitatorTtsEvent,
  FacilitatorTtsStatus,
  SessionFacilitationAnalyticsSnapshot,
  SessionSpeechTurn,
  SpeechSpeakerRole,
  SpeechTurnSource,
} from '@/types/facilitator';

export interface SpeechTurnInput {
  conversationId: number;
  facilitatorId?: number | null;
  participantId?: number | null;
  speakerRole?: SpeechSpeakerRole;
  transcript: string;
  confidence?: number | null;
  language?: string;
  isFinal?: boolean;
  source?: SpeechTurnSource;
  durationMs?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  metrics?: Record<string, unknown>;
}

export interface TtsEventInput {
  conversationId: number;
  facilitatorId?: number | null;
  messageId?: string | null;
  provider?: string;
  voiceId?: string | null;
  textExcerpt?: string | null;
  status?: FacilitatorTtsStatus;
  avatarState?: FacilitatorAvatarState | string;
  audioDurationMs?: number | null;
  lipSyncMarkers?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface AnalyticsSnapshotInput {
  conversationId: number;
  facilitatorId?: number | null;
  speechTurnCount: number;
  ttsEventCount: number;
  participantBalance?: number | null;
  participationCoverage?: number | null;
  topicDriftScore?: number | null;
  facilitationHealthScore?: number | null;
  snapshot: Record<string, unknown>;
  analyticsVersion?: string;
}

const nowIso = () => new Date().toISOString();

const clampNullableScore = (score?: number | null): number | null => {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
};

export async function recordSpeechTurn(input: SpeechTurnInput): Promise<SessionSpeechTurn | null> {
  const transcript = input.transcript.trim();
  if (!input.conversationId || !transcript) return null;

  const row: Partial<SessionSpeechTurn> = {
    conversation_id: input.conversationId,
    facilitator_id: input.facilitatorId ?? null,
    participant_id: input.participantId ?? null,
    speaker_role: input.speakerRole ?? 'participant',
    transcript,
    confidence: clampNullableScore(input.confidence),
    language: input.language || 'en-US',
    is_final: input.isFinal ?? true,
    source: input.source ?? 'browser_speech_recognition',
    duration_ms: input.durationMs ?? null,
    started_at: input.startedAt ?? null,
    ended_at: input.endedAt ?? nowIso(),
    metrics: input.metrics ?? {},
  };

  const { data, error } = await api
    .from<SessionSpeechTurn>('session_speech_turns')
    .insert(row)
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[phase3RuntimeService] Could not persist speech turn:', error.message);
    return null;
  }

  return (data as SessionSpeechTurn | null) ?? null;
}

export async function recordTtsEvent(input: TtsEventInput): Promise<FacilitatorTtsEvent | null> {
  if (!input.conversationId) return null;

  const serializedMessageId = input.messageId != null ? String(input.messageId) : null;
  const row: Partial<FacilitatorTtsEvent> = {
    conversation_id: input.conversationId,
    facilitator_id: input.facilitatorId ?? null,
    message_id: serializedMessageId,
    provider: input.provider ?? 'browser_speech_synthesis',
    voice_id: input.voiceId ?? null,
    text_excerpt: input.textExcerpt?.slice(0, 500) ?? null,
    status: input.status ?? 'queued',
    avatar_state: input.avatarState ?? 'speaking',
    audio_duration_ms: input.audioDurationMs ?? null,
    lip_sync_markers: input.lipSyncMarkers ?? [],
    metadata: input.metadata ?? {},
    started_at: input.startedAt ?? null,
    completed_at: input.completedAt ?? null,
  };

  const { data, error } = await api
    .from<FacilitatorTtsEvent>('facilitator_tts_events')
    .insert(row)
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[phase3RuntimeService] Could not persist TTS event:', error.message);
    return null;
  }

  return (data as FacilitatorTtsEvent | null) ?? null;
}

export async function hasTtsEventForMessage(conversationId: number | null | undefined, messageId: string | number | null | undefined): Promise<boolean> {
  if (!conversationId || messageId == null) return false;

  const serializedMessageId = String(messageId);
  const { data, error } = await api
    .from<FacilitatorTtsEvent>('facilitator_tts_events')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('message_id', serializedMessageId)
    .limit(1);

  if (error) {
    console.warn('[phase3RuntimeService] Could not check TTS event replay guard:', error.message);
    return false;
  }

  return Array.isArray(data) ? data.length > 0 : Boolean(data);
}

export async function updateTtsEventStatus(
  id: number | undefined,
  status: FacilitatorTtsStatus,
  patch: Partial<Pick<FacilitatorTtsEvent, 'audio_duration_ms' | 'completed_at' | 'metadata'>> = {}
): Promise<void> {
  if (!id) return;
  const nextPatch: Partial<FacilitatorTtsEvent> = {
    status,
    ...patch,
    completed_at: patch.completed_at ?? (status === 'completed' || status === 'cancelled' || status === 'failed' ? nowIso() : undefined),
  };

  const { error } = await api
    .from<FacilitatorTtsEvent>('facilitator_tts_events')
    .update(nextPatch)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[phase3RuntimeService] Could not update TTS event:', error.message);
  }
}

export async function upsertFacilitationAnalytics(
  input: AnalyticsSnapshotInput
): Promise<SessionFacilitationAnalyticsSnapshot | null> {
  if (!input.conversationId) return null;

  const row: Partial<SessionFacilitationAnalyticsSnapshot> = {
    conversation_id: input.conversationId,
    facilitator_id: input.facilitatorId ?? null,
    analytics_version: input.analyticsVersion ?? 'phase3.v1',
    speech_turn_count: Math.max(0, input.speechTurnCount),
    tts_event_count: Math.max(0, input.ttsEventCount),
    participant_balance: clampNullableScore(input.participantBalance),
    participation_coverage: clampNullableScore(input.participationCoverage),
    topic_drift_score: clampNullableScore(input.topicDriftScore),
    facilitation_health_score: clampNullableScore(input.facilitationHealthScore),
    snapshot: input.snapshot,
    updated_at: nowIso(),
  };

  const { data, error } = await api
    .from<SessionFacilitationAnalyticsSnapshot>('session_facilitation_analytics')
    .upsert(row, { onConflict: 'conversation_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[phase3RuntimeService] Could not persist analytics snapshot:', error.message);
    return null;
  }

  return (data as SessionFacilitationAnalyticsSnapshot | null) ?? null;
}
