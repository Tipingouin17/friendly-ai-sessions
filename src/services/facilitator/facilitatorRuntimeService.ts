import api, { RealtimePayload } from "@/lib/api";
import {
  DEFAULT_FACILITATOR_BEHAVIOR_PROFILE,
  FacilitatorAvatarState,
  FacilitatorBehaviorProfile,
  FacilitatorRuntimeFeatureFlags,
  FacilitatorStreamChunk,
  MeetingMemoryPatch,
  StreamInterpretationSnapshot,
  getFacilitatorRuntimeFeatureFlags
} from "@/types/facilitatorRuntime";

export interface FacilitatorBehaviorRow {
  id: number;
  facilitator_id: number | null;
  scope: "global" | "facilitator" | "session";
  scope_id: number | null;
  behavior_profile: FacilitatorBehaviorProfile;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface FacilitatorRuntimeEventRow {
  id?: number;
  conversation_id: number;
  facilitator_id?: number | null;
  participant_id?: number | null;
  event_type: string;
  sequence?: number | null;
  payload: Record<string, unknown>;
  created_at?: string;
}

export interface FacilitatorMeetingSnapshotRow {
  id?: number;
  conversation_id: number;
  facilitator_id?: number | null;
  snapshot: StreamInterpretationSnapshot;
  memory_patch?: MeetingMemoryPatch | null;
  last_sequence: number;
  created_at?: string;
  updated_at?: string;
}

export interface LoadBehaviorOptions {
  facilitatorId?: number | null;
  sessionId?: number | null;
}

export async function loadFacilitatorBehaviorProfile(
  options: LoadBehaviorOptions
): Promise<FacilitatorBehaviorProfile> {
  const filters = [
    options.sessionId ? { scope: "session", scope_id: options.sessionId } : null,
    options.facilitatorId ? { scope: "facilitator", scope_id: options.facilitatorId } : null,
    { scope: "global", scope_id: null }
  ].filter(Boolean) as Array<{ scope: FacilitatorBehaviorRow["scope"]; scope_id: number | null }>;

  for (const filter of filters) {
    const query = api
      .from<FacilitatorBehaviorRow>("facilitator_behavior_profiles")
      .select("*")
      .eq("scope", filter.scope)
      .eq("is_default", true)
      .limit(1);

    const result = filter.scope_id === null
      ? await query.is("scope_id", null)
      : await query.eq("scope_id", filter.scope_id);

    if (result.error) continue;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (row?.behavior_profile) return row.behavior_profile;
  }

  return DEFAULT_FACILITATOR_BEHAVIOR_PROFILE;
}

export async function persistFacilitatorRuntimeEvent(
  event: FacilitatorRuntimeEventRow,
  flags: FacilitatorRuntimeFeatureFlags = getFacilitatorRuntimeFeatureFlags()
): Promise<void> {
  if (!flags.persistRuntimeEvents) return;

  await api
    .from<FacilitatorRuntimeEventRow>("facilitator_runtime_events")
    .insert(event);
}

export async function persistStreamChunkEvent(
  chunk: FacilitatorStreamChunk,
  facilitatorId?: number | null
): Promise<void> {
  await persistFacilitatorRuntimeEvent({
    conversation_id: chunk.conversationId,
    facilitator_id: facilitatorId ?? null,
    participant_id: chunk.participantId ?? null,
    event_type: `stream_chunk_${chunk.status}`,
    sequence: chunk.sequence,
    payload: {
      modality: chunk.modality,
      text: chunk.text,
      participantName: chunk.participantName ?? null,
      clientTimestampMs: chunk.clientTimestampMs,
      confidence: chunk.confidence ?? null
    }
  });
}

export async function persistMeetingSnapshot(
  snapshot: StreamInterpretationSnapshot,
  memoryPatch: MeetingMemoryPatch,
  facilitatorId?: number | null,
  flags: FacilitatorRuntimeFeatureFlags = getFacilitatorRuntimeFeatureFlags()
): Promise<void> {
  if (!flags.persistRuntimeEvents) return;

  await api
    .from<FacilitatorMeetingSnapshotRow>("facilitator_meeting_snapshots")
    .upsert({
      conversation_id: snapshot.conversationId,
      facilitator_id: facilitatorId ?? null,
      snapshot,
      memory_patch: memoryPatch,
      last_sequence: snapshot.lastSequence,
      updated_at: new Date().toISOString()
    }, { onConflict: "conversation_id" });
}

export async function persistAvatarStateChangedEvent(
  snapshot: StreamInterpretationSnapshot,
  avatarState: FacilitatorAvatarState,
  facilitatorId?: number | null,
  flags: FacilitatorRuntimeFeatureFlags = getFacilitatorRuntimeFeatureFlags()
): Promise<void> {
  if (!flags.avatarStateEnabled || !flags.persistRuntimeEvents) return;

  await persistFacilitatorRuntimeEvent({
    conversation_id: snapshot.conversationId,
    facilitator_id: facilitatorId ?? null,
    participant_id: snapshot.participantId ?? null,
    event_type: "avatar_state_changed",
    sequence: snapshot.lastSequence,
    payload: {
      avatarState,
      turnBoundary: snapshot.turnBoundary,
      tokenBudgetRisk: snapshot.tokenBudgetRisk,
      shouldConsiderIntervention: snapshot.shouldConsiderIntervention,
      interventionRationale: snapshot.interventionRationale ?? null,
      updatedAt: snapshot.updatedAt
    }
  }, flags);
}

export function subscribeToFacilitatorAvatarState(
  conversationId: number,
  onAvatarState: (state: FacilitatorAvatarState) => void
): { unsubscribe: () => void } {
  const channel = api
    .channel(`facilitator-avatar-state-${conversationId}`)
    .on<FacilitatorRuntimeEventRow>(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "facilitator_runtime_events",
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: RealtimePayload<FacilitatorRuntimeEventRow>) => {
        const event = payload.new;
        if (event.event_type !== "avatar_state_changed") return;
        const state = event.payload?.avatarState as FacilitatorAvatarState | undefined;
        if (state) onAvatarState(state);
      }
    )
    .subscribe();

  return { unsubscribe: () => channel.unsubscribe() };
}
