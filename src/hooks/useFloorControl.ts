/**
 * useFloorControl
 *
 * Implements the floor-control state machine described in Workstream 2 of the
 * tester-feedback developer brief.
 *
 * The hook tracks whether it is safe for the AI facilitator to speak, based on
 * real conversational floor state rather than a fixed timer.
 *
 * States
 * ──────
 * idle              — No one speaking, no AI output. Safe to respond if queued.
 * human_speaking    — Active speech or unstable transcript. Block AI.
 * human_pause_pending — Possible end of turn, silence too short. Wait.
 * ai_thinking       — AI generating. Cancel if human resumes.
 * ai_speaking       — TTS playing. No new AI response.
 * host_controlled   — Manual mode. AI only speaks on explicit host action.
 *
 * Facilitation modes
 * ──────────────────
 * manual    — AI never speaks unless the host explicitly triggers it.
 * balanced  — AI waits for clear silence + all expected answers (default).
 * proactive — Legacy behavior: fixed-timer trigger.
 *
 * Usage
 * ─────
 * const floor = useFloorControl({ participantCount: 3, facilitationMode: 'balanced' });
 * floor.notifySpeechStarted();
 * floor.notifySpeechFinalized();
 * floor.notifySilenceStarted();
 * floor.notifyAiThinking();
 * floor.notifyAiSpeaking();
 * floor.notifyAiDone();
 * const canSpeak = floor.isSafeToSpeak();
 */

import { useCallback, useEffect, useReducer, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FacilitatorFloorState =
  | 'idle'
  | 'human_speaking'
  | 'human_pause_pending'
  | 'ai_thinking'
  | 'ai_speaking'
  | 'host_controlled';

export type FacilitationMode = 'manual' | 'balanced' | 'proactive';

type FloorAction =
  | { type: 'SPEECH_STARTED' }
  | { type: 'SPEECH_FINALIZED' }
  | { type: 'SILENCE_STARTED' }
  | { type: 'SILENCE_CONFIRMED' }
  | { type: 'USER_RESUMED_SPEAKING' }
  | { type: 'AI_THINKING' }
  | { type: 'AI_SPEAKING' }
  | { type: 'AI_DONE' }
  | { type: 'HOST_TAKE_CONTROL' }
  | { type: 'HOST_RELEASE_CONTROL' };

type FloorState = {
  floor: FacilitatorFloorState;
  lastSpeechEndedAt: number | null;
  lastSpeechFinalizedAt: number | null;
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function floorReducer(state: FloorState, action: FloorAction): FloorState {
  const now = Date.now();
  switch (action.type) {
    case 'SPEECH_STARTED':
    case 'USER_RESUMED_SPEAKING':
      return {
        ...state,
        floor: 'human_speaking',
        lastSpeechEndedAt: null,
      };

    case 'SPEECH_FINALIZED':
      return {
        ...state,
        floor: 'human_pause_pending',
        lastSpeechFinalizedAt: now,
        lastSpeechEndedAt: now,
      };

    case 'SILENCE_STARTED':
      // Only transition to pause_pending if we were speaking
      if (state.floor === 'human_speaking') {
        return {
          ...state,
          floor: 'human_pause_pending',
          lastSpeechEndedAt: now,
        };
      }
      return state;

    case 'SILENCE_CONFIRMED':
      // Silence window has elapsed — floor is now idle
      if (state.floor === 'human_pause_pending') {
        return { ...state, floor: 'idle' };
      }
      return state;

    case 'AI_THINKING':
      if (state.floor === 'idle') {
        return { ...state, floor: 'ai_thinking' };
      }
      return state;

    case 'AI_SPEAKING':
      return { ...state, floor: 'ai_speaking' };

    case 'AI_DONE':
      return { ...state, floor: 'idle' };

    case 'HOST_TAKE_CONTROL':
      return { ...state, floor: 'host_controlled' };

    case 'HOST_RELEASE_CONTROL':
      return { ...state, floor: 'idle' };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Silence window configuration
// ---------------------------------------------------------------------------

const SILENCE_WINDOW_1_ON_1_MS = 1500;
const SILENCE_WINDOW_MULTI_MS = 2500;

function getSilenceWindowMs(participantCount: number): number {
  return participantCount <= 2 ? SILENCE_WINDOW_1_ON_1_MS : SILENCE_WINDOW_MULTI_MS;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseFloorControlOptions {
  participantCount?: number;
  facilitationMode?: FacilitationMode;
  onSilenceConfirmed?: () => void;
}

export interface UseFloorControlResult {
  floorState: FacilitatorFloorState;
  facilitationMode: FacilitationMode;
  setFacilitationMode: (mode: FacilitationMode) => void;
  isSafeToSpeak: () => boolean;
  notifySpeechStarted: () => void;
  notifySpeechFinalized: () => void;
  notifySilenceStarted: () => void;
  notifyUserResumedSpeaking: () => void;
  notifyAiThinking: () => void;
  notifyAiSpeaking: () => void;
  notifyAiDone: () => void;
  hostTakeControl: () => void;
  hostReleaseControl: () => void;
  getSilenceElapsedMs: () => number | null;
}

export function useFloorControl({
  participantCount = 1,
  facilitationMode: initialMode = 'balanced',
  onSilenceConfirmed,
}: UseFloorControlOptions = {}): UseFloorControlResult {
  const [state, dispatch] = useReducer(floorReducer, {
    floor: 'idle',
    lastSpeechEndedAt: null,
    lastSpeechFinalizedAt: null,
  });

  const [facilitationMode, setFacilitationModeState] = useReducer(
    (_: FacilitationMode, next: FacilitationMode) => next,
    initialMode
  );

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSilenceConfirmedRef = useRef(onSilenceConfirmed);
  onSilenceConfirmedRef.current = onSilenceConfirmed;

  // Clear any pending silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Start the configurable silence window timer
  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    const windowMs = getSilenceWindowMs(participantCount);
    silenceTimerRef.current = setTimeout(() => {
      dispatch({ type: 'SILENCE_CONFIRMED' });
      onSilenceConfirmedRef.current?.();
    }, windowMs);
  }, [clearSilenceTimer, participantCount]);

  // Cleanup on unmount
  useEffect(() => () => clearSilenceTimer(), [clearSilenceTimer]);

  // ---------------------------------------------------------------------------
  // Public event emitters
  // ---------------------------------------------------------------------------

  const notifySpeechStarted = useCallback(() => {
    clearSilenceTimer();
    dispatch({ type: 'SPEECH_STARTED' });
  }, [clearSilenceTimer]);

  const notifySpeechFinalized = useCallback(() => {
    dispatch({ type: 'SPEECH_FINALIZED' });
    startSilenceTimer();
  }, [startSilenceTimer]);

  const notifySilenceStarted = useCallback(() => {
    dispatch({ type: 'SILENCE_STARTED' });
    startSilenceTimer();
  }, [startSilenceTimer]);

  const notifyUserResumedSpeaking = useCallback(() => {
    clearSilenceTimer();
    dispatch({ type: 'USER_RESUMED_SPEAKING' });
  }, [clearSilenceTimer]);

  const notifyAiThinking = useCallback(() => {
    dispatch({ type: 'AI_THINKING' });
  }, []);

  const notifyAiSpeaking = useCallback(() => {
    dispatch({ type: 'AI_SPEAKING' });
  }, []);

  const notifyAiDone = useCallback(() => {
    dispatch({ type: 'AI_DONE' });
  }, []);

  const hostTakeControl = useCallback(() => {
    clearSilenceTimer();
    dispatch({ type: 'HOST_TAKE_CONTROL' });
  }, [clearSilenceTimer]);

  const hostReleaseControl = useCallback(() => {
    dispatch({ type: 'HOST_RELEASE_CONTROL' });
  }, []);

  const setFacilitationMode = useCallback((mode: FacilitationMode) => {
    setFacilitationModeState(mode);
    if (mode === 'manual') {
      dispatch({ type: 'HOST_TAKE_CONTROL' });
    } else if (state.floor === 'host_controlled') {
      dispatch({ type: 'HOST_RELEASE_CONTROL' });
    }
  }, [state.floor]);

  // ---------------------------------------------------------------------------
  // Safe-to-speak gate
  // ---------------------------------------------------------------------------

  const isSafeToSpeak = useCallback((): boolean => {
    if (facilitationMode === 'manual') return false;
    if (state.floor === 'host_controlled') return false;
    if (state.floor === 'human_speaking') return false;
    if (state.floor === 'human_pause_pending') return false;
    if (state.floor === 'ai_speaking') return false;
    if (state.floor === 'ai_thinking') return false;
    return true; // floor === 'idle'
  }, [facilitationMode, state.floor]);

  const getSilenceElapsedMs = useCallback((): number | null => {
    if (state.lastSpeechEndedAt === null) return null;
    return Date.now() - state.lastSpeechEndedAt;
  }, [state.lastSpeechEndedAt]);

  return {
    floorState: state.floor,
    facilitationMode,
    setFacilitationMode,
    isSafeToSpeak,
    notifySpeechStarted,
    notifySpeechFinalized,
    notifySilenceStarted,
    notifyUserResumedSpeaking,
    notifyAiThinking,
    notifyAiSpeaking,
    notifyAiDone,
    hostTakeControl,
    hostReleaseControl,
    getSilenceElapsedMs,
  };
}
