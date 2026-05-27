import api, { type RealtimeChannel, type RealtimePayload } from "@/lib/api";

export type ModeStatus = "recommended" | "pending_host_confirmation" | "active" | "ending" | "ended" | "rejected";

export type ModeEventType =
  | "mode.recommended"
  | "mode.started"
  | "participant.state.updated"
  | "mode.input.submitted"
  | "mode.synthesis.ready"
  | "mode.ended"
  | "mode.rejected";

export interface FacilitationModePolicy {
  [key: string]: unknown;
}

export interface FacilitationMode {
  id: number;
  mode_key: string;
  display_name: string;
  purpose: string;
  primary_input: string;
  composer_component: string;
  composer_copy: string;
  floor_rules: FacilitationModePolicy;
  privacy_model: string;
  ai_responsibilities: string[];
  entry_conditions: string[];
  exit_conditions: string[];
  candidate_transitions: string[];
  success_metrics: string[];
  default_timer_seconds: number;
  requires_host_confirmation: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FacilitatorModeAccess {
  id: number;
  facilitator_id: number;
  mode_id: number;
  enabled: boolean;
  policy_override: FacilitationModePolicy;
  created_at?: string;
  updated_at?: string;
  facilitation_mode?: FacilitationMode | null;
}

export interface FacilitatorModeAssignment extends FacilitationMode {
  access_id?: number;
  facilitator_id?: number;
  enabled: boolean;
  policy_override: FacilitationModePolicy;
  effective_policy: FacilitationModePolicy;
}

export interface SessionActiveMode {
  id: number;
  conversation_id: number;
  mode_id: number;
  facilitator_id?: number | null;
  status: ModeStatus;
  prompt?: string | null;
  options: Record<string, unknown>;
  policy: FacilitationModePolicy;
  started_at?: string | null;
  ends_at?: string | null;
  ended_at?: string | null;
  requested_by?: string | null;
  approved_by?: string | null;
  metrics: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  facilitation_mode?: FacilitationMode | null;
}

export interface SessionModeEvent {
  id: number;
  conversation_id: number;
  active_mode_id?: number | null;
  mode_id?: number | null;
  facilitator_id?: number | null;
  participant_id?: number | null;
  event_type: ModeEventType;
  payload: Record<string, unknown>;
  reason?: string | null;
  confidence?: number | null;
  requires_confirmation: boolean;
  trigger_signals: unknown[];
  created_by?: string | null;
  created_at?: string;
}

export interface ModeParticipantState {
  id: number;
  active_mode_id: number;
  conversation_id: number;
  participant_id: number;
  can_speak: boolean;
  is_current_speaker: boolean;
  is_next: boolean;
  can_submit: boolean;
  remaining_time?: number | null;
  allowed_actions: string[];
  state: Record<string, unknown>;
  updated_at?: string;
}

export interface ModeInput {
  id: number;
  active_mode_id: number;
  conversation_id: number;
  mode_id: number;
  participant_id?: number | null;
  input_type: string;
  visibility: "private" | "private_until_synthesis" | "anonymous_aggregate" | "attributed" | "public";
  content: Record<string, unknown>;
  included_in_synthesis: boolean;
  created_at?: string;
}

export interface ModeEventRequest {
  conversation_id: number;
  event_type: ModeEventType;
  active_mode_id?: number;
  mode_id?: number;
  mode_key?: string;
  facilitator_id?: number;
  participant_id?: number;
  prompt?: string;
  options?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  reason?: string;
  confidence?: number;
  requires_confirmation?: boolean;
  trigger_signals?: unknown[];
  status?: ModeStatus;
  timer_seconds?: number;
  input_type?: string;
  visibility?: ModeInput["visibility"];
  content?: Record<string, unknown>;
}

export interface ModeEventResponse {
  event: SessionModeEvent;
  active_mode: SessionActiveMode | null;
  participant_state?: ModeParticipantState | null;
  input?: ModeInput | null;
}

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const asArray = <T = unknown>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const normalizeMode = (mode: FacilitationMode): FacilitationMode => ({
  ...mode,
  floor_rules: asObject(mode.floor_rules),
  ai_responsibilities: asArray<string>(mode.ai_responsibilities),
  entry_conditions: asArray<string>(mode.entry_conditions),
  exit_conditions: asArray<string>(mode.exit_conditions),
  candidate_transitions: asArray<string>(mode.candidate_transitions),
  success_metrics: asArray<string>(mode.success_metrics),
});

const normalizeActiveMode = (activeMode: SessionActiveMode): SessionActiveMode => ({
  ...activeMode,
  options: asObject(activeMode.options),
  policy: asObject(activeMode.policy),
  metrics: asObject(activeMode.metrics),
  facilitation_mode: activeMode.facilitation_mode ? normalizeMode(activeMode.facilitation_mode) : activeMode.facilitation_mode,
});

export const fetchFacilitationModes = async (): Promise<FacilitationMode[]> => {
  const { data, error } = await api
    .from("facilitation_modes")
    .select("*")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as FacilitationMode[]).map(normalizeMode);
};

export const fetchFacilitatorModeAssignments = async (facilitatorId: number): Promise<FacilitatorModeAssignment[]> => {
  const { data, error } = await api
    .from("facilitator_mode_access")
    .select("*, facilitation_mode:facilitation_modes!inner(*)")
    .eq("facilitator_id", facilitatorId)
    .order("enabled", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as FacilitatorModeAccess[]).map((assignment) => {
    const mode = assignment.facilitation_mode;
    if (!mode) return null;
    const normalizedMode = normalizeMode(mode);
    const policyOverride = asObject(assignment.policy_override);
    return {
      ...normalizedMode,
      access_id: assignment.id,
      facilitator_id: assignment.facilitator_id,
      enabled: assignment.enabled,
      policy_override: policyOverride,
      effective_policy: {
        ...asObject(normalizedMode.floor_rules),
        ...policyOverride,
      },
    } satisfies FacilitatorModeAssignment;
  }).filter((mode): mode is FacilitatorModeAssignment => Boolean(mode));
};

export const fetchEnabledFacilitatorModes = async (facilitatorId: number): Promise<FacilitatorModeAssignment[]> => {
  const assignments = await fetchFacilitatorModeAssignments(facilitatorId);
  return assignments.filter((mode) => mode.enabled && mode.is_active);
};

export const fetchActiveSessionMode = async (conversationId: number): Promise<SessionActiveMode | null> => {
  const { data, error } = await api
    .from("session_active_modes")
    .select("*, facilitation_mode:facilitation_modes!inner(*)")
    .eq("conversation_id", conversationId)
    .in("status", ["recommended", "pending_host_confirmation", "active", "ending"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeActiveMode(data as SessionActiveMode) : null;
};

export const fetchModeParticipantState = async (
  activeModeId: number,
  participantId: number
): Promise<ModeParticipantState | null> => {
  const { data, error } = await api
    .from("mode_participant_states")
    .select("*")
    .eq("active_mode_id", activeModeId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (error) throw error;
  return data ? {
    ...(data as ModeParticipantState),
    allowed_actions: asArray<string>((data as ModeParticipantState).allowed_actions),
    state: asObject((data as ModeParticipantState).state),
  } : null;
};

export const fetchRecentModeEvents = async (
  conversationId: number,
  limit = 12
): Promise<SessionModeEvent[]> => {
  const { data, error } = await api
    .from("session_mode_events")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as SessionModeEvent[]).map((event) => ({
    ...event,
    payload: asObject(event.payload),
    trigger_signals: asArray(event.trigger_signals),
  }));
};

export const sendModeEvent = async (request: ModeEventRequest): Promise<ModeEventResponse> => {
  const { data, error } = await api.functions.invoke<ModeEventResponse>("facilitator-mode-event", {
    body: request,
  });

  if (error) throw error;
  if (!data) throw new Error("Mode event did not return a response.");

  return {
    ...data,
    active_mode: data.active_mode ? normalizeActiveMode(data.active_mode) : null,
  };
};

export const startFacilitationMode = async (params: {
  conversationId: number;
  modeId: number;
  facilitatorId?: number;
  activeModeId?: number;
  prompt?: string;
  options?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  timerSeconds?: number;
}): Promise<ModeEventResponse> => sendModeEvent({
  conversation_id: params.conversationId,
  event_type: "mode.started",
  mode_id: params.modeId,
  active_mode_id: params.activeModeId,
  facilitator_id: params.facilitatorId,
  prompt: params.prompt,
  options: params.options,
  policy: params.policy,
  timer_seconds: params.timerSeconds,
});

export const approveFacilitationMode = async (params: {
  conversationId: number;
  activeModeId: number;
  facilitatorId?: number;
  reason?: string;
}): Promise<ModeEventResponse> => sendModeEvent({
  conversation_id: params.conversationId,
  event_type: "mode.started",
  active_mode_id: params.activeModeId,
  facilitator_id: params.facilitatorId,
  reason: params.reason,
});

export const recommendFacilitationMode = async (params: {
  conversationId: number;
  modeId: number;
  facilitatorId?: number;
  reason?: string;
  confidence?: number;
  prompt?: string;
  triggerSignals?: unknown[];
}): Promise<ModeEventResponse> => sendModeEvent({
  conversation_id: params.conversationId,
  event_type: "mode.recommended",
  mode_id: params.modeId,
  facilitator_id: params.facilitatorId,
  reason: params.reason,
  confidence: params.confidence,
  prompt: params.prompt,
  trigger_signals: params.triggerSignals,
  requires_confirmation: true,
});

export const endFacilitationMode = async (params: {
  conversationId: number;
  activeModeId: number;
  reason?: string;
  metrics?: Record<string, unknown>;
}): Promise<ModeEventResponse> => sendModeEvent({
  conversation_id: params.conversationId,
  event_type: "mode.ended",
  active_mode_id: params.activeModeId,
  reason: params.reason,
  payload: params.metrics ? { metrics: params.metrics } : {},
});

export const rejectFacilitationMode = async (params: {
  conversationId: number;
  activeModeId: number;
  reason?: string;
}): Promise<ModeEventResponse> => sendModeEvent({
  conversation_id: params.conversationId,
  event_type: "mode.rejected",
  active_mode_id: params.activeModeId,
  reason: params.reason,
});

export const submitModeInput = async (params: {
  conversationId: number;
  activeModeId: number;
  participantId?: number;
  inputType: string;
  content: Record<string, unknown>;
  visibility?: ModeInput["visibility"];
}): Promise<ModeEventResponse> => sendModeEvent({
  conversation_id: params.conversationId,
  event_type: "mode.input.submitted",
  active_mode_id: params.activeModeId,
  participant_id: params.participantId,
  input_type: params.inputType,
  content: params.content,
  visibility: params.visibility,
});

export const subscribeToModeOrchestrator = (
  conversationId: number,
  onChange: (payload: RealtimePayload<Record<string, unknown>>) => void,
  onStatus?: (status: string) => void
): RealtimeChannel => api
  .channel(`session-mode-${conversationId}`)
  .on("postgres_changes", { event: "*", schema: "public", table: "session_active_modes", filter: `conversation_id=eq.${conversationId}` }, onChange)
  .on("postgres_changes", { event: "*", schema: "public", table: "session_mode_events", filter: `conversation_id=eq.${conversationId}` }, onChange)
  .on("postgres_changes", { event: "*", schema: "public", table: "mode_participant_states", filter: `conversation_id=eq.${conversationId}` }, onChange)
  .on("postgres_changes", { event: "*", schema: "public", table: "mode_inputs", filter: `conversation_id=eq.${conversationId}` }, onChange)
  .subscribe((status) => onStatus?.(status));
