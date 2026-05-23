-- Facilitation Mode Orchestrator
--
-- This migration promotes facilitator toolbox entries into explicit backend-owned
-- facilitation modes. The frontend should render participant composers from these
-- mode records and session_mode_events instead of inferring state from AI text.

create table if not exists public.facilitation_modes (
  id bigserial primary key,
  mode_key text not null unique,
  display_name text not null,
  purpose text not null,
  primary_input text not null,
  composer_component text not null,
  composer_copy text not null,
  floor_rules jsonb not null default '{}'::jsonb,
  privacy_model text not null,
  ai_responsibilities jsonb not null default '[]'::jsonb,
  entry_conditions jsonb not null default '[]'::jsonb,
  exit_conditions jsonb not null default '[]'::jsonb,
  candidate_transitions jsonb not null default '[]'::jsonb,
  success_metrics jsonb not null default '[]'::jsonb,
  default_timer_seconds integer not null default 300 check (default_timer_seconds >= 0),
  requires_host_confirmation boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facilitation_modes_active_key_idx
  on public.facilitation_modes (is_active, mode_key);

create table if not exists public.facilitator_mode_access (
  id bigserial primary key,
  facilitator_id integer not null references public.facilitators(id) on delete cascade,
  mode_id bigint not null references public.facilitation_modes(id) on delete cascade,
  enabled boolean not null default true,
  policy_override jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facilitator_mode_access_unique unique (facilitator_id, mode_id)
);

create index if not exists facilitator_mode_access_facilitator_idx
  on public.facilitator_mode_access (facilitator_id);

create index if not exists facilitator_mode_access_mode_idx
  on public.facilitator_mode_access (mode_id);

create table if not exists public.session_active_modes (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  mode_id bigint not null references public.facilitation_modes(id) on delete restrict,
  status text not null default 'active' check (status in ('recommended', 'pending_host_confirmation', 'active', 'ending', 'ended', 'rejected')),
  started_at timestamptz,
  ended_at timestamptz,
  timer_seconds integer not null default 300 check (timer_seconds >= 0),
  floor_rules jsonb not null default '{}'::jsonb,
  privacy_model text not null,
  composer_component text not null,
  composer_copy text not null,
  prompt text,
  state jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  started_by uuid,
  host_approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists session_active_modes_one_current_idx
  on public.session_active_modes (conversation_id)
  where status in ('recommended', 'pending_host_confirmation', 'active', 'ending');

create index if not exists session_active_modes_conversation_idx
  on public.session_active_modes (conversation_id, updated_at desc);

create table if not exists public.session_mode_events (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  active_mode_id bigint references public.session_active_modes(id) on delete set null,
  mode_id bigint references public.facilitation_modes(id) on delete set null,
  participant_id bigint references public.session_participants(id) on delete set null,
  event_type text not null check (event_type in (
    'mode.recommended',
    'mode.started',
    'participant.state.updated',
    'mode.input.submitted',
    'mode.synthesis.ready',
    'mode.ended',
    'mode.rejected'
  )),
  payload jsonb not null default '{}'::jsonb,
  reason text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  requires_confirmation boolean not null default false,
  trigger_signals jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists session_mode_events_conversation_idx
  on public.session_mode_events (conversation_id, created_at desc);

create index if not exists session_mode_events_type_idx
  on public.session_mode_events (event_type, created_at desc);

create table if not exists public.mode_participant_states (
  id bigserial primary key,
  active_mode_id bigint not null references public.session_active_modes(id) on delete cascade,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  participant_id bigint not null references public.session_participants(id) on delete cascade,
  can_speak boolean not null default true,
  is_current_speaker boolean not null default false,
  is_next boolean not null default false,
  can_submit boolean not null default true,
  remaining_time integer,
  allowed_actions jsonb not null default '[]'::jsonb,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint mode_participant_states_unique unique (active_mode_id, participant_id)
);

create index if not exists mode_participant_states_conversation_idx
  on public.mode_participant_states (conversation_id, updated_at desc);

create table if not exists public.mode_inputs (
  id bigserial primary key,
  active_mode_id bigint not null references public.session_active_modes(id) on delete cascade,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  mode_id bigint not null references public.facilitation_modes(id) on delete restrict,
  participant_id bigint references public.session_participants(id) on delete set null,
  input_type text not null,
  visibility text not null default 'private_until_synthesis' check (visibility in ('private', 'private_until_synthesis', 'anonymous_aggregate', 'attributed', 'public')),
  content jsonb not null default '{}'::jsonb,
  included_in_synthesis boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists mode_inputs_active_mode_idx
  on public.mode_inputs (active_mode_id, created_at desc);

create index if not exists mode_inputs_conversation_idx
  on public.mode_inputs (conversation_id, created_at desc);

alter table public.configurations
  add column if not exists mode_orchestrator_enabled boolean not null default true,
  add column if not exists mode_host_confirmation_required boolean not null default true,
  add column if not exists mode_default_timer_seconds integer not null default 300;

insert into public.facilitation_modes (
  mode_key,
  display_name,
  purpose,
  primary_input,
  composer_component,
  composer_copy,
  floor_rules,
  privacy_model,
  ai_responsibilities,
  entry_conditions,
  exit_conditions,
  candidate_transitions,
  success_metrics,
  default_timer_seconds,
  requires_host_confirmation,
  is_active
)
values
  (
    'open_discussion',
    'Open Discussion',
    'Allow natural group exchange while the AI monitors process quality.',
    'voice',
    'LiveListeningState',
    'You are live — speak freely. AI is listening.',
    '{"speaking":"participants_may_speak_freely","interruptions":"allowed_but_monitored","ai_floor_control":"low"}'::jsonb,
    'public_voice_transcript_with_session_retention_policy',
    '["track_speakers","track_topic_drift","detect_circular_debate","detect_exclusion_or_dominance","summarize_when_useful","intervene_only_when_process_quality_drops"]'::jsonb,
    '["session_opening","post_synthesis_discussion","host_command"]'::jsonb,
    '["timebox_expired","decision_ready","participation_imbalance","topic_drift","host_command"]'::jsonb,
    '["round_robin","silent_individual_response","voting_rating","reflection_checkin","debate_panel"]'::jsonb,
    '["balanced_participation","low_topic_drift","new_information_rate","decision_progress"]'::jsonb,
    0,
    false,
    true
  ),
  (
    'round_robin',
    'Round-Robin',
    'Guarantee equal airtime through structured turn-taking.',
    'voice',
    'TurnCountdownComposer',
    'Your turn is next / You are up.',
    '{"speaking":"only_current_speaker_has_floor","interruptions":"not_allowed_except_host_or_safety","ai_floor_control":"high"}'::jsonb,
    'public_voice_transcript_with_speaker_attribution',
    '["call_participants_in_sequence","enforce_time_windows","show_next_speaker","summarize_patterns_after_round","prevent_interruption"]'::jsonb,
    '["participation_imbalance","stakeholder_input_required","host_command"]'::jsonb,
    '["all_participants_spoken","host_command","timebox_expired"]'::jsonb,
    '["open_discussion","silent_individual_response","voting_rating"]'::jsonb,
    '["participation_coverage","time_per_speaker_variance","interruption_rate"]'::jsonb,
    300,
    true,
    true
  ),
  (
    'silent_individual_response',
    'Silent Individual Response',
    'Collect independent written thinking before social influence shapes answers.',
    'text',
    'PrivateTextComposer',
    'Write privately. The AI will synthesize responses for the group.',
    '{"speaking":"room_silent_or_optional_background_music","interruptions":"not_applicable","ai_floor_control":"medium"}'::jsonb,
    'private_until_synthesis_configurable_anonymity',
    '["pose_question","collect_private_responses","cluster_themes","preserve_anonymity_rules","surface_minority_views","read_back_synthesis"]'::jsonb,
    '["brainstorming","sensitive_feedback","dominant_voices","low_idea_diversity","host_command"]'::jsonb,
    '["timer_expired","all_responses_submitted","host_command"]'::jsonb,
    '["open_discussion","voting_rating","round_robin"]'::jsonb,
    '["response_completion_rate","idea_diversity","minority_view_capture","synthesis_acceptance"]'::jsonb,
    300,
    true,
    true
  ),
  (
    'voting_rating',
    'Voting / Rating',
    'Convert options, priorities, confidence, or sentiment into aggregate signal.',
    'tap_or_click',
    'VotingWidget',
    'Vote now. Your response will be aggregated according to session rules.',
    '{"speaking":"optional_host_or_ai_narration","interruptions":"not_applicable","ai_floor_control":"medium"}'::jsonb,
    'anonymous_or_attributed_aggregate_configurable',
    '["present_options","enforce_vote_limits","aggregate_results","show_or_hide_results_by_policy","narrate_implications","recommend_next_step"]'::jsonb,
    '["options_identified","decision_readiness","confidence_check_needed","prioritization_needed","host_command"]'::jsonb,
    '["vote_closed","quorum_reached","host_command","timer_expired"]'::jsonb,
    '["open_discussion","decision_capture","reflection_checkin"]'::jsonb,
    '["vote_completion_rate","decision_confidence","consensus_strength","time_to_decision"]'::jsonb,
    180,
    true,
    true
  ),
  (
    'reflection_checkin',
    'Reflection / Check-in',
    'Rapidly sense emotional temperature, readiness, confidence, or engagement.',
    'quick_pick_or_word',
    'QuickPickGrid',
    'Choose one word or quick signal that reflects where you are right now.',
    '{"speaking":"not_required","interruptions":"not_applicable","ai_floor_control":"low"}'::jsonb,
    'aggregate_by_default_individual_visibility_configurable',
    '["ask_low_stakes_prompt","aggregate_room_temperature","detect_risk_signals","adjust_pace_or_tone","recommend_follow_up_mode"]'::jsonb,
    '["session_opening","session_closing","energy_drop","conflict_recovery","before_major_decision","host_command"]'::jsonb,
    '["all_or_quorum_submitted","timer_expired","host_command"]'::jsonb,
    '["open_discussion","round_robin","human_controlled_mode"]'::jsonb,
    '["checkin_completion_rate","risk_signal_detection","participant_readiness","pace_adjustment_quality"]'::jsonb,
    120,
    true,
    true
  ),
  (
    'debate_panel',
    'Debate / Panel Moderation',
    'Structure expert exchange while preserving fairness, relevance, time discipline, and audience value.',
    'raise_hand_and_controlled_voice_floor',
    'RaiseHandQueue',
    'Raise your hand to request the floor.',
    '{"speaking":"only_called_speaker_has_floor","interruptions":"not_allowed_except_moderator_or_safety","ai_floor_control":"high"}'::jsonb,
    'public_voice_transcript_with_speaker_attribution',
    '["manage_speaker_queue","enforce_time_limits","ask_follow_up_questions","summarize_positions","connect_points_between_panelists","deescalate_repetition_or_conflict"]'::jsonb,
    '["expert_panel","structured_disagreement","q_and_a","host_command","debate_format_required"]'::jsonb,
    '["agenda_item_complete","timebox_expired","repetition_without_new_information","host_command"]'::jsonb,
    '["voting_rating","open_discussion","reflection_checkin","human_controlled_mode"]'::jsonb,
    '["queue_fairness","time_limit_adherence","audience_value","new_information_rate","repetition_rate"]'::jsonb,
    600,
    true,
    true
  )
on conflict (mode_key) do update set
  display_name = excluded.display_name,
  purpose = excluded.purpose,
  primary_input = excluded.primary_input,
  composer_component = excluded.composer_component,
  composer_copy = excluded.composer_copy,
  floor_rules = excluded.floor_rules,
  privacy_model = excluded.privacy_model,
  ai_responsibilities = excluded.ai_responsibilities,
  entry_conditions = excluded.entry_conditions,
  exit_conditions = excluded.exit_conditions,
  candidate_transitions = excluded.candidate_transitions,
  success_metrics = excluded.success_metrics,
  default_timer_seconds = excluded.default_timer_seconds,
  requires_host_confirmation = excluded.requires_host_confirmation,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.facilitator_mode_access (facilitator_id, mode_id, enabled, policy_override)
select f.id, m.id, true, '{}'::jsonb
from public.facilitators f
cross join public.facilitation_modes m
where m.mode_key in ('open_discussion', 'silent_individual_response', 'voting_rating', 'reflection_checkin')
on conflict (facilitator_id, mode_id) do nothing;

alter table public.facilitation_modes enable row level security;
alter table public.facilitator_mode_access enable row level security;
alter table public.session_active_modes enable row level security;
alter table public.session_mode_events enable row level security;
alter table public.mode_participant_states enable row level security;
alter table public.mode_inputs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitation_modes' and policyname = 'Anyone can read active facilitation modes'
  ) then
    create policy "Anyone can read active facilitation modes"
      on public.facilitation_modes for select
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitation_modes' and policyname = 'Admins can manage facilitation modes'
  ) then
    create policy "Admins can manage facilitation modes"
      on public.facilitation_modes for all
      using ((auth.jwt() ->> 'role') = 'admin')
      with check ((auth.jwt() ->> 'role') = 'admin');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_mode_access' and policyname = 'Anyone can read facilitator mode access'
  ) then
    create policy "Anyone can read facilitator mode access"
      on public.facilitator_mode_access for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_mode_access' and policyname = 'Admins can manage facilitator mode access'
  ) then
    create policy "Admins can manage facilitator mode access"
      on public.facilitator_mode_access for all
      using ((auth.jwt() ->> 'role') = 'admin')
      with check ((auth.jwt() ->> 'role') = 'admin');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_active_modes' and policyname = 'Authenticated users can read session active modes'
  ) then
    create policy "Authenticated users can read session active modes"
      on public.session_active_modes for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_active_modes' and policyname = 'Authenticated users can write session active modes'
  ) then
    create policy "Authenticated users can write session active modes"
      on public.session_active_modes for all
      using (auth.uid() is not null)
      with check (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_mode_events' and policyname = 'Authenticated users can read session mode events'
  ) then
    create policy "Authenticated users can read session mode events"
      on public.session_mode_events for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_mode_events' and policyname = 'Authenticated users can write session mode events'
  ) then
    create policy "Authenticated users can write session mode events"
      on public.session_mode_events for all
      using (auth.uid() is not null)
      with check (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mode_participant_states' and policyname = 'Authenticated users can manage mode participant states'
  ) then
    create policy "Authenticated users can manage mode participant states"
      on public.mode_participant_states for all
      using (auth.uid() is not null)
      with check (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'mode_inputs' and policyname = 'Authenticated users can manage mode inputs'
  ) then
    create policy "Authenticated users can manage mode inputs"
      on public.mode_inputs for all
      using (auth.uid() is not null)
      with check (auth.uid() is not null);
  end if;
end $$;
