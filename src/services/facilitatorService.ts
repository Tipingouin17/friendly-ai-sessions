/**
 * Facilitator Service
 *
 * Data access layer for facilitators, sessions, and conversation creation.
 */

import api from "@/lib/api";
import type { FacilitatorTool, FacilitatorToolAssignment, FacilitatorToolConfig } from "@/types/facilitator";

export const fetchFacilitators = async () => {
  const { data, error } = await api
    .from('facilitators')
    .select('*')
    .order('order', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const fetchWorkshops = async (facilitatorId: number | null) => {
  // Fetch active sessions. The backend's build_where() does not support the
  // PostgREST 'or' filter yet (fix pending Railway redeploy), so we filter
  // admin-locked sessions (lock=true) on the client side instead.
  // Sessions with lock=null (legacy rows) or lock=false are both considered
  // unlocked — this matches the intended PostgREST .or('lock.is.null,lock.eq.false').
  const query = api
    .from('sessions')
    .select('*, facilitator:facilitators!inner(*)')
    .eq('status', true);
    
  if (facilitatorId) {
    query.eq('facilitator', facilitatorId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  // Filter out admin-locked sessions client-side (lock === true means locked)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[])?.filter((s: any) => s.lock !== true) ?? [];
};

export const createConversation = async (params: {
  description: string;
  language: string;
  participantCount: number;
  workshopId: number;
  agreed: boolean;
  userId: string;
  durationMinutes?: number;
}) => {
  // Guard: verify the session template is not admin-locked and that the
  // facilitator is accessible for the user's plan tier before creating a
  // conversation. This is a client-side check; the backend REST endpoint also
  // enforces the admin lock via a trigger/check to prevent direct API bypass.
  const { data: session, error: sessionError } = await api
    .from('sessions')
    .select('id, lock, facilitator:facilitators!inner(id, plan_id, lock)')
    .eq('id', params.workshopId)
    .maybeSingle();

  if (sessionError) throw sessionError;

  if (session?.lock) {
    throw new Error(
      `This session has been locked by an administrator and is not available.`
    );
  }

  // Check facilitator plan-tier lock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facilitatorData = session?.facilitator as any;
  if (facilitatorData && typeof facilitatorData === 'object' && facilitatorData.lock === true) {
    // Resolve user's plan tier from their profile
    const { data: profileData } = await api
      .from('profiles')
      .select('current_plan_id')
      .eq('id', params.userId)
      .maybeSingle();
    const userPlanId: number = (profileData as Record<string, unknown> | null)?.current_plan_id as number ?? 1;
    const effectiveTier = userPlanId === 101 || userPlanId === 102 ? 2 : userPlanId === 103 ? 3 : userPlanId;
    const facPlanId: number = facilitatorData.plan_id ?? 1;
    if (facPlanId > effectiveTier) {
      throw new Error(
        `This workshop requires a higher plan tier. Please upgrade to access it.`
      );
    }
  }

  const { data, error } = await api
    .from('conversations')
    .insert({
      participant_description: params.description,
      language: params.language,
      participants: params.participantCount,
      sessions_id: params.workshopId,
      accept_terms_and_conditions: params.agreed,
      is_saved: false,
      is_session_ended: false,
      user_id: params.userId,
      ...(params.durationMinutes ? { session_duration_minutes: params.durationMinutes } : {})
    })
    .select('id')
    .single();
    
  if (error) throw error;
  return data;
};


const normalizeToolConfig = (value: unknown): FacilitatorToolConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as FacilitatorToolConfig;
};

const mergeToolConfig = (base: unknown, override: unknown): FacilitatorToolConfig => ({
  ...normalizeToolConfig(base),
  ...normalizeToolConfig(override),
});

export const fetchToolboxTools = async (): Promise<FacilitatorTool[]> => {
  const { data, error } = await api
    .from('facilitator_tools')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as FacilitatorTool[]).map((tool) => ({
    ...tool,
    config: normalizeToolConfig(tool.config),
  }));
};

export const fetchFacilitatorToolAssignments = async (facilitatorId: number): Promise<FacilitatorToolAssignment[]> => {
  const { data, error } = await api
    .from('facilitator_tool_access')
    .select('*, facilitator_tool:facilitator_tools!inner(*)')
    .eq('facilitator_id', facilitatorId)
    .order('enabled', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: number;
    facilitator_id: number;
    tool_id: number;
    enabled: boolean;
    config_override: unknown;
    facilitator_tool?: FacilitatorTool | null;
  }>).map((assignment) => {
    const tool = assignment.facilitator_tool;
    if (!tool) return null;
    const configOverride = normalizeToolConfig(assignment.config_override);
    return {
      ...tool,
      access_id: assignment.id,
      facilitator_id: assignment.facilitator_id,
      enabled: assignment.enabled,
      config: normalizeToolConfig(tool.config),
      config_override: configOverride,
      effective_config: mergeToolConfig(tool.config, configOverride),
    } as FacilitatorToolAssignment;
  }).filter(Boolean) as FacilitatorToolAssignment[];
};

export const fetchEnabledFacilitatorTools = async (facilitatorId: number): Promise<FacilitatorToolAssignment[]> => {
  const assignments = await fetchFacilitatorToolAssignments(facilitatorId);
  return assignments.filter((tool) => tool.enabled && tool.is_active);
};
