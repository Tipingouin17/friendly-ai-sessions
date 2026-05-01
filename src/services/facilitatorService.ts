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
  // Guard: verify the session template is not admin-locked before creating a
  // conversation. This is a client-side check; the backend REST endpoint also
  // enforces this via a trigger/check to prevent direct API bypass.
  const { data: session, error: sessionError } = await api
    .from('sessions')
    .select('id, lock, lock_reason')
    .eq('id', params.workshopId)
    .single();

  if (sessionError) throw sessionError;

  if (session?.lock) {
    const reason = session.lock_reason
      ? ` Reason: ${session.lock_reason}`
      : "";
    throw new Error(
      `This session has been locked by an administrator and is not available.${reason}`
    );
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
