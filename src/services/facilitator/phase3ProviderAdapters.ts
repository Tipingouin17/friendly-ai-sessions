import type { FacilitatorAvatarState, FacilitatorTtsStatus, SpeechTurnSource } from '@/types/facilitator';

export type Phase3ProviderKind = 'browser' | 'server' | 'external';
export type Phase3ProviderStatus = 'available' | 'disabled' | 'unconfigured' | 'error';

export interface Phase3ProviderDescriptor {
  id: string;
  label: string;
  kind: Phase3ProviderKind;
  status: Phase3ProviderStatus;
  capabilities: string[];
  detail?: string;
}

export interface SttTranscriptSegment {
  transcript: string;
  confidence: number | null;
  language: string;
  isFinal: boolean;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMs?: number | null;
  speakerLabel?: string | null;
  source: SpeechTurnSource | 'provider_stream';
}

export interface TtsSynthesisRequest {
  text: string;
  voiceId?: string | null;
  language?: string | null;
  lipSyncEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TtsSynthesisResult {
  provider: string;
  status: FacilitatorTtsStatus;
  audioUrl?: string | null;
  audioDurationMs?: number | null;
  voiceId?: string | null;
  lipSyncMarkers: LipSyncMarker[];
  metadata: Record<string, unknown>;
}

export interface LipSyncMarker {
  offsetMs: number;
  viseme: string;
  confidence?: number;
  source: string;
}

export interface AvatarPlaybackCue {
  avatarState: FacilitatorAvatarState;
  intensity: 'low' | 'medium' | 'high';
  expression: string;
  motion: string;
  lipSyncMarkers: LipSyncMarker[];
  audioUrl?: string | null;
}

export interface AnalyticsSnapshotSchedule {
  enabled: boolean;
  cadence: 'manual' | 'on_event' | 'interval';
  intervalSeconds?: number;
  retentionDays?: number;
}

export interface Phase3RuntimeAdapterPlan {
  stt: Phase3ProviderDescriptor;
  tts: Phase3ProviderDescriptor;
  avatar: Phase3ProviderDescriptor;
  analytics: Phase3ProviderDescriptor;
  snapshotSchedule: AnalyticsSnapshotSchedule;
}

export function estimateLipSyncMarkers(text: string, enabled = true): LipSyncMarker[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!enabled || words.length === 0) return [];

  return words.slice(0, 80).map((word, index) => ({
    offsetMs: index * 260,
    viseme: /[aeiou]/i.test(word) ? 'open' : 'closed',
    confidence: 0.42,
    source: 'estimated_from_text',
  }));
}

export function buildBrowserTtsSynthesisResult(request: TtsSynthesisRequest): TtsSynthesisResult {
  const text = request.text.trim();
  const estimatedDurationMs = text ? Math.max(700, Math.round(text.length * 55)) : null;

  return {
    provider: 'browser_speech_synthesis',
    status: text ? 'queued' : 'failed',
    audioUrl: null,
    audioDurationMs: estimatedDurationMs,
    voiceId: request.voiceId ?? null,
    lipSyncMarkers: estimateLipSyncMarkers(text, request.lipSyncEnabled ?? true),
    metadata: {
      ...request.metadata,
      characterCount: text.length,
      providerMode: 'browser_mvp',
      generatedAudioAsset: false,
    },
  };
}

export function buildAvatarPlaybackCue(result: TtsSynthesisResult): AvatarPlaybackCue {
  const hasAudioOrMarkers = Boolean(result.audioUrl || result.lipSyncMarkers.length > 0);

  return {
    avatarState: result.status === 'failed' ? 'error' : hasAudioOrMarkers ? 'speaking' : 'thinking',
    intensity: hasAudioOrMarkers ? 'high' : 'medium',
    expression: result.status === 'failed' ? 'concerned' : 'speaking',
    motion: hasAudioOrMarkers ? 'speaking' : 'thinking',
    lipSyncMarkers: result.lipSyncMarkers,
    audioUrl: result.audioUrl ?? null,
  };
}

export function buildPhase3RuntimeAdapterPlan(settings: {
  speechStackEnabled?: boolean;
  ttsAvatarEnabled?: boolean;
  lipSyncEnabled?: boolean;
  analyticsEnabled?: boolean;
  snapshotIntervalSeconds?: number;
}): Phase3RuntimeAdapterPlan {
  const speechEnabled = settings.speechStackEnabled ?? true;
  const ttsEnabled = settings.ttsAvatarEnabled ?? true;
  const analyticsEnabled = settings.analyticsEnabled ?? true;

  return {
    stt: {
      id: 'browser_speech_recognition',
      label: 'Browser speech recognition fallback',
      kind: 'browser',
      status: speechEnabled ? 'available' : 'disabled',
      capabilities: ['interim_transcripts', 'final_transcripts', 'local_microphone_permission'],
      detail: 'Production provider adapters can replace this descriptor without changing the session UI contract.',
    },
    tts: {
      id: 'browser_speech_synthesis',
      label: 'Browser speech synthesis fallback',
      kind: 'browser',
      status: ttsEnabled ? 'available' : 'disabled',
      capabilities: ['voice_playback', 'lifecycle_events', 'voice_id_selection'],
      detail: 'Server-side TTS should emit generated audio URLs and provider lip-sync marker payloads into the same event model.',
    },
    avatar: {
      id: 'runtime_avatar_state_renderer',
      label: 'Runtime avatar state renderer',
      kind: 'browser',
      status: ttsEnabled ? 'available' : 'disabled',
      capabilities: settings.lipSyncEnabled === false ? ['state_cues'] : ['state_cues', 'estimated_lip_sync_markers'],
    },
    analytics: {
      id: 'deterministic_facilitation_analytics',
      label: 'Deterministic facilitation analytics snapshots',
      kind: 'server',
      status: analyticsEnabled ? 'available' : 'disabled',
      capabilities: ['snapshot_persistence', 'participant_balance', 'topic_drift', 'tts_completion_rate'],
    },
    snapshotSchedule: {
      enabled: analyticsEnabled,
      cadence: analyticsEnabled ? 'on_event' : 'manual',
      intervalSeconds: settings.snapshotIntervalSeconds ?? 120,
      retentionDays: 90,
    },
  };
}
