import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMeetingMemoryPatch, interpretStreamChunk } from "../../src/services/facilitator/streamInterpreter";
import { DEFAULT_FACILITATOR_BEHAVIOR_PROFILE } from "../../src/types/facilitatorRuntime";

describe("stream-aware facilitator interpreter", () => {
  it("keeps partial typed input in listening mode before a turn boundary", () => {
    const snapshot = interpretStreamChunk(null, {
      conversationId: 54,
      participantId: 1,
      participantName: "Bob",
      modality: "typed",
      status: "partial",
      text: "I think we should maybe",
      sequence: 1,
      clientTimestampMs: 100
    });

    assert.equal(snapshot.turnBoundary, "collecting");
    assert.equal(snapshot.shouldConsiderIntervention, false);
    assert.equal(snapshot.recommendedAvatarState.motion, "listening");
  });

  it("detects long uninterrupted turns as token-risk and potential dominance", () => {
    const longText = Array.from({ length: 120 }, (_, index) => `point ${index} repeats the same argument again`).join(" ");
    const snapshot = interpretStreamChunk(null, {
      conversationId: 54,
      participantId: 1,
      participantName: "Bob",
      modality: "typed",
      status: "checkpoint",
      text: longText,
      sequence: 1,
      clientTimestampMs: 100
    });

    assert.equal(snapshot.tokenBudgetRisk, "high");
    assert.equal(snapshot.shouldConsiderIntervention, true);
    assert.ok(snapshot.detectedSignals.some((signal) => signal.kind === "dominance"));
    assert.equal(snapshot.recommendedAvatarState.motion, "thinking");
  });

  it("detects unresolved partial questions without interrupting too early", () => {
    const snapshot = interpretStreamChunk(null, {
      conversationId: 54,
      participantId: 2,
      participantName: "Ana",
      modality: "typed",
      status: "partial",
      text: "what if we?",
      sequence: 1,
      clientTimestampMs: 100
    });

    assert.equal(snapshot.turnBoundary, "collecting");
    assert.equal(snapshot.shouldConsiderIntervention, false);
    assert.ok(snapshot.detectedSignals.some((signal) => signal.kind === "unresolved_question"));
    assert.equal(snapshot.recommendedAvatarState.motion, "listening");
  });

  it("updates rolling memory incrementally across chunks without requiring a final message", () => {
    const first = interpretStreamChunk(null, {
      conversationId: 54,
      participantId: 1,
      participantName: "Bob",
      modality: "speech",
      status: "partial",
      text: "I am confused about the next step",
      sequence: 1,
      clientTimestampMs: 100
    }, DEFAULT_FACILITATOR_BEHAVIOR_PROFILE);

    const second = interpretStreamChunk(first, {
      conversationId: 54,
      participantId: 1,
      participantName: "Bob",
      modality: "speech",
      status: "checkpoint",
      text: "should we decide now?",
      sequence: 2,
      clientTimestampMs: 1400
    }, DEFAULT_FACILITATOR_BEHAVIOR_PROFILE);

    assert.equal(second.lastSequence, 2);
    assert.match(second.rollingSummary, /confused/i);
    assert.ok(second.detectedSignals.some((signal) => signal.kind === "confusion"));
    assert.ok(second.detectedSignals.some((signal) => signal.kind === "decision_readiness"));
  });

  it("escalates conflict at checkpoint and exposes a clear intervention rationale", () => {
    const snapshot = interpretStreamChunk(null, {
      conversationId: 54,
      participantId: 3,
      participantName: "Chris",
      modality: "speech",
      status: "checkpoint",
      text: "I disagree, that is wrong and I am frustrated with this direction.",
      sequence: 1,
      clientTimestampMs: 100
    });

    assert.equal(snapshot.shouldConsiderIntervention, true);
    assert.equal(snapshot.recommendedAvatarState.expression, "concerned");
    assert.equal(snapshot.recommendedAvatarState.motion, "thinking");
    assert.match(snapshot.interventionRationale ?? "", /conflict scored/);
  });

  it("resets working text and avoids intervention when a draft is cancelled", () => {
    const previous = interpretStreamChunk(null, {
      conversationId: 54,
      participantId: 1,
      participantName: "Bob",
      modality: "typed",
      status: "partial",
      text: "I disagree and this is not true",
      sequence: 1,
      clientTimestampMs: 100
    });

    const cancelled = interpretStreamChunk(previous, {
      conversationId: 54,
      participantId: 1,
      participantName: "Bob",
      modality: "typed",
      status: "cancelled",
      text: "",
      sequence: 2,
      clientTimestampMs: 300
    });

    assert.equal(cancelled.workingText, "");
    assert.equal(cancelled.turnBoundary, "abandoned");
    assert.equal(cancelled.shouldConsiderIntervention, false);
    assert.equal(cancelled.recommendedAvatarState.motion, "idle");
  });

  it("creates compact meeting memory patches instead of passing the full turn forward", () => {
    const longText = Array.from({ length: 80 }, (_, index) => `decision point ${index} repeats again`).join(" ");
    const snapshot = interpretStreamChunk(null, {
      conversationId: 54,
      participantId: 1,
      participantName: "Bob",
      modality: "typed",
      status: "checkpoint",
      text: longText,
      sequence: 7,
      clientTimestampMs: 100
    });

    const patch = createMeetingMemoryPatch(snapshot);

    assert.equal(patch.conversationId, 54);
    assert.equal(patch.participantId, 1);
    assert.equal(patch.lastSequence, 7);
    assert.ok(patch.semanticDelta.length <= 900);
    assert.ok(patch.signalScores.length <= 3);
    assert.match(patch.processDelta, /token budget risk/);
  });
});
