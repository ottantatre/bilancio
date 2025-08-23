# Budget — MVP (React + Supabase)

## Cel

Prosty system planowania przepływów pieniężnych (cashflow) dla firmy:

- faktury sprzedażowe i zakupowe (zapłacone / częściowo / przeterminowane / planowane),
- zlecenia stałe (cykliczne, miesięczne),
- leasingi / kredyty (harmonogramy),
- podatki i inne daniny jako „pseudodokumenty”,
- jedna zunifikowana lista zdarzeń cashflow (co, kiedy, ile, kierunek IN/OUT, status).

> **Założenia**: multi‑tenant (wielu użytkowników/organizacji), prosty model VAT (stawki na poziomie pozycji), waluty (domyślnie PLN), brak integracji bankowej w R0.

---

## Model danych (RD1)

### Enumy

```sql
-- Kierunek przepływu: wpływ / wypływ
create type direction as enum ('IN', 'OUT');

-- Typ dokumentu (uogólniony)
create type document_kind as enum (
  'ar_invoice',       -- faktura sprzedaży (Accounts Receivable)
  'ap_invoice',       -- faktura zakupu (Accounts Payable)
  'tax',              -- podatek / danina (pseudodokument)
  'standing_order',   -- zlecenie stałe (pseudodokument / generowane)
  'lease_instalment', -- rata leasingu (może pochodzić z harmonogramu)
  'loan_instalment',  -- rata kredytu
  'other'
);

-- Status dokumentu
create type document_status as enum ('planned','issued','partial','paid','overdue','cancelled');
```

### Tabele bazowe

```sql
-- Organizacje (tenant)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profile użytkowników (mapowanie na auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_org_id uuid references public.organizations(id),
  created_at timestamptz not null default now()
);

-- Członkostwa userów w organizacjach
create table public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  primary key (org_id, user_id)
);

-- Kontrahenci
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  tax_id text,
  email text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rachunki (kasa/bank)
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank','cash','virtual')),
  currency text not null default 'PLN',
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dokumenty (uogólnione)
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind document_kind not null,
  direction direction not null,
  status document_status not null default 'issued',
  source text not null default 'manual', -- manual/recurring/tax/schedule/import
  number text,               -- numer faktury lub referencja
  title text,                -- opis
  counterparty_id uuid references public.partners(id),
  issue_date date not null default current_date,
  due_date date not null,
  currency text not null default 'PLN',
  amount_net numeric(14,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  amount_gross numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  paid_date date,
  is_planned boolean not null default false, -- "pseudodokumenty"
  recurring_rule_id uuid, -- jeśli powstał z reguły cyklicznej
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (direction = 'IN'  and kind in ('ar_invoice','tax','standing_order','other')) or
    (direction = 'OUT' and kind in ('ap_invoice','tax','standing_order','lease_instalment','loan_instalment','other'))
  ),
  check (amount_net + vat_amount = amount_gross)
);

-- Pozycje dokumentu (dla VAT)
create table public.document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  label text not null,
  quantity numeric(12,4) not null default 1,
  unit_price numeric(14,4) not null default 0,
  vat_rate numeric(5,2) not null default 0, -- np. 0, 5, 8, 23
  amount_net numeric(14,2) not null,
  vat_amount numeric(14,2) not null,
  amount_gross numeric(14,2) not null
);

-- Płatności (mogą być częściowe)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  document_id uuid references public.documents(id) on delete set null,
  posted_at date not null,
  currency text not null default 'PLN',
  amount numeric(14,2) not null,
  note text,
  created_at timestamptz not null default now()
);

-- Reguły cykliczne (zlecenia stałe / miesięczne faktury)
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  direction direction not null,
  kind document_kind not null default 'standing_order',
  counterparty_id uuid references public.partners(id),
  day_of_month int not null default 1, -- np. 1 = 1. dzień miesiąca
  month_interval int not null default 1, -- co ile miesięcy
  start_date date not null default current_date,
  end_date date,
  amount_gross numeric(14,2) not null,
  currency text not null default 'PLN',
  auto_materialize boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Harmonogramy (leasing/kredyt) — zdarzenia zdefiniowane z góry
create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind document_kind not null check (kind in ('lease_instalment','loan_instalment')),
  label text,
  counterparty_id uuid references public.partners(id),
  due_date date not null,
  amount_gross numeric(14,2) not null,
  currency text not null default 'PLN',
  created_at timestamptz not null default now()
);

-- Konfiguracja podatków (uproszczona, per organizacja)
create table public.tax_configs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,          -- np. 'VAT', 'ZUS', 'CIT/PIT'
  frequency text not null check (frequency in ('monthly','quarterly')),
  due_day int not null default 25, -- dzień miesiąca rozliczenia
  active boolean not null default true
);
```

### Triggery i funkcje pomocnicze

```sql
-- aktualizacja updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger partners_touch_updated
before update on public.partners
for each row execute function public.set_updated_at();

create trigger accounts_touch_updated
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger recurring_rules_touch_updated
before update on public.recurring_rules
for each row execute function public.set_updated_at();

-- Po wstawieniu płatności aktualizujemy dokument
create or replace function public.apply_payment()
returns trigger language plpgsql as $$
begin
  if new.document_id is not null then
    update public.documents d
      set paid_amount = coalesce(paid_amount,0) + new.amount,
          paid_date = case when coalesce(paid_amount,0) + new.amount >= amount_gross then new.posted_at else paid_date end,
          status = case
            when coalesce(paid_amount,0) + new.amount >= amount_gross then 'paid'
            when coalesce(paid_amount,0) + new.amount > 0 then 'partial'
            else status end
    where d.id = new.document_id;
  end if;
  return new;
end $$;

create trigger payments_after_insert
after insert on public.payments
for each row execute function public.apply_payment();

-- Materializacja reguł cyklicznych -> dokumenty na horyzont
create or replace function public.materialize_recurring(horizon_days int default 90, _org uuid)
returns int language plpgsql as $$
declare
  created_count int := 0;
  r record;
  target_date date;
  last date := current_date + horizon_days;
begin
  for r in select * from public.recurring_rules where org_id=_org and auto_materialize loop
    target_date := date_trunc('month', greatest(current_date, r.start_date))::date + (r.day_of_month - 1);
    while target_date <= last and (r.end_date is null or target_date <= r.end_date) loop
      perform 1 from public.documents d
        where d.org_id=_org and d.recurring_rule_id=r.id and d.due_date=target_date;
      if not found then
        insert into public.documents (
          org_id, kind, direction, status, source, title, counterparty_id,
          issue_date, due_date, currency, amount_net, vat_amount, amount_gross,
          is_planned, recurring_rule_id
        ) values (
          _org, r.kind, r.direction, 'planned', 'recurring', r.label, r.counterparty_id,
          target_date, target_date, r.currency, 0, 0, r.amount_gross,
          true, r.id
        );
        created_count := created_count + 1;
      end if;
      target_date := (date_trunc('month', target_date)::date + (r.month_interval || ' month')::interval)::date + (r.day_of_month - 1);
    end loop;
  end loop;
  return created_count;
end $$;

-- Prosta estymacja VAT (okres) i utworzenie pseudodokumentu
create or replace function public.estimate_vat(_org uuid, period_start date, period_end date)
returns table(amount_out numeric, amount_in numeric, amount_due numeric, doc_id uuid) language plpgsql as $$
declare
  _out numeric := 0; _in numeric := 0; _due numeric := 0; _doc uuid;
begin
  -- sprzedaż (OUT: IN kierunek dla wpływu; VAT należny z AR)
  select coalesce(sum(di.vat_amount),0) into _out
  from public.documents d
  join public.document_items di on di.document_id=d.id
  where d.org_id=_org and d.kind='ar_invoice' and d.issue_date between period_start and period_end;

  -- zakupy (VAT naliczony)
  select coalesce(sum(di.vat_amount),0) into _in
  from public.documents d
  join public.document_items di on di.document_id=d.id
  where d.org_id=_org and d.kind='ap_invoice' and d.issue_date between period_start and period_end;

  _due := greatest(_out - _in, 0);

  -- utwórz / nadpisz dokument VAT na termin D+25 (przykład – skonfigurowalne w tax_configs)
  insert into public.documents (
    org_id, kind, direction, status, source, title,
    issue_date, due_date, currency, amount_net, vat_amount, amount_gross, is_planned
  ) values (
    _org, 'tax', 'OUT', 'planned', 'tax', 'VAT za okres',
    period_end, (period_end + interval '25 day')::date, 'PLN', 0, 0, _due, true
  ) returning id into _doc;

  return query select _out, _in, _due, _doc;
end $$;

-- Widok zdarzeń cashflow (saldo należności/zobowiązań)
create or replace view public.v_cashflow_events as
select
  d.org_id,
  d.id as document_id,
  d.title,
  d.kind,
  d.direction,
  d.status,
  d.due_date as event_date,
  (d.amount_gross - d.paid_amount) as amount,
  d.currency,
  d.counterparty_id,
  d.is_planned,
  d.source
from public.documents d
where d.status in ('planned','issued','partial','overdue')
  and (d.amount_gross - d.paid_amount) <> 0

union all
-- Harmonogramy (niezależne wpisy zestawiane jak dokumenty planowane)
select
  s.org_id,
  null::uuid as document_id,
  s.label as title,
  s.kind,
  'OUT'::direction as direction,
  'planned'::document_status as status,
  s.due_date as event_date,
  s.amount_gross as amount,
  s.currency,
  s.counterparty_id,
  true as is_planned,
  'schedule'::text as source
from public.schedule_entries s;

-- RPC: pobierz cashflow na horyzont dni
create or replace function public.cashflow(_org uuid, horizon_days int default 90)
returns table(
  event_date date,
  title text,
  direction direction,
  kind document_kind,
  status document_status,
  amount numeric,
  currency text,
  document_id uuid,
  source text
) language sql stable as $$
  select e.event_date, e.title, e.direction, e.kind, e.status, e.amount, e.currency, e.document_id, e.source
  from public.v_cashflow_events e
  where e.org_id = _org
    and e.event_date <= current_date + horizon_days
  order by e.event_date asc, e.direction asc;
$$;
```

### RLS (polityki)

```sql
-- Funkcja pomocnicza: lista orgów użytkownika
create or replace function public.user_org_ids()
returns setof uuid language sql stable as $$
  select m.org_id from public.memberships m where m.user_id = auth.uid()
$$;

-- Włącz RLS i dodaj polityki (przykład dla documents; powiel dla pozostałych tabel z kolumną org_id)
alter table public.documents enable row level security;
create policy "read documents" on public.documents
  for select using (org_id in (select public.user_org_ids()));
create policy "insert documents" on public.documents
  for insert with check (org_id in (select public.user_org_ids()));
create policy "update documents" on public.documents
  for update using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()));
create policy "delete documents" on public.documents
  for delete using (org_id in (select public.user_org_ids()));
```

---

## Seed (przykładowe dane)

```sql
-- przykładowa organizacja i użytkownik (podmień UUID użytkownika)
insert into public.organizations (name) values ('Moja Sp. z o.o.') returning id;
-- załóżmy, że auth.uid() = <USER_UUID>
insert into public.memberships (org_id, user_id, role)
select id, '<USER_UUID>'::uuid, 'owner' from public.organizations limit 1;

insert into public.partners (org_id, name, tax_id)
select id, 'Acme S.A.', 'PL1234567890' from public.organizations limit 1;

-- faktura sprzedaży 10k, termin za 14 dni
insert into public.documents (org_id, kind, direction, status, source, number, title, counterparty_id, issue_date, due_date, currency, amount_net, vat_amount, amount_gross)
select id, 'ar_invoice','IN','issued','manual','FV/1/2025','Usługi IT',
       (select p.id from public.partners p limit 1), current_date, current_date + 14, 'PLN', 8130, 1870, 10000
from public.organizations limit 1;

-- faktura zakupu 3k, termin za 7 dni
insert into public.documents (org_id, kind, direction, status, source, number, title, counterparty_id, issue_date, due_date, currency, amount_net, vat_amount, amount_gross)
select id, 'ap_invoice','OUT','issued','manual','FV/2/2025','Leasing samochodu',
       (select p.id from public.partners p limit 1), current_date, current_date + 7, 'PLN', 2439.02, 560.98, 3000
from public.organizations limit 1;

-- zlecenie stałe 199 PLN każdego 1. dnia miesiąca
insert into public.recurring_rules (org_id,label,direction,kind,day_of_month,amount_gross)
select id,'Abonament SaaS','OUT','standing_order',1,199 from public.organizations limit 1;
```

---

## API (Supabase RPC)

- `materialize_recurring(horizon_days, org_id)` – wygeneruj dokumenty planowane ze zleceń stałych.
- `estimate_vat(org_id, period_start, period_end)` – oblicz VAT i utwórz pseudodokument.
- `cashflow(org_id, horizon_days)` – pobierz zdarzenia cashflow na horyzoncie.

> W R0 zakładamy ręczne uruchamianie `materialize_recurring` oraz `estimate_vat` z UI.

---

## Frontend (React + Vite + TS + Tailwind + TanStack Query)

### Struktura widoków (R0)

- **Dashboard** – timeline cashflow (najbliższe 90 dni), skróty: „Materializuj cykliczne”, „Estymuj VAT”.
- **Dokumenty** – lista + formularz dodawania (AR/AP), szybkie oznaczanie płatności.
- **Cykliczne** – lista reguł, dodawanie/edycja.
- **Harmonogramy** – przegląd rat leasing/kredyt (import CSV w R1+).
- **Ustawienia** – konta, kontrahenci, podatki (częstotliwość, termin).

### Typy (frontend)

```ts
// src/lib/types.ts
export type Direction = "IN" | "OUT";
export type DocumentKind =
  | "ar_invoice"
  | "ap_invoice"
  | "tax"
  | "standing_order"
  | "lease_instalment"
  | "loan_instalment"
  | "other";
export type DocumentStatus =
  | "planned"
  | "issued"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

export interface CashflowEvent {
  event_date: string; // YYYY-MM-DD
  title: string;
  direction: Direction;
  kind: DocumentKind;
  status: DocumentStatus;
  amount: number;
  currency: string;
  document_id: string | null;
  source: string;
}
```

### Supabase client

```ts
// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
);
```

### Pobieranie cashflow (RPC)

```ts
// src/api/cashflow.ts
import { supabase } from "../lib/supabaseClient";
import type { CashflowEvent } from "../lib/types";

export async function fetchCashflow(
  orgId: string,
  horizonDays = 90,
): Promise<CashflowEvent[]> {
  const { data, error } = await supabase.rpc("cashflow", {
    _org: orgId,
    horizon_days: horizonDays,
  });
  if (error) throw error;
  return data as CashflowEvent[];
}

export async function materializeRecurring(orgId: string, horizonDays = 90) {
  const { data, error } = await supabase.rpc("materialize_recurring", {
    _org: orgId,
    horizon_days: horizonDays,
  });
  if (error) throw error;
  return data as number; // liczba utworzonych wpisów
}
```

### Widok: Cashflow

```tsx
// src/pages/CashflowPage.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { fetchCashflow, materializeRecurring } from "../api/cashflow";

export default function CashflowPage({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cashflow", orgId],
    queryFn: () => fetchCashflow(orgId, 90),
  });

  const { mutate: doMaterialize, isPending } = useMutation({
    mutationFn: () => materializeRecurring(orgId, 90),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cashflow", orgId] }),
  });

  if (isLoading) return <div className="p-4">Ładowanie…</div>;
  if (error)
    return (
      <div className="p-4 text-red-500">Błąd: {(error as any).message}</div>
    );

  const groups = (data ?? []).reduce<Record<string, typeof data>>((acc, e) => {
    const key = dayjs(e.event_date).format("YYYY‑MM‑DD (dddd)");
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Cashflow — 90 dni</h1>
        <button
          onClick={() => doMaterialize()}
          disabled={isPending}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          Materializuj cykliczne
        </button>
      </div>
      <div className="space-y-6">
        {Object.entries(groups).map(([date, items]) => (
          <div key={date} className="border rounded-xl p-4">
            <div className="font-medium opacity-80 mb-2">{date}</div>
            <ul className="divide-y">
              {items.map((e, idx) => (
                <li
                  key={idx}
                  className="py-2 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{e.title || e.kind}</div>
                    <div className="text-sm opacity-70">
                      {e.kind} • {e.source} • {e.status}
                    </div>
                  </div>
                  <div
                    className={
                      e.direction === "IN" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {e.direction === "IN" ? "+" : "−"}
                    {e.amount.toFixed(2)} {e.currency}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Formularz dokumentu (skrócony)

```tsx
// src/pages/NewDocumentPage.tsx (zapis do public.documents)
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function NewDocumentPage({ orgId }: { orgId: string }) {
  const [form, setForm] = useState({
    kind: "ap_invoice",
    direction: "OUT",
    number: "",
    title: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    amount_gross: 0,
  });

  async function save() {
    const { error } = await supabase
      .from("documents")
      .insert([{ ...form, org_id: orgId, currency: "PLN" }]);
    if (error) alert(error.message);
    else alert("Zapisano");
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Nowy dokument</h1>
      <select
        value={form.kind}
        onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
        className="border p-2 rounded w-full"
      >
        <option value="ap_invoice">Faktura zakupu</option>
        <option value="ar_invoice">Faktura sprzedaży</option>
        <option value="tax">Podatek</option>
        <option value="standing_order">Zlecenie stałe</option>
      </select>
      <input
        className="border p-2 rounded w-full"
        placeholder="Numer"
        value={form.number}
        onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
      />
      <input
        className="border p-2 rounded w-full"
        placeholder="Tytuł"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={form.issue_date}
          onChange={(e) =>
            setForm((f) => ({ ...f, issue_date: e.target.value }))
          }
        />
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={form.due_date}
          onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
        />
      </div>
      <input
        type="number"
        className="border p-2 rounded w-full"
        placeholder="Kwota brutto"
        value={form.amount_gross}
        onChange={(e) =>
          setForm((f) => ({ ...f, amount_gross: Number(e.target.value) }))
        }
      />
      <button
        onClick={save}
        className="px-3 py-2 rounded bg-blue-600 text-white"
      >
        Zapisz
      </button>
    </div>
  );
}
```

---

## Komendy (quick start)

```bash
# 1) Vite + React + TS
npm create vite@latest budget -- --template react-ts
cd budget
npm i @tanstack/react-query dayjs @supabase/supabase-js
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 2) Supabase (CLI)
npm i -D supabase
npx supabase init
# -> w Supabase Studio wykonaj SQL z sekcji Model danych / Triggery / RLS / Seed

# 3) Tailwind (index.css)
@tailwind base;
@tailwind components;
@tailwind utilities;

# 4) .env.local
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# 5) Uruchom
npm run dev
```

---

## Roadmap

- **R0 (ten plik)**: model, RPC, widok cashflow, CRUD dokumentów, cykliczne (materializacja ręczna).
- **R1**: szybkie oznaczanie płatności z listy, harmonogramy leasing/kredyt (import CSV), widget „co w tym tygodniu”.
- **R2**: konfiguracja podatków per org + estymacja CIT/ZUS (parametryzowana), kalendarz.
- **R3**: import wyciągów (CSV/MT940) + półautomatyczne matchowanie do dokumentów.
- **R4**: wielowalutowość z kursami NBP, wykres salda, powiadomienia.

> Gotowe do iteracji. Wystarczy wkleić SQL do Supabase, dodać .env i podpiąć komponenty w routerze.

---

# Frontend Setup — krok po kroku (R0)

## 1) Utworzenie projektu i instalacje

```bash
# Vite + React + TypeScript
npm create vite@latest budget -- --template react-ts
cd budget

# Kluczowe biblioteki
npm i @tanstack/react-query @supabase/supabase-js react-router-dom dayjs

# TailwindCSS
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## 2) Konfiguracje narzędzi

**tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

**postcss.config.js** (powstał od `-p`)

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light dark;
}
body {
  @apply bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100;
}
```

**tsconfig.json** (dodaj preferencję użytkownika: `allowImportingTsExtensions`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "allowImportingTsExtensions": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

**.env.example**

```ini
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 3) Struktura plików (R0)

```
src/
  api/
    cashflow.ts
  lib/
    supabaseClient.ts
    types.ts
  pages/
    CashflowPage.tsx
    NewDocumentPage.tsx
  components/
    Nav.tsx
  App.tsx
  main.tsx
  index.css
```

## 4) Pliki źródłowe

**src/lib/types.ts**

```ts
export type Direction = "IN" | "OUT";
export type DocumentKind =
  | "ar_invoice"
  | "ap_invoice"
  | "tax"
  | "standing_order"
  | "lease_instalment"
  | "loan_instalment"
  | "other";
export type DocumentStatus =
  | "planned"
  | "issued"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

export interface CashflowEvent {
  event_date: string;
  title: string;
  direction: Direction;
  kind: DocumentKind;
  status: DocumentStatus;
  amount: number;
  currency: string;
  document_id: string | null;
  source: string;
}
```

**src/lib/supabaseClient.ts**

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
);
```

**src/api/cashflow.ts**

```ts
import { supabase } from "@/lib/supabaseClient";
import type { CashflowEvent } from "@/lib/types";

export async function fetchCashflow(
  orgId: string,
  horizonDays = 90,
): Promise<CashflowEvent[]> {
  const { data, error } = await supabase.rpc("cashflow", {
    _org: orgId,
    horizon_days: horizonDays,
  });
  if (error) throw error;
  return data as CashflowEvent[];
}

export async function materializeRecurring(orgId: string, horizonDays = 90) {
  const { data, error } = await supabase.rpc("materialize_recurring", {
    _org: orgId,
    horizon_days: horizonDays,
  });
  if (error) throw error;
  return data as number;
}
```

**src/components/Nav.tsx**

```tsx
import { Link, NavLink } from "react-router-dom";

export default function Nav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1 rounded ${
      isActive
        ? "bg-zinc-200 dark:bg-zinc-800"
        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
    }`;
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">
          Budget
        </Link>
        <nav className="flex gap-2 text-sm">
          <NavLink to="/cashflow" className={cls}>
            Cashflow
          </NavLink>
          <NavLink to="/new" className={cls}>
            Nowy dokument
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
```

**src/pages/CashflowPage.tsx**

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { fetchCashflow, materializeRecurring } from "@/api/cashflow";

const ORG_ID = "<ORG_UUID>"; // TODO: pobierz z profilu po auth

export default function CashflowPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cashflow", ORG_ID],
    queryFn: () => fetchCashflow(ORG_ID, 90),
  });

  const { mutate: doMaterialize, isPending } = useMutation({
    mutationFn: () => materializeRecurring(ORG_ID, 90),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cashflow", ORG_ID] }),
  });

  if (isLoading) return <div className="p-4">Ładowanie…</div>;
  if (error)
    return (
      <div className="p-4 text-red-500">Błąd: {(error as any).message}</div>
    );

  const groups = (data ?? []).reduce<Record<string, typeof data>>((acc, e) => {
    const key = dayjs(e.event_date).format("YYYY-MM-DD (dddd)");
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div>
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Cashflow — 90 dni</h1>
          <button
            onClick={() => doMaterialize()}
            disabled={isPending}
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            Materializuj cykliczne
          </button>
        </div>
        <div className="space-y-6">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date} className="border rounded-xl p-4">
              <div className="font-medium opacity-80 mb-2">{date}</div>
              <ul className="divide-y">
                {items.map((e, idx) => (
                  <li
                    key={idx}
                    className="py-2 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{e.title || e.kind}</div>
                      <div className="text-sm opacity-70">
                        {e.kind} • {e.source} • {e.status}
                      </div>
                    </div>
                    <div
                      className={
                        e.direction === "IN" ? "text-green-600" : "text-red-600"
                      }
                    >
                      {e.direction === "IN" ? "+" : "−"}
                      {e.amount.toFixed(2)} {e.currency}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**src/pages/NewDocumentPage.tsx**

```tsx
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ORG_ID = "<ORG_UUID>"; // TODO: pobierz z profilu po auth

export default function NewDocumentPage() {
  const [form, setForm] = useState({
    kind: "ap_invoice",
    direction: "OUT",
    number: "",
    title: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    amount_gross: 0,
    currency: "PLN",
  });

  async function save() {
    const { error } = await supabase
      .from("documents")
      .insert([{ ...form, org_id: ORG_ID }]);
    if (error) alert(error.message);
    else alert("Zapisano");
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-semibold">Nowy dokument</h1>
      <select
        value={form.kind}
        onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
        className="border p-2 rounded w-full"
      >
        <option value="ap_invoice">Faktura zakupu</option>
        <option value="ar_invoice">Faktura sprzedaży</option>
        <option value="tax">Podatek</option>
        <option value="standing_order">Zlecenie stałe</option>
      </select>
      <input
        className="border p-2 rounded w-full"
        placeholder="Numer"
        value={form.number}
        onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
      />
      <input
        className="border p-2 rounded w-full"
        placeholder="Tytuł"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={form.issue_date}
          onChange={(e) =>
            setForm((f) => ({ ...f, issue_date: e.target.value }))
          }
        />
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={form.due_date}
          onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
        />
      </div>
      <input
        type="number"
        className="border p-2 rounded w-full"
        placeholder="Kwota brutto"
        value={form.amount_gross}
        onChange={(e) =>
          setForm((f) => ({ ...f, amount_gross: Number(e.target.value) }))
        }
      />
      <button
        onClick={save}
        className="px-3 py-2 rounded bg-blue-600 text-white"
      >
        Zapisz
      </button>
    </div>
  );
}
```

**src/App.tsx**

```tsx
import { Outlet } from "react-router-dom";
import Nav from "@/components/Nav";

export default function App() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
```

**src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import CashflowPage from "@/pages/CashflowPage";
import NewDocumentPage from "@/pages/NewDocumentPage";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <CashflowPage /> },
      { path: "cashflow", element: <CashflowPage /> },
      { path: "new", element: <NewDocumentPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

## 5) Uruchomienie

```bash
cp .env.example .env.local
# wklej klucze Supabase
npm run dev
```

## 6) Test „end‑to‑end” R0

1. W Supabase wklej SQL z sekcji modelu i seed.
2. Odpal FE. Wejdź na `/new`, zapisz dokument OUT z terminem w ciągu 30 dni.
3. Wejdź na `/cashflow` → zobacz wpis. Użyj „Materializuj cykliczne” i sprawdź, że pojawiają się pozycje ze zleceń stałych.

---

# Frontend‑only Starter (Mock) — Full Guide

Poniższa instrukcja tworzy **sam frontend** (React + Vite + TS + Tailwind + React Router + TanStack Query) z **mock API**, więc działa bez backendu/Supabase. Na końcu znajdziesz sekcję „przejście na Supabase”.

## 0) Wymagania

- Node 18+ (lub 20+)
- npm (lub pnpm/yarn – poniżej przykłady dla npm)

## 1) Utworzenie projektu i instalacja paczek

```bash
# 1. scaffold
npm create vite@latest bilancio -- --template react-ts
cd budget

# 2. runtime libs
npm i react-router-dom @tanstack/react-query dayjs

# 3. styling
npm install tailwindcss @tailwindcss/vite

# 4. prettier
npm i -D prettier prettier-plugin-tailwindcss
```

## 2) Konfiguracje

**vite.config.ts**

```ts
/** @type {import('tailwindcss').Config} */
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
});
```

**tsconfig.json** (zamień zawartość – alias `@/*` i `allowImportingTsExtensions`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "allowImportingTsExtensions": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

**src/index.css**

```css
@import "tailwindcss";

:root {
  color-scheme: light dark;
}
body {
  @apply bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100;
}
```

**prettier.config.cjs**

```ts
/** @type {import("prettier").Config} */
module.exports = {
  semi: true, // średniki
  singleQuote: true, // pojedyncze cudzysłowy
  trailingComma: "es5", // przecinki końcowe w obiektach/tablicach
  printWidth: 100, // szerokość linii
  tabWidth: 2, // spacje zamiast tabów
  plugins: ["prettier-plugin-tailwindcss"], // sortowanie klas tailwindowych
};
```

## 3) Struktura katalogów

```
src/
  api/
    cashflow.mock.ts
  components/
    Nav.tsx
  lib/
    types.ts
  pages/
    CashflowPage.tsx
    NewDocumentPage.tsx
  App.tsx
  main.tsx
  index.css
```

## 4) Kod źródłowy (komplet)

**src/lib/types.ts**

```ts
export type Direction = "IN" | "OUT";
export type DocumentKind =
  | "ar_invoice"
  | "ap_invoice"
  | "tax"
  | "standing_order"
  | "lease_instalment"
  | "loan_instalment"
  | "other";
export type DocumentStatus =
  | "planned"
  | "issued"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

export interface CashflowEvent {
  event_date: string; // YYYY-MM-DD
  title: string;
  direction: Direction;
  kind: DocumentKind;
  status: DocumentStatus;
  amount: number;
  currency: string;
  document_id: string | null;
  source: string;
}
```

**src/api/cashflow.mock.ts**

```ts
import type { CashflowEvent } from "@/lib/types";
import dayjs from "dayjs";

let mockData: CashflowEvent[] = [
  {
    event_date: dayjs().add(3, "day").format("YYYY-MM-DD"),
    title: "FV/1/2025 — Usługi IT",
    direction: "IN",
    kind: "ar_invoice",
    status: "issued",
    amount: 10000,
    currency: "PLN",
    document_id: null,
    source: "mock",
  },
  {
    event_date: dayjs().add(7, "day").format("YYYY-MM-DD"),
    title: "FV/2/2025 — Leasing",
    direction: "OUT",
    kind: "ap_invoice",
    status: "issued",
    amount: 3000,
    currency: "PLN",
    document_id: null,
    source: "mock",
  },
];

export async function fetchCashflow(
  _: string,
  __ = 90,
): Promise<CashflowEvent[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockData;
}

export async function materializeRecurring(
  _: string,
  __ = 90,
): Promise<number> {
  await new Promise((r) => setTimeout(r, 200));
  mockData = [
    ...mockData,
    {
      event_date: dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD"),
      title: "Abonament SaaS",
      direction: "OUT",
      kind: "standing_order",
      status: "planned",
      amount: 199,
      currency: "PLN",
      document_id: null,
      source: "mock",
    },
  ];
  return 1;
}

export async function createDocumentMock(e: {
  kind: string;
  direction: "IN" | "OUT";
  title: string;
  amount_gross: number;
  due_date: string;
  currency?: string;
}) {
  mockData = [
    ...mockData,
    {
      event_date: e.due_date,
      title: e.title || e.kind,
      direction: e.direction,
      kind: e.kind as any,
      status: "issued",
      amount: e.amount_gross,
      currency: e.currency ?? "PLN",
      document_id: null,
      source: "mock",
    },
  ];
}
```

**src/components/Nav.tsx**

```tsx
import { Link, NavLink } from "react-router-dom";

export default function Nav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1 rounded ${
      isActive
        ? "bg-zinc-200 dark:bg-zinc-800"
        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
    }`;
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">
          Budget
        </Link>
        <nav className="flex gap-2 text-sm">
          <NavLink to="/cashflow" className={cls}>
            Cashflow
          </NavLink>
          <NavLink to="/new" className={cls}>
            Nowy dokument
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
```

**src/pages/CashflowPage.tsx**

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { fetchCashflow, materializeRecurring } from "@/api/cashflow.mock";

const ORG_ID = "mock-org";

export default function CashflowPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cashflow", ORG_ID],
    queryFn: () => fetchCashflow(ORG_ID, 90),
  });

  const { mutate: doMaterialize, isPending } = useMutation({
    mutationFn: () => materializeRecurring(ORG_ID, 90),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cashflow", ORG_ID] }),
  });

  if (isLoading) return <div className="p-4">Ładowanie…</div>;
  if (error)
    return (
      <div className="p-4 text-red-500">Błąd: {(error as any).message}</div>
    );

  const groups = (data ?? []).reduce<Record<string, typeof data>>((acc, e) => {
    const key = dayjs(e.event_date).format("YYYY-MM-DD (dddd)");
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Cashflow — 90 dni</h1>
        <button
          onClick={() => doMaterialize()}
          disabled={isPending}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          Materializuj cykliczne
        </button>
      </div>
      <div className="space-y-6">
        {Object.entries(groups).map(([date, items]) => (
          <div key={date} className="border rounded-xl p-4">
            <div className="font-medium opacity-80 mb-2">{date}</div>
            <ul className="divide-y">
              {items.map((e, idx) => (
                <li
                  key={idx}
                  className="py-2 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{e.title || e.kind}</div>
                    <div className="text-sm opacity-70">
                      {e.kind} • {e.source} • {e.status}
                    </div>
                  </div>
                  <div
                    className={
                      e.direction === "IN" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {e.direction === "IN" ? "+" : "−"}
                    {e.amount.toFixed(2)} {e.currency}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**src/pages/NewDocumentPage.tsx**

```tsx
import { useState } from "react";
import { createDocumentMock } from "@/api/cashflow.mock";

export default function NewDocumentPage() {
  const [form, setForm] = useState({
    kind: "ap_invoice",
    direction: "OUT" as const,
    number: "",
    title: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    amount_gross: 0,
    currency: "PLN",
  });

  async function save() {
    await createDocumentMock({
      kind: form.kind,
      direction: form.direction,
      title: form.title || form.number || form.kind,
      amount_gross: form.amount_gross,
      due_date: form.due_date,
      currency: form.currency,
    });
    alert("Zapisano (mock)");
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-semibold">Nowy dokument</h1>
      <select
        value={form.kind}
        onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
        className="border p-2 rounded w-full"
      >
        <option value="ap_invoice">Faktura zakupu</option>
        <option value="ar_invoice">Faktura sprzedaży</option>
        <option value="tax">Podatek</option>
        <option value="standing_order">Zlecenie stałe</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="border p-2 rounded w-full"
          placeholder="Numer"
          value={form.number}
          onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Tytuł"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={form.issue_date}
          onChange={(e) =>
            setForm((f) => ({ ...f, issue_date: e.target.value }))
          }
        />
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={form.due_date}
          onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
        />
      </div>
      <input
        type="number"
        className="border p-2 rounded w-full"
        placeholder="Kwota brutto"
        value={form.amount_gross}
        onChange={(e) =>
          setForm((f) => ({ ...f, amount_gross: Number(e.target.value) }))
        }
      />
      <div className="text-sm opacity-70">Waluta: {form.currency}</div>
      <button
        onClick={save}
        className="px-3 py-2 rounded bg-blue-600 text-white"
      >
        Zapisz
      </button>
    </div>
  );
}
```

**src/App.tsx**

```tsx
import { Outlet } from "react-router-dom";
import Nav from "@/components/Nav";

export default function App() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
```

**src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import CashflowPage from "@/pages/CashflowPage";
import NewDocumentPage from "@/pages/NewDocumentPage";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <CashflowPage /> },
      { path: "cashflow", element: <CashflowPage /> },
      { path: "new", element: <NewDocumentPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

## 5) Uruchomienie

```bash
npm run dev
```

Wejdź na `/new`, dodaj dokument → sprawdź `/cashflow`.

## 6) Przejście na Supabase (gdy będziesz gotów)

1. `npm i @supabase/supabase-js`
2. Dodaj `src/lib/supabaseClient.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
);
```

3. Dodaj `.env.local` z `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
4. Zastąp importy w stronach: `@/api/cashflow.mock` → produkcyjny `@/api/cashflow` zgodny z wcześniej podanym API RPC.
5. (Opcjonalnie) dorzuć auth i pobieranie `orgId` z profilu.
