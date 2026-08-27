import * as React from 'react';
import { toast } from 'sonner';
import type { FacilitatorAvatarState as RuntimeAvatarState } from '@/types/facilitatorRuntime';
import type { FacilitatorAvatarState } from '@/types/facilitator';
import type { FacilitatorVoiceGender } from '@/utils/facilitatorVoiceGender';
import { recordTtsEvent, updateTtsEventStatus } from '@/services/facilitator/phase3RuntimeService';
import { buildBrowserTtsSynthesisResult } from '@/services/facilitator/phase3ProviderAdapters';
import { api, getJoinToken } from '@/lib/api';

// ── Feature-flag env vars (set at build time via Vercel/Railway env) ──────────
// VITE_PHASE3_TTS_PROVIDER=server  → use server neural TTS (ElevenLabs via Railway)
// VITE_PHASE3_TTS_ENDPOINT=<url>   → absolute or relative URL for POST /api/tts/synthesize
// When provider is not 'server' or endpoint is absent, browser SpeechSynthesis is used.
const _TTS_PROVIDER = (import.meta.env.VITE_PHASE3_TTS_PROVIDER as string | undefined)?.trim() ?? 'browser';
const _TTS_ENDPOINT = (import.meta.env.VITE_PHASE3_TTS_ENDPOINT as string | undefined)?.trim() ?? '';

interface UseFacilitatorVoiceParams {
  conversationId?: number | null;
  facilitatorId?: number | null;
  enabled?: boolean;
  defaultVoiceId?: string | null;
  voiceGender?: FacilitatorVoiceGender | null;
  lipSyncEnabled?: boolean;
  persistEvents?: boolean;
  voiceProvider?: string | null;
  voiceStyle?: string | null;
  locale?: string | null;
  speakingBehavior?: Record<string, unknown> | null;
  animationPreset?: string | null;
  /** Override the server TTS endpoint for this hook instance (falls back to VITE_PHASE3_TTS_ENDPOINT). */
  ttsEndpoint?: string | null;
  /** Override the TTS provider for this hook instance (falls back to VITE_PHASE3_TTS_PROVIDER). */
  ttsProvider?: string | null;
  /** ElevenLabs voice preset name (calm_facilitator | workshop_guide | executive_moderator | creative_catalyst). */
  voicePreset?: string | null;
}

interface SpeakParams {
  text: string;
  messageId?: string | null;
  metadata?: Record<string, unknown>;
}

export type FacilitatorVoicePlaybackState = 'idle' | 'preparing' | 'playing' | 'blocked' | 'failed';

export interface FacilitatorVoiceRuntime {
  isSupported: boolean;
  isSpeaking: boolean;
  /** Human-visible lifecycle state for server/browser synthesis and playback. */
  playbackState: FacilitatorVoicePlaybackState;
  playbackError: string | null;
  avatarState: FacilitatorAvatarState;
  runtimeAvatarState: RuntimeAvatarState;
  /** Prime AudioContext and HTMLMedia playback during a real user gesture. */
  unlockAudio: () => Promise<boolean>;
  speak: (params: SpeakParams) => Promise<void>;
  cancel: () => void;
}

const toRuntimeAvatarState = (state: FacilitatorAvatarState): RuntimeAvatarState => {
  switch (state) {
    case 'listening':
      return { expression: 'attentive', motion: 'listening', intensity: 'medium', reason: 'Listening for participant input' };
    case 'thinking':
      return { expression: 'thinking', motion: 'thinking', intensity: 'medium', reason: 'Preparing a response' };
    case 'speaking':
      return { expression: 'speaking', motion: 'speaking', intensity: 'high', reason: 'Speaking facilitator response' };
    case 'celebrating':
      return { expression: 'celebrating', motion: 'acknowledging', intensity: 'high', reason: 'Acknowledging progress' };
    case 'paused':
      return { expression: 'neutral', motion: 'idle', intensity: 'low', reason: 'Voice playback paused' };
    case 'error':
      return { expression: 'concerned', motion: 'idle', intensity: 'medium', reason: 'Voice playback encountered an error' };
    case 'idle':
    default:
      return { expression: 'neutral', motion: 'idle', intensity: 'low', reason: 'Avatar idle' };
  }
};

const getSpeechSynthesis = (): SpeechSynthesis | null => {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
};

const NATURAL_VOICE_KEYWORDS = [
  'neural',
  'natural',
  'enhanced',
  'premium',
  'google',
  'microsoft',
  'samantha',
  'ava',
  'aria',
  'jenny',
  'sonia',
  'daniel',
  'serena',
];

const FEMININE_VOICE_KEYWORDS = [
  'samantha',
  'ava',
  'aria',
  'jenny',
  'sonia',
  'serena',
  'zira',
  'susan',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'veena',
];

const MASCULINE_VOICE_KEYWORDS = [
  'daniel',
  'david',
  'mark',
  'george',
  'james',
  'alex',
  'fred',
  'tom',
  'thomas',
  'guy',
];

const waitForVoices = async (synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> => {
  const initialVoices = synth.getVoices();
  if (initialVoices.length > 0) return initialVoices;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(synth.getVoices());
    };

    synth.addEventListener?.('voiceschanged', finish, { once: true });
    window.setTimeout(finish, 350);
  });
};

const getVoiceGenderScore = (voice: SpeechSynthesisVoice, voiceGender?: FacilitatorVoiceGender | null): number => {
  if (!voiceGender) return 0;
  const searchable = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  const preferredKeywords = voiceGender === 'female' ? FEMININE_VOICE_KEYWORDS : MASCULINE_VOICE_KEYWORDS;
  const opposingKeywords = voiceGender === 'female' ? MASCULINE_VOICE_KEYWORDS : FEMININE_VOICE_KEYWORDS;
  const preferredScore = preferredKeywords.reduce((score, keyword) => searchable.includes(keyword) ? score + 80 : score, 0);
  const opposingPenalty = opposingKeywords.reduce((score, keyword) => searchable.includes(keyword) ? score + 120 : score, 0);
  return preferredScore - opposingPenalty;
};

const scoreVoice = (
  voice: SpeechSynthesisVoice,
  voiceGender?: FacilitatorVoiceGender | null,
  locale?: string | null
): number => {
  const searchable = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  const voiceLang = voice.lang?.toLowerCase() ?? '';
  const normalizedLocale = locale?.toLowerCase() ?? '';
  const languageScore = normalizedLocale && voiceLang === normalizedLocale
    ? 90
    : normalizedLocale && voiceLang.startsWith(normalizedLocale.split('-')[0])
      ? 75
      : voiceLang.startsWith('en')
        ? 60
        : 0;
  const qualityScore = NATURAL_VOICE_KEYWORDS.reduce((score, keyword) => searchable.includes(keyword) ? score + 18 : score, 0);
  const localPenalty = voice.localService ? 0 : 4;
  return languageScore + qualityScore + getVoiceGenderScore(voice, voiceGender) - localPenalty;
};

const voiceMatchesGender = (voice: SpeechSynthesisVoice, voiceGender?: FacilitatorVoiceGender | null): boolean => {
  return !voiceGender || getVoiceGenderScore(voice, voiceGender) > 0;
};

const selectBestVoice = (
  voices: SpeechSynthesisVoice[],
  defaultVoiceId?: string | null,
  voiceGender?: FacilitatorVoiceGender | null,
  locale?: string | null
): SpeechSynthesisVoice | undefined => {
  if (defaultVoiceId) {
    const configuredVoice = voices.find((voice) => voice.voiceURI === defaultVoiceId || voice.name === defaultVoiceId);
    if (configuredVoice && voiceMatchesGender(configuredVoice, voiceGender)) return configuredVoice;
  }

  const normalizedLocale = locale?.toLowerCase() ?? '';
  const localeLanguage = normalizedLocale.split('-')[0];
  const localeVoices = normalizedLocale
    ? voices.filter((voice) => {
        const voiceLang = voice.lang?.toLowerCase() ?? '';
        return voiceLang === normalizedLocale || Boolean(localeLanguage && voiceLang.startsWith(localeLanguage));
      })
    : [];
  const englishVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  const genderMatchedLocaleVoices = voiceGender
    ? localeVoices.filter((voice) => voiceMatchesGender(voice, voiceGender))
    : localeVoices;
  const genderMatchedEnglishVoices = voiceGender
    ? englishVoices.filter((voice) => voiceMatchesGender(voice, voiceGender))
    : englishVoices;
  const genderMatchedVoices = voiceGender
    ? voices.filter((voice) => voiceMatchesGender(voice, voiceGender))
    : voices;

  return [...genderMatchedLocaleVoices]
    .sort((first, second) => scoreVoice(second, voiceGender, locale) - scoreVoice(first, voiceGender, locale))[0]
    ?? [...localeVoices].sort((first, second) => scoreVoice(second, voiceGender, locale) - scoreVoice(first, voiceGender, locale))[0]
    ?? [...genderMatchedEnglishVoices]
      .sort((first, second) => scoreVoice(second, voiceGender, locale) - scoreVoice(first, voiceGender, locale))[0]
    ?? [...englishVoices].sort((first, second) => scoreVoice(second, voiceGender, locale) - scoreVoice(first, voiceGender, locale))[0]
    ?? [...genderMatchedVoices].sort((first, second) => scoreVoice(second, voiceGender, locale) - scoreVoice(first, voiceGender, locale))[0]
    ?? [...voices].sort((first, second) => scoreVoice(second, voiceGender, locale) - scoreVoice(first, voiceGender, locale))[0];
};

const clampSpeechNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
};

const deriveBrowserSpeechSettings = (speakingBehavior?: Record<string, unknown> | null, voiceStyle?: string | null) => {
  const behavior = speakingBehavior ?? {};
  const style = `${voiceStyle ?? ''} ${String(behavior.pacing ?? '')} ${String(behavior.style ?? '')}`.toLowerCase();
  const baseRate = style.match(/brisk|energetic|upbeat|animated|lively|fast/) ? 0.98 : style.match(/calm|steady|deliberate|reflective|slow/) ? 0.86 : 0.92;
  const basePitch = style.match(/bright|playful|energetic|warm/) ? 1.04 : style.match(/grounded|authoritative|measured|calm/) ? 0.94 : 0.98;

  return {
    rate: clampSpeechNumber(behavior.rate ?? behavior.speech_rate ?? behavior.speed, baseRate, 0.6, 1.4),
    pitch: clampSpeechNumber(behavior.pitch, basePitch, 0.6, 1.6),
    volume: clampSpeechNumber(behavior.volume, 1, 0, 1),
  };
};

// ── Server TTS helpers ────────────────────────────────────────────────────────

interface ServerTtsResult {
  /** Raw provider bytes are retained for Web Audio decoding or HTMLMedia fallback. */
  audioData: ArrayBuffer;
  provider: string;
  voiceId: string;
  preset: string;
  chars: number;
}

/**
 * Fetch server-resolved ElevenLabs bytes. Callers may decode them with Web Audio
 * or use the identical byte stream with HTMLMedia; neither path may fall back to
 * browser SpeechSynthesis when the configured provider is server.
 */
async function fetchServerTts(params: {
  text: string;
  voiceId?: string | null;
  voicePreset?: string | null;
  endpoint: string;
  conversationId?: number | null;
  messageId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ServerTtsResult> {
  const body = {
    text: params.text,
    voice_id: params.voiceId ?? undefined,
    voice_preset: params.voicePreset ?? undefined,
    conversation_id: params.conversationId ?? undefined,
    message_id: params.messageId ?? undefined,
    metadata: params.metadata ?? undefined,
  };

  const { data: { session } } = await api.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // A participant join token is intentionally scoped to this workshop. Prefer
  // it over any unrelated persistent app login left on a shared mobile device.
  const joinToken = getJoinToken(params.conversationId != null ? String(params.conversationId) : null);
  if (joinToken) {
    headers['X-Join-Token'] = joinToken;
  } else if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Server TTS returned ${response.status}`);
  }

  const audioData = await response.arrayBuffer();
  if (audioData.byteLength === 0) throw new Error('Server TTS returned an empty audio response');
  const provider = response.headers.get('X-TTS-Provider') ?? 'server';
  const voiceId = response.headers.get('X-TTS-Voice-Id') ?? '';
  const preset = response.headers.get('X-TTS-Preset') ?? 'default';
  const chars = Number(response.headers.get('X-TTS-Chars') ?? params.text.length);

  return { audioData, provider, voiceId, preset, chars };
}

export function useFacilitatorVoice({
  conversationId,
  facilitatorId,
  enabled = true,
  defaultVoiceId = null,
  voiceGender = null,
  lipSyncEnabled = true,
  persistEvents = true,
  voiceProvider = null,
  voiceStyle = null,
  locale = null,
  speakingBehavior = null,
  animationPreset = null,
  ttsEndpoint = null,
  ttsProvider = null,
  voicePreset = null,
}: UseFacilitatorVoiceParams): FacilitatorVoiceRuntime {
  const [avatarState, setAvatarState] = React.useState<FacilitatorAvatarState>('idle');
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [playbackState, setPlaybackState] = React.useState<FacilitatorVoicePlaybackState>('idle');
  const [playbackError, setPlaybackError] = React.useState<string | null>(null);
  const activeEventIdRef = React.useRef<number | undefined>();
  const startedAtRef = React.useRef<number>(0);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  // Ref to the currently playing HTMLAudioElement for server TTS cancellation
  const audioElementRef = React.useRef<HTMLAudioElement | null>(null);
  // Ref to the current server TTS object URL so it can be revoked on cleanup
  const audioObjectUrlRef = React.useRef<string | null>(null);
  // Android Chrome can reject delayed HTMLMedia playback despite a muted primer.
  // Keep one gesture-resumed context and use it for decoded ElevenLabs bytes.
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const audioBufferSourceRef = React.useRef<AudioBufferSourceNode | null>(null);
  // Each cancellation or new replay invalidates older async synthesis work, so
  // a delayed response cannot begin playing after a later mobile tap.
  const playbackGenerationRef = React.useRef(0);

  const isSupported = Boolean(getSpeechSynthesis()) && typeof SpeechSynthesisUtterance !== 'undefined';

  // Resolve effective provider and endpoint (prop overrides env var)
  const effectiveProvider = (ttsProvider ?? _TTS_PROVIDER).trim();
  const effectiveEndpoint = (ttsEndpoint ?? _TTS_ENDPOINT).trim();
  const useServerTts = effectiveProvider === 'server' && Boolean(effectiveEndpoint);

  const _revokeAudioUrl = React.useCallback(() => {
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
  }, []);

  const cancel = React.useCallback(() => {
    playbackGenerationRef.current += 1;
    if (audioBufferSourceRef.current) {
      audioBufferSourceRef.current.onended = null;
      try { audioBufferSourceRef.current.stop(); } catch { /* source already stopped */ }
      try { audioBufferSourceRef.current.disconnect(); } catch { /* source already disconnected */ }
      audioBufferSourceRef.current = null;
    }
    // Cancel browser TTS
    const synth = getSpeechSynthesis();
    synth?.cancel();
    utteranceRef.current = null;

    // Cancel server TTS audio element
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
    _revokeAudioUrl();

    setIsSpeaking(false);
    setAvatarState('idle');
    setPlaybackState('idle');
    setPlaybackError(null);
    void updateTtsEventStatus(activeEventIdRef.current, 'cancelled');
    activeEventIdRef.current = undefined;
  }, [_revokeAudioUrl]);

  React.useEffect(() => () => {
    cancel();
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, [cancel]);

  React.useEffect(() => {
    if (!enabled) cancel();
  }, [cancel, enabled]);

  const getUnlockedAudioContext = React.useCallback(async (): Promise<AudioContext | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      let context = audioContextRef.current;
      if (!context || context.state === 'closed') {
        context = new AudioCtx();
        audioContextRef.current = context;
      }
      if (context.state !== 'running') await context.resume();
      return context.state === 'running' ? context : null;
    } catch {
      return null;
    }
  }, []);

  const unlockAudio = React.useCallback(async (): Promise<boolean> => {
    const context = await getUnlockedAudioContext();
    if (context) {
      // Start a silent buffer inside the real user gesture. Unlike the former
      // disposable context, this is the exact pipeline used for later ElevenLabs
      // byte-stream playback on Android.
      try {
        const primer = context.createBufferSource();
        primer.buffer = context.createBuffer(1, 1, context.sampleRate);
        primer.connect(context.destination);
        primer.start();
        primer.stop();
        return true;
      } catch {
        // The retained running context is still a valid unlock result.
        return context.state === 'running';
      }
    }
    return false;
  }, [getUnlockedAudioContext]);

  // ── Server TTS speak path ─────────────────────────────────────────────────
  const speakViaServer = React.useCallback(async ({ text, messageId = null, metadata = {} }: SpeakParams) => {
    // Realtime and legacy integrations can violate the compile-time message shape.
    // The shared playback boundary must never crash a participant action on raw JSON.
    const trimmed = typeof text === 'string' ? text.trim() : '';
    const serializedMessageId = messageId != null ? String(messageId) : null;
    if (!enabled || !trimmed || !conversationId || !effectiveEndpoint) return;

    // Cancel any in-progress playback and bind this request to its own
    // generation. Later taps invalidate this work before it can play.
    cancel();
    const generation = playbackGenerationRef.current;
    const isCurrentGeneration = () => playbackGenerationRef.current === generation;
    setAvatarState('thinking');
    setPlaybackState('preparing');
    setPlaybackError(null);
    startedAtRef.current = performance.now();

    const personaMetadata = {
      ...metadata,
      voiceGender,
      voiceProvider: effectiveProvider,
      voiceStyle,
      locale,
      speakingBehavior,
      animationPreset,
      voicePreset,
      ttsPath: 'server',
    };

    // Record TTS event as queued
    const queuedEvent = persistEvents
      ? await recordTtsEvent({
          conversationId,
          facilitatorId,
          messageId: serializedMessageId,
          provider: effectiveProvider,
          voiceId: defaultVoiceId,
          textExcerpt: trimmed,
          status: 'queued',
          avatarState: 'thinking',
          audioDurationMs: null,
          metadata: personaMetadata,
        })
      : null;
    if (!isCurrentGeneration()) {
      void updateTtsEventStatus(queuedEvent?.id, 'cancelled');
      return;
    }
    activeEventIdRef.current = queuedEvent?.id;

    let serverResult: ServerTtsResult;
    try {
      serverResult = await fetchServerTts({
        text: trimmed,
        voiceId: defaultVoiceId,
        voicePreset: voicePreset,
        endpoint: effectiveEndpoint,
        conversationId,
        messageId: serializedMessageId,
        metadata: personaMetadata,
      });
    } catch (fetchError) {
      if (!isCurrentGeneration()) return;
      const serverError = fetchError instanceof Error ? fetchError.message : 'server_tts_fetch_failed';
      setIsSpeaking(false);
      setAvatarState('error');
      setPlaybackState('failed');
      setPlaybackError('ElevenLabs voice is temporarily unavailable. Tap Play latest reply to retry.');
      void updateTtsEventStatus(activeEventIdRef.current, 'failed', {
        metadata: { ...personaMetadata, error: serverError, fallbackDisabled: true },
      });
      activeEventIdRef.current = undefined;
      return;
    }

    if (!isCurrentGeneration()) return;

    const basePlaybackMetadata = {
      ...personaMetadata,
      characterCount: trimmed.length,
      provider: serverResult.provider,
      voiceId: serverResult.voiceId,
      voicePreset: serverResult.preset,
    };
    const completePlayback = (deliveryPath: 'web_audio' | 'html_media') => {
      if (!isCurrentGeneration()) return;
      const durationMs = Math.round(performance.now() - startedAtRef.current);
      setIsSpeaking(false);
      setAvatarState('idle');
      setPlaybackState('idle');
      audioBufferSourceRef.current = null;
      audioElementRef.current = null;
      _revokeAudioUrl();
      void updateTtsEventStatus(activeEventIdRef.current, 'completed', {
        audio_duration_ms: durationMs,
        metadata: { ...basePlaybackMetadata, deliveryPath },
      });
      activeEventIdRef.current = undefined;
    };
    const failPlayback = (
      deliveryPath: 'web_audio' | 'html_media',
      error: unknown,
      mediaErrorCode?: number | null,
    ) => {
      if (!isCurrentGeneration()) return;
      setIsSpeaking(false);
      setAvatarState('error');
      setPlaybackState('failed');
      setPlaybackError('The ElevenLabs voice could not be played on this device.');
      audioBufferSourceRef.current = null;
      audioElementRef.current = null;
      _revokeAudioUrl();
      void updateTtsEventStatus(activeEventIdRef.current, 'failed', {
        metadata: {
          ...basePlaybackMetadata,
          deliveryPath,
          error: error instanceof Error ? `${error.name}: ${error.message}` : 'audio_playback_failed',
          mediaErrorCode: mediaErrorCode ?? null,
        },
      });
      activeEventIdRef.current = undefined;
    };

    // Preferred Android path: decode and play the exact ElevenLabs MP3 through
    // the AudioContext that was resumed by the visible user gesture.  It avoids
    // delayed HTMLMedia autoplay heuristics without changing provider or voice.
    let webAudioError: unknown = null;
    const context = await getUnlockedAudioContext();
    if (!isCurrentGeneration()) return;
    if (context) {
      try {
        const decodedAudio = await context.decodeAudioData(serverResult.audioData.slice(0));
        if (!isCurrentGeneration()) return;
        const source = context.createBufferSource();
        source.buffer = decodedAudio;
        source.connect(context.destination);
        source.onended = () => completePlayback('web_audio');
        audioBufferSourceRef.current = source;
        source.start(0);
        setIsSpeaking(true);
        setAvatarState('speaking');
        setPlaybackState('playing');
        setPlaybackError(null);
        void updateTtsEventStatus(activeEventIdRef.current, 'speaking', {
          metadata: { ...basePlaybackMetadata, deliveryPath: 'web_audio' },
        });
        return;
      } catch (error) {
        webAudioError = error;
      }
    } else {
      webAudioError = new Error('No user-gesture-resumed AudioContext was available');
    }

    // Compatibility fallback: preserve the same ElevenLabs bytes and never use
    // browser SpeechSynthesis for a server-configured facilitator voice.
    if (!isCurrentGeneration()) return;
    const fallbackBlob = new Blob([serverResult.audioData], { type: 'audio/mpeg' });
    const fallbackUrl = URL.createObjectURL(fallbackBlob);
    audioObjectUrlRef.current = fallbackUrl;
    const audio = new Audio(fallbackUrl);
    audioElementRef.current = audio;
    audio.onplay = () => {
      if (!isCurrentGeneration()) return;
      setIsSpeaking(true);
      setAvatarState('speaking');
      setPlaybackState('playing');
      setPlaybackError(null);
      void updateTtsEventStatus(activeEventIdRef.current, 'speaking', {
        metadata: { ...basePlaybackMetadata, deliveryPath: 'html_media_fallback', webAudioError: webAudioError instanceof Error ? webAudioError.message : 'web_audio_unavailable' },
      });
    };
    audio.onended = () => completePlayback('html_media');
    audio.onerror = () => failPlayback('html_media', webAudioError, audio.error?.code ?? null);

    try {
      await audio.play();
    } catch (playError) {
      if (!isCurrentGeneration()) return;
      const isAutoplayBlocked = playError instanceof DOMException && playError.name === 'NotAllowedError';
      if (isAutoplayBlocked) {
        setPlaybackState('blocked');
        setPlaybackError('Tap Enable sound, then use Play facilitator response.');
        audioElementRef.current = null;
        _revokeAudioUrl();
        void updateTtsEventStatus(activeEventIdRef.current, 'failed', {
          metadata: { ...basePlaybackMetadata, deliveryPath: 'html_media', error: `${playError.name}: ${playError.message}`, webAudioError: webAudioError instanceof Error ? webAudioError.message : 'web_audio_unavailable' },
        });
        activeEventIdRef.current = undefined;
      } else {
        failPlayback('html_media', playError);
      }
    }
  }, [animationPreset, cancel, conversationId, defaultVoiceId, effectiveEndpoint, effectiveProvider, enabled, facilitatorId, getUnlockedAudioContext, locale, persistEvents, speakingBehavior, voiceGender, voicePreset, voiceStyle, _revokeAudioUrl]);

  // ── Browser TTS speak path ────────────────────────────────────────────────
  const speakViaBrowser = React.useCallback(async ({ text, messageId = null, metadata = {} }: SpeakParams) => {
    // Keep the non-server fallback equally defensive for callers outside the participant room.
    const trimmed = typeof text === 'string' ? text.trim() : '';
    const serializedMessageId = messageId != null ? String(messageId) : null;
    if (!enabled || !trimmed || !conversationId) return;

    const synth = getSpeechSynthesis();
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      toast.info('Facilitator voice is not supported in this browser.');
      return;
    }

    synth.cancel();
    setAvatarState('thinking');
    setPlaybackState('preparing');
    setPlaybackError(null);
    startedAtRef.current = performance.now();

    const personaSpeechSettings = deriveBrowserSpeechSettings(speakingBehavior, voiceStyle);
    const personaMetadata = {
      ...metadata,
      voiceGender,
      voiceProvider,
      voiceStyle,
      locale,
      speakingBehavior,
      animationPreset,
      speechRate: personaSpeechSettings.rate,
      speechPitch: personaSpeechSettings.pitch,
      speechVolume: personaSpeechSettings.volume,
      ttsPath: 'browser',
    };

    const synthesisPlan = buildBrowserTtsSynthesisResult({
      text: trimmed,
      voiceId: defaultVoiceId,
      lipSyncEnabled,
      metadata: personaMetadata,
    });

    const queuedEvent = persistEvents
      ? await recordTtsEvent({
          conversationId,
          facilitatorId,
          messageId: serializedMessageId,
          provider: synthesisPlan.provider,
          voiceId: synthesisPlan.voiceId ?? defaultVoiceId,
          textExcerpt: trimmed,
          status: synthesisPlan.status,
          avatarState: 'thinking',
          lipSyncMarkers: synthesisPlan.lipSyncMarkers,
          audioDurationMs: synthesisPlan.audioDurationMs,
          metadata: synthesisPlan.metadata,
        })
      : null;
    activeEventIdRef.current = queuedEvent?.id;

    const utterance = new SpeechSynthesisUtterance(trimmed);
    const voices = await waitForVoices(synth);
    const selectedVoice = selectBestVoice(voices, defaultVoiceId, voiceGender, locale);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || locale || 'en-US';
    utterance.rate = 0.92;
    if (personaSpeechSettings.rate !== 0.92) utterance.rate = personaSpeechSettings.rate;
    utterance.pitch = personaSpeechSettings.pitch;
    utterance.volume = personaSpeechSettings.volume;
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setAvatarState('speaking');
      setPlaybackState('playing');
      setPlaybackError(null);
      void updateTtsEventStatus(activeEventIdRef.current, 'speaking', {
        metadata: { ...personaMetadata, characterCount: trimmed.length, voiceName: selectedVoice?.name ?? null, selectedVoiceLang: selectedVoice?.lang ?? null, lipSyncEnabled },
      });
    };

    utterance.onend = () => {
      const durationMs = Math.round(performance.now() - startedAtRef.current);
      setIsSpeaking(false);
      setAvatarState('idle');
      setPlaybackState('idle');
      utteranceRef.current = null;
      void updateTtsEventStatus(activeEventIdRef.current, 'completed', {
        audio_duration_ms: durationMs,
        metadata: { ...personaMetadata, characterCount: trimmed.length, voiceName: selectedVoice?.name ?? null, selectedVoiceLang: selectedVoice?.lang ?? null, lipSyncEnabled },
      });
      activeEventIdRef.current = undefined;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setAvatarState('error');
      setPlaybackState('failed');
      setPlaybackError('The facilitator voice could not be played on this device.');
      utteranceRef.current = null;
      void updateTtsEventStatus(activeEventIdRef.current, 'failed', {
        metadata: { ...personaMetadata, characterCount: trimmed.length, voiceName: selectedVoice?.name ?? null, selectedVoiceLang: selectedVoice?.lang ?? null, lipSyncEnabled },
      });
      activeEventIdRef.current = undefined;
    };

    try {
      synth.speak(utterance);
    } catch (error) {
      setIsSpeaking(false);
      setAvatarState('error');
      setPlaybackState('failed');
      setPlaybackError('The facilitator voice could not be started on this device.');
      utteranceRef.current = null;
      void updateTtsEventStatus(activeEventIdRef.current, 'failed', {
        metadata: {
          ...personaMetadata,
          characterCount: trimmed.length,
          voiceName: selectedVoice?.name ?? null,
          selectedVoiceLang: selectedVoice?.lang ?? null,
          lipSyncEnabled,
          error: error instanceof Error ? error.message : 'speech_synthesis_start_failed',
        },
      });
      activeEventIdRef.current = undefined;
      toast.error('Could not start facilitator voice playback.');
    }
  }, [animationPreset, conversationId, defaultVoiceId, enabled, facilitatorId, lipSyncEnabled, locale, persistEvents, speakingBehavior, voiceGender, voiceProvider, voiceStyle]);

  // ── Unified speak entry point ─────────────────────────────────────────────
  const speak = React.useCallback(async (params: SpeakParams) => {
    if (useServerTts) {
      await speakViaServer(params);
    } else {
      await speakViaBrowser(params);
    }
  }, [useServerTts, speakViaServer, speakViaBrowser]);

  return {
    isSupported,
    isSpeaking,
    playbackState,
    playbackError,
    avatarState,
    runtimeAvatarState: toRuntimeAvatarState(avatarState),
    unlockAudio,
    speak,
    cancel,
  };
}
