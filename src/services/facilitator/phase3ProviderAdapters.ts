import type { FacilitatorAvatarState, FacilitatorTtsStatus, SpeechTurnSource } from '@/types/facilitator';

export type Phase3ProviderKind = 'browser' | 'server' | 'external';
export type Phase3ProviderStatus = 'available' | 'disabled' | 'unconfigured' | 'error';
export type Phase3ProviderMode = 'browser' | 'disabled' | 'server' | 'external';

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

export interface Phase3ProviderConfig {
  sttProvider?: string | null;
  ttsProvider?: string | null;
  avatarProvider?: string | null;
  lipSyncProvider?: string | null;
  sttEndpoint?: string | null;
  ttsEndpoint?: string | null;
  avatarEndpoint?: string | null;
  analyticsEndpoint?: string | null;
  snapshotIntervalSeconds?: number | null;
}

const normalizeProviderMode = (value?: string | null, fallback: Phase3ProviderMode = 'browser'): Phase3ProviderMode => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'disabled') return 'disabled';
  if (normalized === 'server') return 'server';
  if (normalized === 'external') return 'external';
  if (normalized === 'browser') return 'browser';
  return fallback;
};

const providerDescriptorFromConfig = ({
  id,
  label,
  configuredMode,
  enabled,
  endpoint,
  browserCapabilities,
  providerCapabilities,
  browserDetail,
  providerDetail,
}: {
  id: string;
  label: string;
  configuredMode?: string | null;
  enabled: boolean;
  endpoint?: string | null;
  browserCapabilities: string[];
  providerCapabilities: string[];
  browserDetail: string;
  providerDetail: string;
}): Phase3ProviderDescriptor => {
  const mode = normalizeProviderMode(configuredMode);
  if (!enabled || mode === 'disabled') {
    return { id, label, kind: mode === 'external' ? 'external' : mode === 'server' ? 'server' : 'browser', status: 'disabled', capabilities: [] };
  }

  if (mode === 'browser') {
    return { id, label, kind: 'browser', status: 'available', capabilities: browserCapabilities, detail: browserDetail };
  }

  const hasEndpoint = Boolean(endpoint?.trim());
  return {
    id,
    label,
    kind: mode,
    status: hasEndpoint ? 'available' : 'unconfigured',
    capabilities: providerCapabilities,
    detail: hasEndpoint ? providerDetail : 'Provider mode is selected but no endpoint is configured; browser fallback should remain enabled until deployment configuration is complete.',
  };
};

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
  providerConfig?: Phase3ProviderConfig;
}): Phase3RuntimeAdapterPlan {
  const speechEnabled = settings.speechStackEnabled ?? true;
  const ttsEnabled = settings.ttsAvatarEnabled ?? true;
  const analyticsEnabled = settings.analyticsEnabled ?? true;
  const providerConfig = settings.providerConfig ?? {};
  const snapshotIntervalSeconds = providerConfig.snapshotIntervalSeconds ?? settings.snapshotIntervalSeconds ?? 120;

  return {
    stt: providerDescriptorFromConfig({
      id: 'speech_to_text_runtime',
      label: 'Speech-to-text runtime',
      configuredMode: providerConfig.sttProvider,
      enabled: speechEnabled,
      endpoint: providerConfig.sttEndpoint,
      browserCapabilities: ['interim_transcripts', 'final_transcripts', 'local_microphone_permission'],
      providerCapabilities: ['audio_stream_ingest', 'server_transcription', 'transcript_reconciliation'],
      browserDetail: 'Browser speech recognition fallback is active; no raw audio leaves the browser.',
      providerDetail: 'Provider STT endpoint is configured and can replace browser capture without changing the session UI contract.',
    }),
    tts: providerDescriptorFromConfig({
      id: 'text_to_speech_runtime',
      label: 'Text-to-speech runtime',
      configuredMode: providerConfig.ttsProvider,
      enabled: ttsEnabled,
      endpoint: providerConfig.ttsEndpoint,
      browserCapabilities: ['voice_playback', 'lifecycle_events', 'voice_id_selection'],
      providerCapabilities: ['generated_audio_assets', 'server_queue', 'retryable_lifecycle_events'],
      browserDetail: 'Browser speech synthesis fallback is active.',
      providerDetail: 'Provider TTS endpoint is configured and can emit generated audio URLs into the shared TTS event model.',
    }),
    avatar: providerDescriptorFromConfig({
      id: 'avatar_embodiment_runtime',
      label: 'Avatar embodiment runtime',
      configuredMode: providerConfig.avatarProvider,
      enabled: ttsEnabled,
      endpoint: providerConfig.avatarEndpoint,
      browserCapabilities: settings.lipSyncEnabled === false ? ['state_cues'] : ['state_cues', 'estimated_lip_sync_markers'],
      providerCapabilities: settings.lipSyncEnabled === false ? ['state_cues', 'avatar_playback_cues'] : ['avatar_playback_cues', 'provider_lip_sync_markers'],
      browserDetail: 'Runtime avatar state renderer is active with browser-side visual cues.',
      providerDetail: 'Avatar provider endpoint is configured and can render generated playback cues.',
    }),
    analytics: {
      id: 'facilitation_analytics_runtime',
      label: 'Facilitation analytics snapshots',
      kind: providerConfig.analyticsEndpoint ? 'server' : 'browser',
      status: analyticsEnabled ? 'available' : 'disabled',
      capabilities: providerConfig.analyticsEndpoint
        ? ['snapshot_persistence', 'scheduled_rollups', 'dashboard_drilldowns']
        : ['snapshot_persistence', 'participant_balance', 'topic_drift', 'tts_completion_rate'],
      detail: providerConfig.analyticsEndpoint
        ? 'Analytics endpoint is configured for deployment rollups.'
        : 'Deterministic client-side analytics remain active with persisted snapshots.',
    },
    snapshotSchedule: {
      enabled: analyticsEnabled,
      cadence: analyticsEnabled && providerConfig.analyticsEndpoint ? 'interval' : analyticsEnabled ? 'on_event' : 'manual',
      intervalSeconds: snapshotIntervalSeconds,
      retentionDays: 90,
    },
  };
}
