/**
 * Facilitator Service
 *
 * Data access layer for facilitators, sessions, and conversation creation.
 */

import api from "@/lib/api";

export const fetchFacilitators = async () => {
  const { data, error } = await api
    .from('facilitators')
    .select('*')
    .order('order', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const fetchWorkshops = async (facilitatorId: number | null) => {
  // Exclude sessions that are inactive (status=false) or admin-locked for
  // content moderation (lock=true). The OR filter handles NULL lock values
  // (legacy rows without the column) as unlocked.
  const query = api
    .from('sessions')
    .select('*, facilitator:facilitators!inner(*)')
    .eq('status', true)
    .or('lock.is.null,lock.eq.false');
    
  if (facilitatorId) {
    query.eq('facilitator', facilitatorId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
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
    .single();

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
