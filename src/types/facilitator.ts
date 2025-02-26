
export type Step = 1 | 2 | 3;

export interface Facilitator {
  id: number;
  title: string;
  profile_picture: string;
  details: string;
  lock?: boolean;
  order?: number;
  is_promoted?: boolean;
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
