import {
  DEFAULT_FACILITATOR_BEHAVIOR_PROFILE,
  FacilitatorAvatarState,
  FacilitatorBehaviorProfile,
  FacilitatorStreamChunk,
  FacilitationSignalScore,
  MeetingMemoryPatch,
  StreamInterpretationSnapshot,
  TurnBoundaryState
} from "@/types/facilitatorRuntime";

const LONG_TURN_WARNING_CHARS = 900;
const HIGH_TOKEN_RISK_CHARS = 1400;
const MAX_ROLLING_SUMMARY_CHARS = 900;
const MAX_WORKING_TEXT_CHARS = 2200;

export interface StreamInterpreterState {
  snapshot: StreamInterpretationSnapshot | null;
}

export function createInitialStreamInterpreterState(): StreamInterpreterState {
  return { snapshot: null };
}

export function interpretStreamChunk(
  previous: StreamInterpretationSnapshot | null,
  chunk: FacilitatorStreamChunk,
  behavior: FacilitatorBehaviorProfile = DEFAULT_FACILITATOR_BEHAVIOR_PROFILE
): StreamInterpretationSnapshot {
  const nowIso = new Date().toISOString();
  const normalizedText = normalizeChunkText(chunk.text);
  const workingText = buildWorkingText(previous?.workingText ?? "", normalizedText, chunk.status);
  const rollingSummary = updateRollingSummary(previous?.rollingSummary ?? "", normalizedText, chunk.status);
  const detectedSignals = detectFacilitationSignals(workingText, behavior);
  const turnBoundary = estimateTurnBoundary(previous, chunk, behavior, workingText);
  const tokenBudgetRisk = workingText.length > HIGH_TOKEN_RISK_CHARS
    ? "high"
    : workingText.length > LONG_TURN_WARNING_CHARS
      ? "medium"
      : "low";
  const shouldConsiderIntervention = shouldEscalateToIntervention(detectedSignals, turnBoundary, chunk.status, tokenBudgetRisk);

  return {
    conversationId: chunk.conversationId,
    participantId: chunk.participantId ?? previous?.participantId ?? null,
    participantName: chunk.participantName ?? previous?.participantName ?? null,
    lastSequence: Math.max(previous?.lastSequence ?? 0, chunk.sequence),
    turnBoundary,
    rollingSummary,
    workingText,
    tokenBudgetRisk,
    detectedSignals,
    recommendedAvatarState: selectAvatarState(detectedSignals, turnBoundary, shouldConsiderIntervention, chunk.status),
    shouldConsiderIntervention,
    interventionRationale: shouldConsiderIntervention
      ? buildInterventionRationale(detectedSignals, tokenBudgetRisk, turnBoundary)
      : undefined,
    updatedAt: nowIso
  };
}

export function createMeetingMemoryPatch(snapshot: StreamInterpretationSnapshot): MeetingMemoryPatch {
  const topSignals = [...snapshot.detectedSignals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    conversationId: snapshot.conversationId,
    participantId: snapshot.participantId ?? null,
    semanticDelta: snapshot.rollingSummary,
    processDelta: snapshot.interventionRationale ?? `Turn state: ${snapshot.turnBoundary}; token risk: ${snapshot.tokenBudgetRisk}.`,
    signalScores: topSignals,
    lastSequence: snapshot.lastSequence
  };
}

function normalizeChunkText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildWorkingText(previous: string, next: string, status: FacilitatorStreamChunk["status"]): string {
  if (status === "cancelled") return "";
  const separator = previous && next ? " " : "";
  const merged = status === "partial" ? `${previous}${separator}${next}` : `${previous}${separator}${next}`;
  return trimStartToLength(merged, MAX_WORKING_TEXT_CHARS);
}

function updateRollingSummary(previous: string, next: string, status: FacilitatorStreamChunk["status"]): string {
  if (!next) return previous;
  const checkpointPrefix = status === "final" ? "Final turn detail" : status === "checkpoint" ? "Checkpoint" : "Partial signal";
  const merged = `${previous ? `${previous} ` : ""}${checkpointPrefix}: ${next}`;
  return trimStartToLength(merged, MAX_ROLLING_SUMMARY_CHARS);
}

function estimateTurnBoundary(
  previous: StreamInterpretationSnapshot | null,
  chunk: FacilitatorStreamChunk,
  behavior: FacilitatorBehaviorProfile,
  workingText: string
): TurnBoundaryState {
  if (chunk.status === "cancelled") return "abandoned";
  if (chunk.status === "final") return "complete";

  const lastUpdated = previous ? Date.parse(previous.updatedAt) : chunk.clientTimestampMs;
  const silenceMs = Math.max(0, chunk.clientTimestampMs - lastUpdated);
  const endsWithBoundary = /[.!?]\s*$/.test(workingText);

  if (chunk.status === "checkpoint") return endsWithBoundary ? "probably_complete" : "collecting";
  if (silenceMs >= behavior.turnCompletionSilenceMs && endsWithBoundary) return "probably_complete";
  return "collecting";
}

function detectFacilitationSignals(text: string, behavior: FacilitatorBehaviorProfile): FacilitationSignalScore[] {
  const lower = text.toLowerCase();
  const signals: FacilitationSignalScore[] = [];

  const add = (kind: FacilitationSignalScore["kind"], score: number, evidence: string) => {
    if (behavior.monitoredSignals.includes(kind) || kind === "unresolved_question") {
      signals.push({ kind, score: clampScore(score), evidence });
    }
  };

  const questionCount = (text.match(/\?/g) ?? []).length;
  if (questionCount >= 2 || /i don'?t understand|confused|unclear|lost/.test(lower)) {
    add("confusion", Math.min(0.95, 0.45 + questionCount * 0.15), "Multiple questions or explicit confusion language detected.");
  }

  if (/but we already|again|as i said|same point|repeat/.test(lower)) {
    add("repetition", 0.72, "Repetition markers suggest the group may be circling around the same point.");
  }

  if (/disagree|wrong|not true|conflict|frustrated|annoyed/.test(lower)) {
    add("conflict", 0.78, "Disagreement or frustration language detected.");
  }

  if (/decision|decide|agree|consensus|next step|action item/.test(lower)) {
    add("decision_readiness", 0.68, "Decision or next-step language indicates possible convergence.");
  }

  if (text.length > LONG_TURN_WARNING_CHARS) {
    add("dominance", Math.min(0.9, text.length / HIGH_TOKEN_RISK_CHARS), "A long uninterrupted turn may need compression or gentle facilitation.");
  }

  if (/by the way|unrelated|different topic|another subject/.test(lower)) {
    add("topic_drift", 0.7, "Topic-shift markers suggest possible drift from the active objective.");
  }

  if (questionCount > 0 && !/[.!]$/.test(text.trim())) {
    add("unresolved_question", 0.62, "The partial turn includes an unresolved question-like fragment.");
  }

  return signals.sort((a, b) => b.score - a.score);
}

function shouldEscalateToIntervention(
  signals: FacilitationSignalScore[],
  turnBoundary: TurnBoundaryState,
  status: FacilitatorStreamChunk["status"],
  tokenBudgetRisk: StreamInterpretationSnapshot["tokenBudgetRisk"]
): boolean {
  if (status === "cancelled") return false;
  if (tokenBudgetRisk === "high") return true;
  if (turnBoundary === "collecting" && status === "partial") return signals.some((signal) => signal.score >= 0.85);
  return signals.some((signal) => signal.score >= 0.7);
}

function selectAvatarState(
  signals: FacilitationSignalScore[],
  turnBoundary: TurnBoundaryState,
  shouldConsiderIntervention: boolean,
  status: FacilitatorStreamChunk["status"]
): FacilitatorAvatarState {
  if (status === "cancelled") {
    return { expression: "neutral", motion: "idle", intensity: "low", reason: "Partial input was cancelled." };
  }

  if (shouldConsiderIntervention) {
    const topSignal = signals[0];
    return {
      expression: topSignal?.kind === "conflict" ? "concerned" : "thinking",
      motion: "thinking",
      intensity: topSignal?.score && topSignal.score > 0.82 ? "high" : "medium",
      reason: topSignal ? `Considering facilitation because of ${topSignal.kind}.` : "Considering facilitation opportunity."
    };
  }

  if (turnBoundary === "complete" || turnBoundary === "probably_complete") {
    return { expression: "encouraging", motion: "acknowledging", intensity: "medium", reason: "Turn appears ready for acknowledgement." };
  }

  return { expression: "attentive", motion: "listening", intensity: "low", reason: "Participant is still forming their contribution." };
}

function buildInterventionRationale(
  signals: FacilitationSignalScore[],
  tokenBudgetRisk: StreamInterpretationSnapshot["tokenBudgetRisk"],
  turnBoundary: TurnBoundaryState
): string {
  const top = signals[0];
  const signalPart = top ? `${top.kind} scored ${top.score.toFixed(2)}: ${top.evidence}` : "No dominant signal.";
  return `${signalPart} Turn boundary is ${turnBoundary}; token budget risk is ${tokenBudgetRisk}.`;
}

function trimStartToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(value.length - maxLength).trimStart();
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}
