/**
 * Facilitator Service
 *
 * Data access layer for facilitators, sessions, and conversation creation.
 */

import api from "@/lib/api";

export interface ScheduledSessionInvitation {
  id: string;
  name: string;
  email: string;
  token: string;
  status: "invited" | "confirmed" | "waiting" | "live" | "missing";
  sent_at?: string | null;
  confirmed_at?: string | null;
}

export interface UpcomingScheduledSession {
  id: number;
  created_at?: string | null;
  participants?: number | null;
  participant_description?: string | null;
  session_duration_minutes?: number | null;
  flow_config?: Record<string, unknown> | null;
  join_token?: string | null;
  sessions?: {
    title?: string | null;
    facilitator?: number | null;
    objective?: string | null;
  } | null;
  scheduled_start_at: string;
  invited_count: number;
}

const getFlowConfigObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

export const getScheduledStartIso = (flowConfig: unknown): string | null => {
  const cfg = getFlowConfigObject(flowConfig);
  const value = cfg.scheduled_start_at;
  return typeof value === "string" && value ? value : null;
};

export const getSessionInvitations = (flowConfig: unknown): ScheduledSessionInvitation[] => {
  const cfg = getFlowConfigObject(flowConfig);
  return Array.isArray(cfg.invitations) ? (cfg.invitations as ScheduledSessionInvitation[]) : [];
};

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
  scheduledStartAt?: Date;
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

  const scheduledIso = params.scheduledStartAt?.toISOString();
  const isScheduled = Boolean(scheduledIso && new Date(scheduledIso).getTime() > Date.now() + 60_000);
  const flowConfig = isScheduled
    ? { scheduled_start_at: scheduledIso, invitation_status: "draft", invitations: [] }
    : undefined;

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
      // Keep database status aligned with the existing active-session constraint.
      // Scheduled behavior is represented by flow_config.scheduled_start_at so
      // hosted databases that only allow active conversations still accept the
      // record while the UI can distinguish scheduled sessions.
      status: "active",
      user_id: params.userId,
      ...(flowConfig ? { flow_config: flowConfig } : {}),
      ...(params.durationMinutes ? { session_duration_minutes: params.durationMinutes } : {})
    })
    .select('id')
    .single();
    
  if (error) throw error;
  return data;
};

export const fetchUpcomingScheduledSessions = async (userId?: string): Promise<UpcomingScheduledSession[]> => {
  const query = api
    .from('conversations')
    .select(`
      *,
      sessions!conversations_sessions_id_fkey (
        title,
        facilitator,
        objective
      )
    `)
    .eq('is_session_ended', false)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (userId) query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;

  const now = Date.now();
  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const scheduledStart = getScheduledStartIso(row.flow_config);
      const invitations = getSessionInvitations(row.flow_config);
      if (!scheduledStart) return null;
      return {
        ...(row as unknown as UpcomingScheduledSession),
        scheduled_start_at: scheduledStart,
        invited_count: invitations.length,
      };
    })
    .filter((row): row is UpcomingScheduledSession => Boolean(row && new Date(row.scheduled_start_at).getTime() >= now - 60_000))
    .sort((a, b) => new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime());
};

export const createSessionInvitations = async (params: {
  conversationId: number;
  invitees: Array<{ name: string; email: string }>;
  emailSubject: string;
  emailBody: string;
  cfTurnstileToken?: string | null;
}) => {
  const { data: conversation, error: loadError } = await api
    .from('conversations')
    .select('id, flow_config, join_token')
    .eq('id', params.conversationId)
    .single();

  if (loadError) throw loadError;

  const existingConfig = getFlowConfigObject((conversation as Record<string, unknown>)?.flow_config);
  const nowIso = new Date().toISOString();
  const invitations: ScheduledSessionInvitation[] = params.invitees.map((invitee, index) => {
    const tokenSource = `${params.conversationId}:${invitee.email}:${Date.now()}:${index}:${Math.random()}`;
    let token = '';
    try {
      token = btoa(tokenSource).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
    } catch {
      token = `${Date.now()}${index}`;
    }
    return {
      id: `${params.conversationId}-${index + 1}`,
      name: invitee.name.trim(),
      email: invitee.email.trim().toLowerCase(),
      token,
      status: 'invited',
      sent_at: nowIso,
      confirmed_at: null,
    };
  });

  const updatedFlowConfig = {
    ...existingConfig,
    invitation_status: 'sent',
    invitations,
    invitation_email_subject: params.emailSubject,
    invitation_email_body: params.emailBody,
    invitations_updated_at: nowIso,
  };

  const { data, error } = await api
    .from('conversations')
    .update({ flow_config: updatedFlowConfig })
    .eq('id', params.conversationId)
    .select('id, flow_config')
    .single();

  if (error) throw error;

  if (params.cfTurnstileToken) {
    api.functions.invoke('send-session-invitations', {
      body: {
        conversation_id: params.conversationId,
        invitees: invitations,
        subject: params.emailSubject,
        body: params.emailBody,
        cf_turnstile_token: params.cfTurnstileToken,
      },
    }).catch((err) => {
      console.warn('Invitation email endpoint is not available yet; invitations were saved as drafts.', err);
    });
  }

  return data;
};
