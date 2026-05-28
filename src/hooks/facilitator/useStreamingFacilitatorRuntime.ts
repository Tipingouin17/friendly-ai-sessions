import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FacilitatorAvatarState,
  FacilitatorBehaviorProfile,
  FacilitatorStreamChunk,
  StreamInterpretationSnapshot,
  getFacilitatorRuntimeFeatureFlags
} from "@/types/facilitatorRuntime";
import {
  createInitialStreamInterpreterState,
  createMeetingMemoryPatch,
  interpretStreamChunk
} from "@/services/facilitator/streamInterpreter";
import {
  loadFacilitatorBehaviorProfile,
  persistAvatarStateChangedEvent,
  persistMeetingSnapshot,
  persistStreamChunkEvent,
  subscribeToFacilitatorAvatarState
} from "@/services/facilitator/facilitatorRuntimeService";

interface UseStreamingFacilitatorRuntimeArgs {
  conversationId: number | null;
  facilitatorId?: number | null;
  sessionId?: number | null;
  participantId?: number | null;
  participantName?: string | null;
  inputMessage?: string;
  isAdmin?: boolean;
}

export interface UseStreamingFacilitatorRuntimeResult {
  enabled: boolean;
  behaviorProfile: FacilitatorBehaviorProfile | null;
  snapshot: StreamInterpretationSnapshot | null;
  avatarState: FacilitatorAvatarState | null;
  pushStreamChunk: (chunk: Omit<FacilitatorStreamChunk, "conversationId" | "participantId" | "participantName" | "sequence" | "clientTimestampMs">) => void;
}

const EMPTY_INPUT = "";

export function useStreamingFacilitatorRuntime({
  conversationId,
  facilitatorId,
  sessionId,
  participantId,
  participantName,
  inputMessage = EMPTY_INPUT,
  isAdmin = false
}: UseStreamingFacilitatorRuntimeArgs): UseStreamingFacilitatorRuntimeResult {
  const flags = useMemo(() => getFacilitatorRuntimeFeatureFlags(), []);
  const enabled = Boolean(flags.streamingInterpretationEnabled && conversationId);
  const [behaviorProfile, setBehaviorProfile] = useState<FacilitatorBehaviorProfile | null>(null);
  const [snapshot, setSnapshot] = useState<StreamInterpretationSnapshot | null>(null);
  const [avatarState, setAvatarState] = useState<FacilitatorAvatarState | null>(null);
  const interpreterStateRef = useRef(createInitialStreamInterpreterState());
  const sequenceRef = useRef(0);
  const lastInputRef = useRef(EMPTY_INPUT);
  const debounceRef = useRef<number | null>(null);
  const lastPersistedAvatarStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    loadFacilitatorBehaviorProfile({ facilitatorId, sessionId }).then((profile) => {
      if (!cancelled) setBehaviorProfile(profile);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, facilitatorId, sessionId]);

  const processChunk = useCallback((chunk: FacilitatorStreamChunk) => {
    if (!enabled || !behaviorProfile) return;

    const nextSnapshot = interpretStreamChunk(
      interpreterStateRef.current.snapshot,
      chunk,
      behaviorProfile
    );
    interpreterStateRef.current.snapshot = nextSnapshot;
    setSnapshot(nextSnapshot);
    setAvatarState(nextSnapshot.recommendedAvatarState);

    const memoryPatch = createMeetingMemoryPatch(nextSnapshot);
    const avatarStateKey = JSON.stringify(nextSnapshot.recommendedAvatarState);
    void persistStreamChunkEvent(chunk, facilitatorId);
    void persistMeetingSnapshot(nextSnapshot, memoryPatch, facilitatorId);
    if (avatarStateKey !== lastPersistedAvatarStateRef.current) {
      lastPersistedAvatarStateRef.current = avatarStateKey;
      void persistAvatarStateChangedEvent(nextSnapshot, nextSnapshot.recommendedAvatarState, facilitatorId);
    }
  }, [behaviorProfile, enabled, facilitatorId]);

  const pushStreamChunk = useCallback<UseStreamingFacilitatorRuntimeResult["pushStreamChunk"]>((partial) => {
    if (!enabled || !conversationId) return;

    sequenceRef.current += 1;
    processChunk({
      conversationId,
      participantId: participantId ?? null,
      participantName: participantName ?? null,
      sequence: sequenceRef.current,
      clientTimestampMs: performance.now(),
      ...partial
    });
  }, [conversationId, enabled, participantId, participantName, processChunk]);

  useEffect(() => {
    if (!enabled || !conversationId || isAdmin) return;

    const currentInput = inputMessage ?? EMPTY_INPUT;
    const previousInput = lastInputRef.current;
    if (currentInput === previousInput) return;

    const addedText = currentInput.startsWith(previousInput)
      ? currentInput.slice(previousInput.length)
      : currentInput;
    lastInputRef.current = currentInput;

    if (!addedText.trim()) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      pushStreamChunk({
        modality: "typed",
        status: currentInput.length > 900 ? "checkpoint" : "partial",
        text: addedText
      });
    }, 180);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [conversationId, enabled, inputMessage, isAdmin, pushStreamChunk]);

  useEffect(() => {
    if (!enabled || !conversationId || !flags.avatarStateEnabled) return;

    const subscription = subscribeToFacilitatorAvatarState(conversationId, setAvatarState);
    return () => subscription.unsubscribe();
  }, [conversationId, enabled, flags.avatarStateEnabled]);

  return {
    enabled,
    behaviorProfile,
    snapshot,
    avatarState,
    pushStreamChunk
  };
}
