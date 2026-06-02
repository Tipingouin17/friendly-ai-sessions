-- Marketing analytics reconciliation storage
--
-- Adds provider-neutral tables used by the admin Marketing Analytics dashboard.
-- The application works safely without these tables, but once migrated they allow
-- durable first-touch attribution, API sync health, and daily channel snapshots.

create table if not exists public.marketing_user_attribution (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null default 'signup' check (event_type in ('visit', 'signup', 'checkout', 'purchase', 'lead')),
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
  landing_page text,
  current_page text,
  referrer text,
  consent_analytics boolean,
  consent_advertising boolean,
  raw_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists marketing_user_attribution_user_idx
  on public.marketing_user_attribution (user_id, occurred_at desc);

create index if not exists marketing_user_attribution_campaign_idx
  on public.marketing_user_attribution (utm_source, utm_medium, utm_campaign);

create index if not exists marketing_user_attribution_click_id_idx
  on public.marketing_user_attribution (gclid, msclkid);

create table if not exists public.marketing_daily_snapshots (
  id bigserial primary key,
  date date not null,
  channel text not null check (channel in ('google_ads', 'microsoft_ads', 'ga4', 'organic', 'direct', 'referral', 'email', 'unknown')),
  account_id text,
  campaign_id text,
  campaign_name text,
  spend_eur numeric(12,2) not null default 0 check (spend_eur >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  sessions integer not null default 0 check (sessions >= 0),
  platform_conversions numeric(12,4) not null default 0 check (platform_conversions >= 0),
  backend_signups integer not null default 0 check (backend_signups >= 0),
  backend_purchases integer not null default 0 check (backend_purchases >= 0),
  revenue_eur numeric(12,2) not null default 0 check (revenue_eur >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, channel, account_id, campaign_id)
);

create index if not exists marketing_daily_snapshots_date_channel_idx
  on public.marketing_daily_snapshots (date desc, channel);

create index if not exists marketing_daily_snapshots_campaign_idx
  on public.marketing_daily_snapshots (campaign_id, date desc);

create table if not exists public.marketing_api_sync_log (
  id bigserial primary key,
  source text not null check (source in ('google_ads', 'microsoft_ads', 'ga4')),
  status text not null default 'started' check (status in ('started', 'success', 'partial', 'failed', 'not_configured')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_imported integer not null default 0 check (rows_imported >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists marketing_api_sync_log_source_started_idx
  on public.marketing_api_sync_log (source, started_at desc);

alter table public.marketing_user_attribution enable row level security;
alter table public.marketing_daily_snapshots enable row level security;
alter table public.marketing_api_sync_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'marketing_user_attribution' and policyname = 'Authenticated users can write own marketing attribution'
  ) then
    create policy "Authenticated users can write own marketing attribution"
      on public.marketing_user_attribution for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'marketing_user_attribution' and policyname = 'Authenticated users can read own marketing attribution'
  ) then
    create policy "Authenticated users can read own marketing attribution"
      on public.marketing_user_attribution for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'marketing_daily_snapshots' and policyname = 'Authenticated users can read marketing snapshots'
  ) then
    create policy "Authenticated users can read marketing snapshots"
      on public.marketing_daily_snapshots for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'marketing_api_sync_log' and policyname = 'Authenticated users can read marketing sync log'
  ) then
    create policy "Authenticated users can read marketing sync log"
      on public.marketing_api_sync_log for select
      to authenticated
      using (true);
  end if;
end $$;
