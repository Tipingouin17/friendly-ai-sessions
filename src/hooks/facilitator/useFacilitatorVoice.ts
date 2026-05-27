import * as React from 'react';
import { toast } from 'sonner';
import type { FacilitatorAvatarState as RuntimeAvatarState } from '@/types/facilitatorRuntime';
import type { FacilitatorAvatarState } from '@/types/facilitator';
import type { FacilitatorVoiceGender } from '@/utils/facilitatorVoiceGender';
import { recordTtsEvent, updateTtsEventStatus } from '@/services/facilitator/phase3RuntimeService';
import { buildBrowserTtsSynthesisResult } from '@/services/facilitator/phase3ProviderAdapters';

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
}

interface SpeakParams {
  text: string;
  messageId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface FacilitatorVoiceRuntime {
  isSupported: boolean;
  isSpeaking: boolean;
  avatarState: FacilitatorAvatarState;
  runtimeAvatarState: RuntimeAvatarState;
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
}: UseFacilitatorVoiceParams): FacilitatorVoiceRuntime {
  const [avatarState, setAvatarState] = React.useState<FacilitatorAvatarState>('idle');
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const activeEventIdRef = React.useRef<number | undefined>();
  const startedAtRef = React.useRef<number>(0);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = Boolean(getSpeechSynthesis()) && typeof SpeechSynthesisUtterance !== 'undefined';

  const cancel = React.useCallback(() => {
    const synth = getSpeechSynthesis();
    synth?.cancel();
    setIsSpeaking(false);
    setAvatarState('idle');
    utteranceRef.current = null;
    void updateTtsEventStatus(activeEventIdRef.current, 'cancelled');
    activeEventIdRef.current = undefined;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  React.useEffect(() => {
    if (!enabled) cancel();
  }, [cancel, enabled]);

  const speak = React.useCallback(async ({ text, messageId = null, metadata = {} }: SpeakParams) => {
    const trimmed = text.trim();
    const serializedMessageId = messageId != null ? String(messageId) : null;
    if (!enabled || !trimmed || !conversationId) return;

    const synth = getSpeechSynthesis();
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      toast.info('Facilitator voice is not supported in this browser.');
      return;
    }

    synth.cancel();
    setAvatarState('thinking');
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
    utterance.rate = personaSpeechSettings.rate;
    utterance.pitch = personaSpeechSettings.pitch;
    utterance.volume = personaSpeechSettings.volume;
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setAvatarState('speaking');
      void updateTtsEventStatus(activeEventIdRef.current, 'speaking', {
        metadata: { ...personaMetadata, characterCount: trimmed.length, voiceName: selectedVoice?.name ?? null, selectedVoiceLang: selectedVoice?.lang ?? null, lipSyncEnabled },
      });
    };

    utterance.onend = () => {
      const durationMs = Math.round(performance.now() - startedAtRef.current);
      setIsSpeaking(false);
      setAvatarState('idle');
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

  return {
    isSupported,
    isSpeaking,
    avatarState,
    runtimeAvatarState: toRuntimeAvatarState(avatarState),
    speak,
    cancel,
  };
}
