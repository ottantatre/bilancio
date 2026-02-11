-- ============================================================
-- Budget App — Initial Schema
-- ============================================================

-- Enums
create type direction as enum ('IN', 'OUT');

create type document_kind as enum (
  'ar_invoice',
  'ap_invoice',
  'tax',
  'standing_order',
  'lease_instalment',
  'loan_instalment',
  'other'
);

create type document_status as enum (
  'planned',
  'issued',
  'partial',
  'paid',
  'overdue',
  'cancelled'
);

create type payment_method as enum (
  'transfer',
  'cash',
  'card',
  'other'
);

-- ============================================================
-- Documents
-- ============================================================
create table documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          document_kind not null,
  direction     direction not null,
  status        document_status not null default 'planned',
  number        text,
  title         text not null,
  counterparty  text,
  issue_date    date,
  due_date      date not null,
  amount_net    numeric(12,2),
  amount_gross  numeric(12,2) not null,
  currency      text not null default 'PLN',
  notes         text,
  recurring_rule_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- Document Lines
-- ============================================================
create table document_lines (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  description   text not null,
  qty           numeric(10,3) not null default 1,
  unit_price    numeric(12,2) not null,
  vat_rate      numeric(5,2) not null default 23,
  amount_net    numeric(12,2) not null,
  amount_gross  numeric(12,2) not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Payments
-- ============================================================
create table payments (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  paid_date     date not null,
  amount        numeric(12,2) not null,
  method        payment_method not null default 'transfer',
  note          text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Recurring Rules
-- ============================================================
create table recurring_rules (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            document_kind not null,
  direction       direction not null,
  title           text not null,
  amount          numeric(12,2) not null,
  currency        text not null default 'PLN',
  day_of_month    int not null default 1,
  interval_months int not null default 1,
  start_date      date not null,
  end_date        date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- FK from documents to recurring_rules
alter table documents
  add constraint fk_documents_recurring_rule
  foreign key (recurring_rule_id) references recurring_rules(id)
  on delete set null;

-- ============================================================
-- Cashflow View
-- ============================================================
create or replace view cashflow_view as
  select
    d.id as document_id,
    d.user_id,
    d.due_date as event_date,
    d.title,
    d.direction,
    d.kind,
    d.status,
    d.amount_gross as amount,
    coalesce(sum(p.amount), 0) as paid_amount,
    d.amount_gross - coalesce(sum(p.amount), 0) as remaining,
    d.currency
  from documents d
  left join payments p on p.document_id = d.id
  where d.status not in ('cancelled')
  group by d.id;

-- ============================================================
-- Indexes
-- ============================================================
create index idx_documents_user_id on documents(user_id);
create index idx_documents_due_date on documents(due_date);
create index idx_documents_status on documents(status);
create index idx_payments_document_id on payments(document_id);
create index idx_recurring_rules_user_id on recurring_rules(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================
alter table documents enable row level security;
alter table document_lines enable row level security;
alter table payments enable row level security;
alter table recurring_rules enable row level security;

-- Documents: user can only access their own
create policy "Users can view own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on documents for delete
  using (auth.uid() = user_id);

-- Document Lines: access via parent document ownership
create policy "Users can view own document lines"
  on document_lines for select
  using (exists (
    select 1 from documents where documents.id = document_lines.document_id and documents.user_id = auth.uid()
  ));

create policy "Users can insert own document lines"
  on document_lines for insert
  with check (exists (
    select 1 from documents where documents.id = document_lines.document_id and documents.user_id = auth.uid()
  ));

create policy "Users can update own document lines"
  on document_lines for update
  using (exists (
    select 1 from documents where documents.id = document_lines.document_id and documents.user_id = auth.uid()
  ));

create policy "Users can delete own document lines"
  on document_lines for delete
  using (exists (
    select 1 from documents where documents.id = document_lines.document_id and documents.user_id = auth.uid()
  ));

-- Payments: access via parent document ownership
create policy "Users can view own payments"
  on payments for select
  using (exists (
    select 1 from documents where documents.id = payments.document_id and documents.user_id = auth.uid()
  ));

create policy "Users can insert own payments"
  on payments for insert
  with check (exists (
    select 1 from documents where documents.id = payments.document_id and documents.user_id = auth.uid()
  ));

create policy "Users can update own payments"
  on payments for update
  using (exists (
    select 1 from documents where documents.id = payments.document_id and documents.user_id = auth.uid()
  ));

create policy "Users can delete own payments"
  on payments for delete
  using (exists (
    select 1 from documents where documents.id = payments.document_id and documents.user_id = auth.uid()
  ));

-- Recurring Rules: user can only access their own
create policy "Users can view own recurring rules"
  on recurring_rules for select
  using (auth.uid() = user_id);

create policy "Users can insert own recurring rules"
  on recurring_rules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recurring rules"
  on recurring_rules for update
  using (auth.uid() = user_id);

create policy "Users can delete own recurring rules"
  on recurring_rules for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Updated_at trigger
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_documents_updated_at
  before update on documents
  for each row execute function update_updated_at();

create trigger trg_recurring_rules_updated_at
  before update on recurring_rules
  for each row execute function update_updated_at();
