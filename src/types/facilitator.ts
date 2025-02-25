
export type Step = 1 | 2 | 3;

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type SessionType = 'workshop' | 'training' | 'consultation' | 'coaching' | 'team_building';

export interface Facilitator {
  id: number;
  title: string;
  profile_picture: string;
  details: string;
  description?: string;
  specialties?: string[];
  languages?: string[];
  rating?: number;
  total_sessions?: number;
  expertise_level?: ExpertiseLevel;
  last_active?: string;
  lock?: boolean;
  order?: number;
  is_promoted?: boolean;
}

export interface Workshop {
  id: number;
  title: string;
  scope: string;
  objective: string;
  session_type?: SessionType;
  duration_minutes?: number;
  skill_level?: SkillLevel;
  tags?: string[];
  prerequisites?: string[];
  learning_outcomes?: string[];
  category_id?: number;
  icon_type?: string;
  welcome_message?: string;
  status?: boolean;
  facilitator?: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  created_at?: string;
}
