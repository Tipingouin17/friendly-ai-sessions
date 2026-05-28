/**
 * facilitator
 *
 * Type definitions for the AIfacilitator application.
 */

export type Step = 1 | 2 | 3;


export type FacilitatorGenderPresentation =
  | "feminine"
  | "masculine"
  | "neutral"
  | "non_binary"
  | "androgynous"
  | "custom";

export interface FacilitatorPersonaConfig {
  id: number;
  facilitator_id: number;
  display_name: string | null;
  pronouns: string[] | null;
  gender_presentation: FacilitatorGenderPresentation | string | null;
  voice_id: string | null;
  voice_provider: string | null;
  voice_style: string | null;
  avatar_style: string | null;
  avatar_asset_url: string | null;
  locale: string | null;
  tone: string | null;
  animation_preset: string | null;
  nonverbal_behavior: Record<string, unknown>;
  speaking_behavior: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Facilitator {
  id: number;
  title: string;
  profile_picture: string;
  details: string;
  specialties?: string[] | null;
  expertise_level?: string | null;
  languages?: string[] | null;
  lock?: boolean;
  order?: number;
  is_promoted?: boolean;
  plan_id?: number | null;
  persona_config?: FacilitatorPersonaConfig | null;
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
  /**
   * Joined facilitator object returned by fetchWorkshops via
   * `facilitator:facilitators!inner(*)`. The PostgREST alias "facilitator"
   * shadows the numeric FK field, so the raw API response returns an object
   * here instead of a number when the join is active.
   * We type it as `unknown` at this layer and cast it where needed.
   */
  facilitator_obj?: {
    id: number;
    plan_id?: number | null;
    lock?: boolean;
    title?: string;
  } | null;
  duration_minutes?: number | null;
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

export interface FacilitatorToolConfig {
  composerLabel?: string;
  hostCue?: string;
  participantPrompt?: string;
  runtimeBehavior?: string;
  visualAccent?: string;
  supportsAnonymousInput?: boolean;
  supportsVoting?: boolean;
  [key: string]: unknown;
}

export interface FacilitatorTool {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  config: FacilitatorToolConfig;
  token_cost_per_use: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FacilitatorToolAccess {
  id: number;
  facilitator_id: number;
  tool_id: number;
  enabled: boolean;
  config_override: FacilitatorToolConfig;
  created_at?: string;
  updated_at?: string;
  facilitator_tool?: FacilitatorTool | null;
}

export interface FacilitatorToolAssignment extends FacilitatorTool {
  access_id?: number;
  facilitator_id?: number;
  enabled: boolean;
  config_override: FacilitatorToolConfig;
  effective_config: FacilitatorToolConfig;
}

export interface ToolboxTokenSettings {
  toolbox_token_accounting_enabled: boolean;
  toolbox_default_token_budget: number;
  toolbox_overage_policy: string;
}

export type SpeechSpeakerRole = 'participant' | 'facilitator' | 'host' | 'system';
export type SpeechTurnSource = 'browser_speech_recognition' | 'manual' | 'tts_loopback' | 'imported';

export interface SessionSpeechTurn {
  id?: number;
  conversation_id: number;
  facilitator_id?: number | null;
  participant_id?: number | null;
  speaker_role: SpeechSpeakerRole;
  transcript: string;
  confidence?: number | null;
  language: string;
  is_final: boolean;
  source: SpeechTurnSource;
  duration_ms?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  metrics?: Record<string, unknown>;
  created_at?: string;
}

export type FacilitatorAvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'celebrating' | 'paused' | 'error';
export type FacilitatorTtsStatus = 'queued' | 'speaking' | 'completed' | 'cancelled' | 'failed';

export interface FacilitatorTtsEvent {
  id?: number;
  conversation_id: number;
  facilitator_id?: number | null;
  message_id?: string | null;
  provider: string;
  voice_id?: string | null;
  text_excerpt?: string | null;
  status: FacilitatorTtsStatus;
  avatar_state: FacilitatorAvatarState | string;
  audio_duration_ms?: number | null;
  lip_sync_markers?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface SessionFacilitationAnalyticsSnapshot {
  id?: number;
  conversation_id: number;
  facilitator_id?: number | null;
  analytics_version: string;
  speech_turn_count: number;
  tts_event_count: number;
  participant_balance?: number | null;
  participation_coverage?: number | null;
  topic_drift_score?: number | null;
  facilitation_health_score?: number | null;
  snapshot: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Phase3RuntimeSettings {
  speech_stack_enabled?: boolean;
  speech_default_language?: string;
  tts_avatar_enabled?: boolean;
  tts_default_voice_id?: string | null;
  tts_lip_sync_enabled?: boolean;
  facilitation_analytics_enabled?: boolean;
}
