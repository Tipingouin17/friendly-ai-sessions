/**
 * facilitatorRuntime
 *
 * Provider-neutral contracts for the stream-aware AI facilitator foundation.
 * These types deliberately model the facilitator as a real-time meeting process
 * monitor rather than as a simple chatbot response generator.
 */

export type FacilitatorEnergy = "calm" | "balanced" | "energetic";
export type FacilitatorDirectness = "gentle" | "balanced" | "direct";
export type FacilitatorInterventionStyle =
  | "silent_observer"
  | "light_touch"
  | "balanced_moderator"
  | "active_coach";

export interface FacilitatorBehaviorProfile {
  /** Schema version for safe future migrations. */
  version: 1;
  /** Human-readable label surfaced to admins when editing behavior. */
  label: string;
  /** Baseline tone applied to all generated interventions. */
  tone: "warm" | "neutral" | "formal" | "playful";
  /** How much energy the avatar should express through motion and micro-feedback. */
  energy: FacilitatorEnergy;
  /** How explicit the facilitator can be when redirecting, interrupting, or summarizing. */
  directness: FacilitatorDirectness;
  /** Default frequency and assertiveness of interventions. */
  interventionStyle: FacilitatorInterventionStyle;
  /** Minimum confidence required before the AI speaks rather than only animating/listening. */
  speechConfidenceThreshold: number;
  /** Milliseconds of silence before a partial turn can be considered probably complete. */
  turnCompletionSilenceMs: number;
  /** Maximum characters accumulated from a single partial turn before semantic compression is required. */
  maxUncompressedTurnChars: number;
  /** Signals that should be monitored for this facilitator. */
  monitoredSignals: FacilitationSignalKind[];
  /** Avatar-specific animation preferences, still provider-neutral. */
  avatar: FacilitatorAvatarBehavior;
}

export interface FacilitatorAvatarBehavior {
  idleMotionIntensity: "none" | "subtle" | "moderate";
  listeningCueFrequency: "low" | "medium" | "high";
  thinkingCueDelayMs: number;
  speakingGestureIntensity: "subtle" | "moderate" | "expressive";
  allowInterruptionCues: boolean;
}

export const DEFAULT_FACILITATOR_BEHAVIOR_PROFILE: FacilitatorBehaviorProfile = {
  version: 1,
  label: "Balanced stream-aware facilitator",
  tone: "warm",
  energy: "balanced",
  directness: "balanced",
  interventionStyle: "balanced_moderator",
  speechConfidenceThreshold: 0.72,
  turnCompletionSilenceMs: 1200,
  maxUncompressedTurnChars: 1600,
  monitoredSignals: [
    "topic_drift",
    "dominance",
    "silence",
    "confusion",
    "conflict",
    "decision_readiness",
    "repetition"
  ],
  avatar: {
    idleMotionIntensity: "subtle",
    listeningCueFrequency: "medium",
    thinkingCueDelayMs: 650,
    speakingGestureIntensity: "moderate",
    allowInterruptionCues: false
  }
};

export type StreamInputModality = "typed" | "speech" | "system";
export type StreamChunkStatus = "partial" | "checkpoint" | "final" | "cancelled";

export interface FacilitatorStreamChunk {
  conversationId: number;
  participantId?: number | null;
  participantName?: string | null;
  modality: StreamInputModality;
  status: StreamChunkStatus;
  text: string;
  sequence: number;
  /** Monotonic client timestamp, useful when server clocks or network ordering differ. */
  clientTimestampMs: number;
  /** Optional speech-engine confidence when the chunk comes from interim transcription. */
  confidence?: number;
}

export type FacilitationSignalKind =
  | "topic_drift"
  | "dominance"
  | "silence"
  | "confusion"
  | "conflict"
  | "decision_readiness"
  | "repetition"
  | "unresolved_question"
  | "energy_drop";

export interface FacilitationSignalScore {
  kind: FacilitationSignalKind;
  score: number;
  evidence: string;
}

export type TurnBoundaryState = "collecting" | "probably_complete" | "complete" | "abandoned";

export interface StreamInterpretationSnapshot {
  conversationId: number;
  participantId?: number | null;
  participantName?: string | null;
  lastSequence: number;
  turnBoundary: TurnBoundaryState;
  rollingSummary: string;
  workingText: string;
  tokenBudgetRisk: "low" | "medium" | "high";
  detectedSignals: FacilitationSignalScore[];
  recommendedAvatarState: FacilitatorAvatarState;
  shouldConsiderIntervention: boolean;
  interventionRationale?: string;
  updatedAt: string;
}

export type FacilitatorAvatarExpression =
  | "neutral"
  | "attentive"
  | "thinking"
  | "encouraging"
  | "concerned"
  | "speaking"
  | "celebrating";

export type FacilitatorAvatarMotion = "idle" | "listening" | "thinking" | "speaking" | "acknowledging";

export interface FacilitatorAvatarState {
  expression: FacilitatorAvatarExpression;
  motion: FacilitatorAvatarMotion;
  intensity: "low" | "medium" | "high";
  /** Short phrase for accessibility/debugging; not displayed as intervention text. */
  reason: string;
}

export interface MeetingMemoryPatch {
  conversationId: number;
  participantId?: number | null;
  semanticDelta: string;
  processDelta: string;
  signalScores: FacilitationSignalScore[];
  lastSequence: number;
}

export interface FacilitatorRuntimeFeatureFlags {
  streamingInterpretationEnabled: boolean;
  avatarStateEnabled: boolean;
  persistRuntimeEvents: boolean;
}

export function getFacilitatorRuntimeFeatureFlags(): FacilitatorRuntimeFeatureFlags {
  return {
    streamingInterpretationEnabled: import.meta.env.VITE_STREAMING_FACILITATOR === "true",
    avatarStateEnabled: import.meta.env.VITE_AVATAR_STATE_RUNTIME === "true",
    persistRuntimeEvents: import.meta.env.VITE_PERSIST_FACILITATOR_RUNTIME === "true"
  };
}
