import * as React from 'react';
import { toast } from 'sonner';
import type { FacilitatorAvatarState as RuntimeAvatarState } from '@/types/facilitatorRuntime';
import type { FacilitatorAvatarState } from '@/types/facilitator';
import { recordTtsEvent, updateTtsEventStatus } from '@/services/facilitator/phase3RuntimeService';

interface UseFacilitatorVoiceParams {
  conversationId?: number | null;
  facilitatorId?: number | null;
  enabled?: boolean;
  defaultVoiceId?: string | null;
  persistEvents?: boolean;
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

export function useFacilitatorVoice({
  conversationId,
  facilitatorId,
  enabled = true,
  defaultVoiceId = null,
  persistEvents = true,
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

  const speak = React.useCallback(async ({ text, messageId = null, metadata = {} }: SpeakParams) => {
    const trimmed = text.trim();
    if (!enabled || !trimmed || !conversationId) return;

    const synth = getSpeechSynthesis();
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      toast.info('Facilitator voice is not supported in this browser.');
      return;
    }

    synth.cancel();
    setAvatarState('thinking');
    startedAtRef.current = performance.now();

    const queuedEvent = persistEvents
      ? await recordTtsEvent({
          conversationId,
          facilitatorId,
          messageId,
          provider: 'browser_speech_synthesis',
          voiceId: defaultVoiceId,
          textExcerpt: trimmed,
          status: 'queued',
          avatarState: 'thinking',
          metadata: { ...metadata, characterCount: trimmed.length },
        })
      : null;
    activeEventIdRef.current = queuedEvent?.id;

    const utterance = new SpeechSynthesisUtterance(trimmed);
    const voices = synth.getVoices();
    const selectedVoice = defaultVoiceId
      ? voices.find((voice) => voice.voiceURI === defaultVoiceId || voice.name === defaultVoiceId)
      : voices.find((voice) => voice.lang?.startsWith('en')) ?? voices[0];
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.volume = 1;
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setAvatarState('speaking');
      void updateTtsEventStatus(activeEventIdRef.current, 'speaking', {
        metadata: { ...metadata, characterCount: trimmed.length, voiceName: selectedVoice?.name ?? null },
      });
    };

    utterance.onend = () => {
      const durationMs = Math.round(performance.now() - startedAtRef.current);
      setIsSpeaking(false);
      setAvatarState('idle');
      utteranceRef.current = null;
      void updateTtsEventStatus(activeEventIdRef.current, 'completed', {
        audio_duration_ms: durationMs,
        metadata: { ...metadata, characterCount: trimmed.length, voiceName: selectedVoice?.name ?? null },
      });
      activeEventIdRef.current = undefined;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setAvatarState('error');
      utteranceRef.current = null;
      void updateTtsEventStatus(activeEventIdRef.current, 'failed', {
        metadata: { ...metadata, characterCount: trimmed.length, voiceName: selectedVoice?.name ?? null },
      });
      activeEventIdRef.current = undefined;
    };

    synth.speak(utterance);
  }, [conversationId, defaultVoiceId, enabled, facilitatorId, persistEvents]);

  return {
    isSupported,
    isSpeaking,
    avatarState,
    runtimeAvatarState: toRuntimeAvatarState(avatarState),
    speak,
    cancel,
  };
}
