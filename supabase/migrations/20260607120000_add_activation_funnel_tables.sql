-- Activation funnel analytics and user state
--
-- Adds first-party activation instrumentation tables. These tables are intentionally
-- provider-neutral and consent-aware so activation progress can be measured even
-- when third-party analytics are blocked, while still respecting user consent.

create table if not exists public.activation_events (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  anonymous_id text,
  activation_session_id text,
  event_name text not null check (event_name in (
    'activation_landing_view',
    'activation_signup_started',
    'activation_signup_submitted',
    'activation_signup_completed',
    'activation_home_viewed',
    'activation_demo_started',
    'activation_demo_completed',
    'activation_first_session_started',
    'activation_first_session_created',
    'activation_feedback_submitted'
  )),
  activation_step text,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  gbraid text,
  wbraid text,
  msclkid text,
  fbclid text,
  consent_analytics boolean,
  consent_advertising boolean,
  event_properties jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists activation_events_user_time_idx
  on public.activation_events (user_id, occurred_at desc);

create index if not exists activation_events_anonymous_idx
  on public.activation_events (anonymous_id, occurred_at desc);

create index if not exists activation_events_session_idx
  on public.activation_events (activation_session_id, occurred_at desc);

create index if not exists activation_events_name_time_idx
  on public.activation_events (event_name, occurred_at desc);

create index if not exists activation_events_campaign_idx
  on public.activation_events (utm_source, utm_medium, utm_campaign);

create index if not exists activation_events_click_id_idx
  on public.activation_events (gclid, msclkid);

create table if not exists public.activation_user_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  activation_status text not null default 'not_started' check (activation_status in ('not_started', 'started', 'demo_started', 'first_session_created', 'activated')),
  first_activation_event_at timestamptz,
  signup_completed_at timestamptz,
  activation_home_viewed_at timestamptz,
  demo_started_at timestamptz,
  demo_completed_at timestamptz,
  first_session_created_at timestamptz,
  activated_at timestamptz,
  last_event_name text,
  activation_session_id text,
  anonymous_id text,
  first_session_id bigint,
  activation_score integer not null default 0 check (activation_score >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activation_user_state_status_idx
  on public.activation_user_state (activation_status, updated_at desc);

create index if not exists activation_user_state_session_idx
  on public.activation_user_state (activation_session_id);

alter table public.activation_events enable row level security;
alter table public.activation_user_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activation_events' and policyname = 'Authenticated users can write own activation events'
  ) then
    create policy "Authenticated users can write own activation events"
      on public.activation_events for insert
      to authenticated
      with check (user_id is null or auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activation_events' and policyname = 'Authenticated users can read own activation events'
  ) then
    create policy "Authenticated users can read own activation events"
      on public.activation_events for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activation_user_state' and policyname = 'Authenticated users can read own activation state'
  ) then
    create policy "Authenticated users can read own activation state"
      on public.activation_user_state for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activation_user_state' and policyname = 'Authenticated users can update own activation state'
  ) then
    create policy "Authenticated users can update own activation state"
      on public.activation_user_state for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
