import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConversationWithSession } from "@/types/database";
import {
  approveFacilitationMode,
  endFacilitationMode,
  fetchActiveSessionMode,
  fetchEnabledFacilitatorModes,
  fetchModeParticipantState,
  fetchRecentModeEvents,
  rejectFacilitationMode,
  startFacilitationMode,
  submitModeInput,
  subscribeToModeOrchestrator,
  type FacilitatorModeAssignment,
  type ModeEventResponse,
  type ModeInput,
  type ModeParticipantState,
  type SessionActiveMode,
  type SessionModeEvent,
} from "@/services/modeOrchestratorService";

type ModeConversation = ConversationWithSession | (Partial<ConversationWithSession> & {
  session?: {
    facilitator?: number | string | { id?: number } | null;
    facilitator_id?: number | string | null;
    facilitator_details?: { id?: number } | null;
  } | null;
  facilitator_id?: number | string | null;
});

const extractFacilitatorId = (conversation: ModeConversation | null | undefined): number | null => {
  const session = conversation?.sessions ?? conversation?.session ?? null;
  const facilitator = session?.facilitator ?? session?.facilitator_id ?? conversation?.facilitator_id ?? null;

  if (typeof facilitator === "number") return facilitator;
  if (typeof facilitator === "string" && facilitator.trim()) {
    const parsed = Number(facilitator);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (facilitator && typeof facilitator === "object" && typeof facilitator.id === "number") {
    return facilitator.id;
  }

  const detailsId = session?.facilitator_details?.id;
  return typeof detailsId === "number" ? detailsId : null;
};

const getConversationId = (conversation: ModeConversation | null | undefined, fallbackId?: number | null): number | null => {
  if (fallbackId) return fallbackId;
  const id = conversation?.id;
  return typeof id === "number" ? id : null;
};

export const buildModeOrchestratorInstruction = (
  modes: FacilitatorModeAssignment[],
  activeMode: SessionActiveMode | null
): string | undefined => {
  const enabledModes = modes.filter((mode) => mode.enabled && mode.is_active);
  if (enabledModes.length === 0 && !activeMode) return undefined;

  const catalog = enabledModes
    .map((mode) => `- ${mode.display_name} (${mode.mode_key}): ${mode.purpose}. Composer: ${mode.composer_component}. Entry: ${mode.entry_conditions.join(", ") || "host command"}.`)
    .join("\n");

  const active = activeMode?.facilitation_mode
    ? `\n[ACTIVE MODE] ${activeMode.facilitation_mode.display_name} (${activeMode.status}). Prompt: ${activeMode.prompt || "none"}. Floor rules: ${JSON.stringify(activeMode.policy || activeMode.facilitation_mode.floor_rules)}.`
    : "\n[ACTIVE MODE] No explicit mode is currently active. Recommend a mode when a structured intervention would improve session quality.";

  return [
    "[MODE ORCHESTRATOR] You may recommend or use only the enabled facilitation modes listed below. Treat these as explicit session modes, not informal suggestions. When host confirmation is required, explain why the mode should start before proceeding.",
    catalog || "No enabled modes are configured for this facilitator.",
    active,
  ].join("\n");
};

export const useFacilitationModeOrchestrator = (
  conversation: ModeConversation | null | undefined,
  options: {
    conversationId?: number | null;
    participantId?: number | null;
    realtime?: boolean;
  } = {}
) => {
  const facilitatorId = useMemo(() => extractFacilitatorId(conversation), [conversation]);
  const conversationId = useMemo(
    () => getConversationId(conversation, options.conversationId),
    [conversation, options.conversationId]
  );

  const [enabledModes, setEnabledModes] = useState<FacilitatorModeAssignment[]>([]);
  const [activeMode, setActiveMode] = useState<SessionActiveMode | null>(null);
  const [participantModeState, setParticipantModeState] = useState<ModeParticipantState | null>(null);
  const [recentModeEvents, setRecentModeEvents] = useState<SessionModeEvent[]>([]);
  const [isLoadingModes, setIsLoadingModes] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);

  const refreshRecentEvents = useCallback(async () => {
    if (!conversationId) {
      setRecentModeEvents([]);
      return [];
    }

    const events = await fetchRecentModeEvents(conversationId);
    setRecentModeEvents(events);
    return events;
  }, [conversationId]);

  const refreshActiveMode = useCallback(async () => {
    if (!conversationId) {
      setActiveMode(null);
      setParticipantModeState(null);
      setRecentModeEvents([]);
      return null;
    }

    const nextActiveMode = await fetchActiveSessionMode(conversationId);
    setActiveMode(nextActiveMode);

    if (nextActiveMode && options.participantId) {
      const state = await fetchModeParticipantState(nextActiveMode.id, options.participantId);
      setParticipantModeState(state);
    } else {
      setParticipantModeState(null);
    }

    await refreshRecentEvents().catch((error) => {
      console.warn("[MODE_ORCHESTRATOR] Failed to load recent mode events", error);
    });

    return nextActiveMode;
  }, [conversationId, options.participantId, refreshRecentEvents]);

  useEffect(() => {
    let cancelled = false;

    if (!facilitatorId) {
      setEnabledModes([]);
      return;
    }

    setIsLoadingModes(true);
    setModeError(null);

    fetchEnabledFacilitatorModes(facilitatorId)
      .then((modes) => {
        if (!cancelled) setEnabledModes(modes);
      })
      .catch((error) => {
        console.error("[MODE_ORCHESTRATOR] Failed to load facilitator modes", error);
        if (!cancelled) {
          setEnabledModes([]);
          setModeError(error instanceof Error ? error.message : "Unable to load facilitation modes");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingModes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [facilitatorId]);

  useEffect(() => {
    let cancelled = false;
    setModeError(null);

    refreshActiveMode()
      .catch((error) => {
        console.error("[MODE_ORCHESTRATOR] Failed to load active mode", error);
        if (!cancelled) setModeError(error instanceof Error ? error.message : "Unable to load active mode");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshActiveMode]);

  useEffect(() => {
    if (!options.realtime || !conversationId) return;

    let cancelled = false;
    let refreshTimer: number | null = null;

    const scheduleRefresh = () => {
      if (cancelled) return;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshActiveMode().catch((error) => {
          console.error("[MODE_ORCHESTRATOR] Failed to refresh active mode after realtime update", error);
          if (!cancelled) setModeError(error instanceof Error ? error.message : "Unable to refresh active mode");
        });
      }, 120);
    };

    const channel = subscribeToModeOrchestrator(
      conversationId,
      () => scheduleRefresh(),
      (status) => {
        if (status === "SUBSCRIBED") scheduleRefresh();
      }
    );

    return () => {
      cancelled = true;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      void channel.unsubscribe();
    };
  }, [conversationId, options.realtime, refreshActiveMode]);

  const applyResponse = useCallback((response: ModeEventResponse) => {
    setActiveMode(response.active_mode ?? null);
    if (response.participant_state) setParticipantModeState(response.participant_state);
    if (response.event) {
      const nextEvent = response.event;
      setRecentModeEvents((events) => [nextEvent, ...events.filter((event) => event.id !== nextEvent.id)].slice(0, 12));
    }
  }, []);

  const startMode = useCallback(async (params: {
    modeId: number;
    prompt?: string;
    options?: Record<string, unknown>;
    policy?: Record<string, unknown>;
    timerSeconds?: number;
  }) => {
    if (!conversationId) throw new Error("No conversation is available for starting a facilitation mode.");
    const response = await startFacilitationMode({
      conversationId,
      modeId: params.modeId,
      facilitatorId: facilitatorId ?? undefined,
      prompt: params.prompt,
      options: params.options,
      policy: params.policy,
      timerSeconds: params.timerSeconds,
    });
    applyResponse(response);
    return response;
  }, [applyResponse, conversationId, facilitatorId]);

  const approveMode = useCallback(async (reason?: string) => {
    if (!conversationId || !activeMode) throw new Error("No pending facilitation mode is available to approve.");
    const response = await approveFacilitationMode({
      conversationId,
      activeModeId: activeMode.id,
      facilitatorId: facilitatorId ?? undefined,
      reason,
    });
    applyResponse(response);
    return response;
  }, [activeMode, applyResponse, conversationId, facilitatorId]);

  const endMode = useCallback(async (reason?: string) => {
    if (!conversationId || !activeMode) throw new Error("No active facilitation mode is available to end.");
    const response = await endFacilitationMode({
      conversationId,
      activeModeId: activeMode.id,
      reason,
    });
    applyResponse(response);
    return response;
  }, [activeMode, applyResponse, conversationId]);

  const rejectMode = useCallback(async (reason?: string) => {
    if (!conversationId || !activeMode) throw new Error("No active facilitation mode is available to reject.");
    const response = await rejectFacilitationMode({
      conversationId,
      activeModeId: activeMode.id,
      reason,
    });
    applyResponse(response);
    return response;
  }, [activeMode, applyResponse, conversationId]);

  const submitInput = useCallback(async (params: {
    inputType: string;
    content: Record<string, unknown>;
    visibility?: ModeInput["visibility"];
  }) => {
    if (!conversationId || !activeMode) throw new Error("No active facilitation mode is available for input.");
    const response = await submitModeInput({
      conversationId,
      activeModeId: activeMode.id,
      participantId: options.participantId ?? undefined,
      inputType: params.inputType,
      content: params.content,
      visibility: params.visibility,
    });
    applyResponse(response);
    return response;
  }, [activeMode, applyResponse, conversationId, options.participantId]);

  const modeInstruction = useMemo(
    () => buildModeOrchestratorInstruction(enabledModes, activeMode),
    [activeMode, enabledModes]
  );

  return {
    facilitatorId,
    conversationId,
    enabledModes,
    activeMode,
    participantModeState,
    recentModeEvents,
    isLoadingModes,
    modeError,
    modeInstruction,
    refreshActiveMode,
    refreshRecentEvents,
    startMode,
    approveMode,
    endMode,
    rejectMode,
    submitInput,
  };
};
