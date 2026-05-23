import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpretStreamChunk } from "../../src/services/facilitator/streamInterpreter";
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
});
