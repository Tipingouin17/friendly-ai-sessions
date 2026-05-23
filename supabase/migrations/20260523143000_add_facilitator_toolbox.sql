-- 2026-05-23: Database-backed facilitator toolbox and mode access matrix.
--
-- This migration introduces an extensible catalogue of facilitation tools/modes and
-- a facilitator-to-tool assignment table. It deliberately avoids hard-coded mode
-- lists in the application layer so administrators can add or retire tools later.

create table if not exists public.facilitator_tools (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  description text,
  category text not null default 'facilitation',
  config jsonb not null default '{}'::jsonb,
  token_cost_per_use integer not null default 0 check (token_cost_per_use >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facilitator_tools_category_idx
  on public.facilitator_tools (category);

create index if not exists facilitator_tools_active_slug_idx
  on public.facilitator_tools (is_active, slug);

create table if not exists public.facilitator_tool_access (
  id bigserial primary key,
  facilitator_id integer not null references public.facilitators(id) on delete cascade,
  tool_id bigint not null references public.facilitator_tools(id) on delete cascade,
  enabled boolean not null default true,
  config_override jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facilitator_tool_access_unique unique (facilitator_id, tool_id)
);

create index if not exists facilitator_tool_access_facilitator_idx
  on public.facilitator_tool_access (facilitator_id);

create index if not exists facilitator_tool_access_tool_idx
  on public.facilitator_tool_access (tool_id);

alter table public.configurations
  add column if not exists toolbox_token_accounting_enabled boolean not null default true,
  add column if not exists toolbox_default_token_budget integer not null default 6000,
  add column if not exists toolbox_overage_policy text not null default 'warn';

insert into public.facilitator_tools (name, slug, description, category, config, token_cost_per_use, is_active)
values
  (
    'Open Discussion',
    'open_discussion',
    'Keeps a lightweight conversational flow while nudging the group toward balanced participation and clear next steps.',
    'discussion',
    '{"composerLabel":"Open response","hostCue":"Invite perspectives and let the conversation breathe.","participantPrompt":"Share your perspective in your own words.","runtimeBehavior":"balanced_moderator","visualAccent":"indigo","supportsAnonymousInput":false,"supportsVoting":false}'::jsonb,
    120,
    true
  ),
  (
    'Structured Round',
    'structured_round',
    'Guides participants through an ordered round so every voice is invited before synthesis begins.',
    'participation',
    '{"composerLabel":"Round response","hostCue":"Move participant by participant and protect airtime equity.","participantPrompt":"Contribute your turn for this round.","runtimeBehavior":"active_coach","visualAccent":"purple","supportsAnonymousInput":false,"supportsVoting":false}'::jsonb,
    180,
    true
  ),
  (
    'Brainstorm',
    'brainstorm',
    'Encourages high-volume idea generation, clusters emerging themes, and delays evaluation until the group is ready.',
    'ideation',
    '{"composerLabel":"Add an idea","hostCue":"Generate options first, evaluate later.","participantPrompt":"Add one idea, possibility, or experiment.","runtimeBehavior":"energetic_ideation","visualAccent":"blue","supportsAnonymousInput":true,"supportsVoting":false}'::jsonb,
    220,
    true
  ),
  (
    'Consensus Check',
    'consensus_check',
    'Tests alignment with lightweight temperature checks and highlights unresolved objections before commitment.',
    'decision',
    '{"composerLabel":"Share agreement level","hostCue":"Check alignment and surface objections before deciding.","participantPrompt":"State your level of agreement and any important concern.","runtimeBehavior":"decision_readiness","visualAccent":"emerald","supportsAnonymousInput":false,"supportsVoting":true}'::jsonb,
    200,
    true
  ),
  (
    'Silent Reflection',
    'silent_reflection',
    'Creates reflective space before discussion, helping participants compose thoughtful responses without immediate social pressure.',
    'reflection',
    '{"composerLabel":"Private reflection","hostCue":"Give participants quiet thinking time before sharing.","participantPrompt":"Write your reflection; the facilitator will help summarize patterns.","runtimeBehavior":"calm_reflection","visualAccent":"slate","supportsAnonymousInput":true,"supportsVoting":false}'::jsonb,
    100,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  config = excluded.config,
  token_cost_per_use = excluded.token_cost_per_use,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.facilitator_tool_access (facilitator_id, tool_id, enabled, config_override)
select f.id, t.id, true, '{}'::jsonb
from public.facilitators f
cross join public.facilitator_tools t
where t.slug in ('open_discussion', 'structured_round', 'brainstorm', 'consensus_check', 'silent_reflection')
on conflict (facilitator_id, tool_id) do nothing;

alter table public.facilitator_tools enable row level security;
alter table public.facilitator_tool_access enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_tools' and policyname = 'Anyone can read active facilitator tools'
  ) then
    create policy "Anyone can read active facilitator tools"
      on public.facilitator_tools for select
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_tools' and policyname = 'Admins can manage facilitator tools'
  ) then
    create policy "Admins can manage facilitator tools"
      on public.facilitator_tools for all
      using ((auth.jwt() ->> 'role') = 'admin')
      with check ((auth.jwt() ->> 'role') = 'admin');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_tool_access' and policyname = 'Anyone can read facilitator tool access'
  ) then
    create policy "Anyone can read facilitator tool access"
      on public.facilitator_tool_access for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'facilitator_tool_access' and policyname = 'Admins can manage facilitator tool access'
  ) then
    create policy "Admins can manage facilitator tool access"
      on public.facilitator_tool_access for all
      using ((auth.jwt() ->> 'role') = 'admin')
      with check ((auth.jwt() ->> 'role') = 'admin');
  end if;
end $$;
