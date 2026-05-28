-- Streaming AI facilitator foundation
--
-- This migration is additive and safe for the dev branch first. It introduces a
-- provider-neutral behavior and runtime-event layer for an alive-feeling avatar
-- facilitator without changing existing session/message flows.

create table if not exists public.facilitator_behavior_profiles (
  id bigserial primary key,
  facilitator_id bigint references public.facilitators(id) on delete cascade,
  scope text not null default 'global' check (scope in ('global', 'facilitator', 'session')),
  scope_id bigint,
  behavior_profile jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facilitator_behavior_profiles_scope_consistency check (
    (scope = 'global' and scope_id is null and facilitator_id is null)
    or (scope = 'facilitator' and scope_id is not null)
    or (scope = 'session' and scope_id is not null)
  )
);

create unique index if not exists facilitator_behavior_profiles_one_default_per_scope
  on public.facilitator_behavior_profiles (scope, coalesce(scope_id, 0))
  where is_default = true;

create index if not exists facilitator_behavior_profiles_facilitator_idx
  on public.facilitator_behavior_profiles (facilitator_id);

create table if not exists public.facilitator_runtime_events (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  facilitator_id bigint references public.facilitators(id) on delete set null,
  participant_id bigint references public.participants(id) on delete set null,
  event_type text not null,
  sequence integer,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists facilitator_runtime_events_conversation_created_idx
  on public.facilitator_runtime_events (conversation_id, created_at desc);

create index if not exists facilitator_runtime_events_type_idx
  on public.facilitator_runtime_events (event_type);

create table if not exists public.facilitator_meeting_snapshots (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  facilitator_id bigint references public.facilitators(id) on delete set null,
  snapshot jsonb not null,
  memory_patch jsonb,
  last_sequence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists facilitator_meeting_snapshots_conversation_unique
  on public.facilitator_meeting_snapshots (conversation_id);

-- Default global behavior. Facilitator-specific and session-specific profiles can
-- override it later through admin surfaces without requiring schema changes.
insert into public.facilitator_behavior_profiles (scope, scope_id, facilitator_id, behavior_profile, is_default)
values (
  'global',
  null,
  null,
  '{
    "version": 1,
    "label": "Balanced stream-aware facilitator",
    "tone": "warm",
    "energy": "balanced",
    "directness": "balanced",
    "interventionStyle": "balanced_moderator",
    "speechConfidenceThreshold": 0.72,
    "turnCompletionSilenceMs": 1200,
    "maxUncompressedTurnChars": 1600,
    "monitoredSignals": ["topic_drift", "dominance", "silence", "confusion", "conflict", "decision_readiness", "repetition"],
    "avatar": {
      "idleMotionIntensity": "subtle",
      "listeningCueFrequency": "medium",
      "thinkingCueDelayMs": 650,
      "speakingGestureIntensity": "moderate",
      "allowInterruptionCues": false
    }
  }'::jsonb,
  true
)
on conflict do nothing;

alter table public.facilitator_behavior_profiles enable row level security;
alter table public.facilitator_runtime_events enable row level security;
alter table public.facilitator_meeting_snapshots enable row level security;

-- Development-safe baseline policies. They keep read access aligned with the
-- existing app's authenticated/admin flows and avoid exposing runtime data to
-- anonymous users unless backend policies are later tightened around join tokens.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_behavior_profiles' and policyname = 'Authenticated users can read facilitator behavior profiles'
  ) then
    create policy "Authenticated users can read facilitator behavior profiles"
      on public.facilitator_behavior_profiles for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_runtime_events' and policyname = 'Authenticated users can read facilitator runtime events'
  ) then
    create policy "Authenticated users can read facilitator runtime events"
      on public.facilitator_runtime_events for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_meeting_snapshots' and policyname = 'Authenticated users can read facilitator meeting snapshots'
  ) then
    create policy "Authenticated users can read facilitator meeting snapshots"
      on public.facilitator_meeting_snapshots for select
      to authenticated
      using (true);
  end if;
end $$;
