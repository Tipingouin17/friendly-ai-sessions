-- Phase 3: speech stack, avatar/TTS runtime events, and deeper facilitation analytics
--
-- This migration is additive and development-safe. It preserves the existing
-- message/session flows while adding provider-neutral persistence for browser
-- speech recognition, avatar/TTS state, and analytics snapshots.

create table if not exists public.session_speech_turns (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  facilitator_id bigint references public.facilitators(id) on delete set null,
  participant_id bigint references public.session_participants(id) on delete set null,
  speaker_role text not null default 'participant' check (speaker_role in ('participant', 'facilitator', 'host', 'system')),
  transcript text not null,
  confidence numeric(5,4),
  language text not null default 'en-US',
  is_final boolean not null default true,
  source text not null default 'browser_speech_recognition' check (source in ('browser_speech_recognition', 'manual', 'tts_loopback', 'imported')),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists session_speech_turns_conversation_created_idx
  on public.session_speech_turns (conversation_id, created_at desc);

create index if not exists session_speech_turns_participant_idx
  on public.session_speech_turns (participant_id, created_at desc);

create table if not exists public.facilitator_tts_events (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  facilitator_id bigint references public.facilitators(id) on delete set null,
  message_id text,
  provider text not null default 'browser_speech_synthesis',
  voice_id text,
  text_excerpt text,
  status text not null default 'queued' check (status in ('queued', 'speaking', 'completed', 'cancelled', 'failed')),
  avatar_state text not null default 'speaking',
  audio_duration_ms integer check (audio_duration_ms is null or audio_duration_ms >= 0),
  lip_sync_markers jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists facilitator_tts_events_conversation_created_idx
  on public.facilitator_tts_events (conversation_id, created_at desc);

create index if not exists facilitator_tts_events_status_idx
  on public.facilitator_tts_events (status, created_at desc);

create table if not exists public.session_facilitation_analytics (
  id bigserial primary key,
  conversation_id bigint not null unique references public.conversations(id) on delete cascade,
  facilitator_id bigint references public.facilitators(id) on delete set null,
  analytics_version text not null default 'phase3.v1',
  speech_turn_count integer not null default 0 check (speech_turn_count >= 0),
  tts_event_count integer not null default 0 check (tts_event_count >= 0),
  participant_balance numeric(5,4),
  participation_coverage numeric(5,4),
  topic_drift_score numeric(5,4),
  facilitation_health_score numeric(5,4),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_facilitation_analytics_facilitator_idx
  on public.session_facilitation_analytics (facilitator_id);

create index if not exists session_facilitation_analytics_health_idx
  on public.session_facilitation_analytics (facilitation_health_score desc nulls last);

alter table public.configurations
  add column if not exists speech_stack_enabled boolean not null default true,
  add column if not exists speech_default_language text not null default 'en-US',
  add column if not exists tts_avatar_enabled boolean not null default true,
  add column if not exists tts_default_voice_id text,
  add column if not exists tts_lip_sync_enabled boolean not null default true,
  add column if not exists facilitation_analytics_enabled boolean not null default true;

alter table public.session_speech_turns enable row level security;
alter table public.facilitator_tts_events enable row level security;
alter table public.session_facilitation_analytics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_speech_turns' and policyname = 'Authenticated users can read session speech turns'
  ) then
    create policy "Authenticated users can read session speech turns"
      on public.session_speech_turns for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_speech_turns' and policyname = 'Authenticated users can write session speech turns'
  ) then
    create policy "Authenticated users can write session speech turns"
      on public.session_speech_turns for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_tts_events' and policyname = 'Authenticated users can read facilitator TTS events'
  ) then
    create policy "Authenticated users can read facilitator TTS events"
      on public.facilitator_tts_events for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_tts_events' and policyname = 'Authenticated users can write facilitator TTS events'
  ) then
    create policy "Authenticated users can write facilitator TTS events"
      on public.facilitator_tts_events for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_facilitation_analytics' and policyname = 'Authenticated users can read session facilitation analytics'
  ) then
    create policy "Authenticated users can read session facilitation analytics"
      on public.session_facilitation_analytics for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_facilitation_analytics' and policyname = 'Authenticated users can manage session facilitation analytics'
  ) then
    create policy "Authenticated users can manage session facilitation analytics"
      on public.session_facilitation_analytics for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
