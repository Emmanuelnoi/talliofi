-- Talliofi: Initial Postgres schema with Row-Level Security
-- All financial data is scoped to the authenticated user via auth.uid().

-- ============================================================
-- Extension
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- Plans
-- ============================================================
create table if not exists plans (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 100),
  gross_income_cents bigint not null check (gross_income_cents >= 0),
  income_frequency text not null check (income_frequency in (
    'weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual'
  )),
  tax_mode         text not null check (tax_mode in ('simple', 'itemized')),
  tax_effective_rate numeric(5,2) check (tax_effective_rate between 0 and 100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  version          integer not null default 0
);

create index idx_plans_user_id on plans(user_id);
create index idx_plans_created_at on plans(created_at);

alter table plans enable row level security;

create policy "Users can manage own plans"
  on plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Buckets
-- ============================================================
create table if not exists buckets (
  id                   uuid primary key default uuid_generate_v4(),
  plan_id              uuid not null references plans(id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 50),
  color                text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  mode                 text not null check (mode in ('percentage', 'fixed')),
  target_percentage    numeric(5,2) check (target_percentage between 0 and 100),
  target_amount_cents  bigint check (target_amount_cents >= 0),
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now()
);

create index idx_buckets_plan_id on buckets(plan_id);

alter table buckets enable row level security;

create policy "Users can manage own buckets"
  on buckets for all
  using (plan_id in (select id from plans where user_id = auth.uid()))
  with check (plan_id in (select id from plans where user_id = auth.uid()));

-- ============================================================
-- Tax Components
-- ============================================================
create table if not exists tax_components (
  id           uuid primary key default uuid_generate_v4(),
  plan_id      uuid not null references plans(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 50),
  rate_percent numeric(5,2) not null check (rate_percent between 0 and 100),
  sort_order   integer not null default 0
);

create index idx_tax_components_plan_id on tax_components(plan_id);

alter table tax_components enable row level security;

create policy "Users can manage own tax components"
  on tax_components for all
  using (plan_id in (select id from plans where user_id = auth.uid()))
  with check (plan_id in (select id from plans where user_id = auth.uid()));

-- ============================================================
-- Expenses
-- ============================================================
create table if not exists expenses (
  id           uuid primary key default uuid_generate_v4(),
  plan_id      uuid not null references plans(id) on delete cascade,
  bucket_id    text not null default '', -- uuid or empty string for unassigned
  name         text not null check (char_length(name) between 1 and 100),
  amount_cents bigint not null check (amount_cents >= 0),
  frequency    text not null check (frequency in (
    'weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual'
  )),
  category     text not null check (category in (
    'housing', 'utilities', 'transportation', 'groceries', 'healthcare',
    'insurance', 'debt_payment', 'savings', 'entertainment', 'dining',
    'personal', 'subscriptions', 'other'
  )),
  is_fixed     boolean not null default false,
  notes        text check (char_length(notes) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_expenses_plan_id on expenses(plan_id);
create index idx_expenses_bucket_id on expenses(bucket_id);
create index idx_expenses_category on expenses(category);

alter table expenses enable row level security;

create policy "Users can manage own expenses"
  on expenses for all
  using (plan_id in (select id from plans where user_id = auth.uid()))
  with check (plan_id in (select id from plans where user_id = auth.uid()));

-- ============================================================
-- Snapshots
-- ============================================================
create table if not exists snapshots (
  id                  uuid primary key default uuid_generate_v4(),
  plan_id             uuid not null references plans(id) on delete cascade,
  year_month          text not null check (year_month ~ '^\d{4}-\d{2}$'),
  gross_income_cents  bigint not null,
  net_income_cents    bigint not null,
  total_expenses_cents bigint not null,
  bucket_summaries    jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),

  unique (plan_id, year_month)
);

create index idx_snapshots_plan_id on snapshots(plan_id);
create index idx_snapshots_year_month on snapshots(year_month);

alter table snapshots enable row level security;

create policy "Users can manage own snapshots"
  on snapshots for all
  using (plan_id in (select id from plans where user_id = auth.uid()))
  with check (plan_id in (select id from plans where user_id = auth.uid()));

-- ============================================================
-- Changelog (for sync)
-- ============================================================
create table if not exists changelog (
  id          uuid primary key default uuid_generate_v4(),
  plan_id     uuid not null references plans(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'plan', 'expense', 'bucket', 'tax_component', 'snapshot'
  )),
  entity_id   text not null,
  operation   text not null check (operation in ('create', 'update', 'delete')),
  timestamp   timestamptz not null default now(),
  payload     jsonb
);

create index idx_changelog_plan_id on changelog(plan_id);
create index idx_changelog_timestamp on changelog(timestamp);

alter table changelog enable row level security;

create policy "Users can manage own changelog entries"
  on changelog for all
  using (plan_id in (select id from plans where user_id = auth.uid()))
  with check (plan_id in (select id from plans where user_id = auth.uid()));

-- ============================================================
-- Updated-at trigger
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_plans_updated_at
  before update on plans
  for each row execute function update_updated_at();

create trigger trg_expenses_updated_at
  before update on expenses
  for each row execute function update_updated_at();
