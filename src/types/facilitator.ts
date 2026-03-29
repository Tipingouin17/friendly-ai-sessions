
export type Step = 1 | 2 | 3;

export interface Facilitator {
  id: number;
  title: string;
  profile_picture: string;
  details: string;
  lock?: boolean;
  order?: number;
  is_promoted?: boolean;
  plan_id?: number | null;
}

export interface Workshop {
  id: number;
  title: string;
  scope: string;
  objective: string;
  icon_type?: string;
  welcome_message?: string;
  status?: boolean;
  facilitator?: number;
}

export interface Conversation {
  id: number;
  participant_description: string;
  language: string;
  participants: number;
  accept_terms_and_conditions: boolean;
  is_saved: boolean;
  is_session_ended: boolean;
  sessions_id?: number;
  user_id?: string;
}

// Update the plan restriction interface to match our new column names
export interface PlanRestriction {
  id: number;
  facilitator_limit: number | null;
  session_limit: number | null;
  max_participants: number | null;
  question_limit: number;
  customisable_facilitators: boolean;
  customisable_sessions?: boolean;
  saved_sessions?: boolean;
  session_reports?: boolean;
  data_export?: boolean;
  plan_id?: number;
}
