-- CüS Treasure schema. Run once in Supabase SQL Editor (Postgres 15+).
-- Balances are DERIVED (see account_balances view), never stored, so a
-- transaction or transfer can never double-deduct or double-add.

create extension if not exists pgcrypto;

-- ---------- PROFILES / PREFERENCES ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  currency text not null default 'INR' check (char_length(currency) = 3),
  theme text not null default 'dark' check (theme in ('dark','light')),
  notify_budget boolean not null default true,
  notify_recurring boolean not null default true,
  notify_goals boolean not null default true,
  hide_balances boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ACCOUNTS ----------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  type text not null check (type in ('cash','bank','wallet','investment','credit_card','loan')),
  opening_balance numeric(14,2) not null default 0,
  is_manual boolean not null default true, -- true = user-entered, not bank-connected
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index accounts_user_idx on public.accounts(user_id);

-- ---------- CATEGORIES ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind text not null check (kind in ('income','expense')),
  color text not null default '#FF7023',
  icon text not null default 'tag',
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name, kind)
);
create index categories_user_idx on public.categories(user_id);

-- ---------- RECURRING ----------
create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null,
  category_id uuid,
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  description text not null default '',
  frequency text not null check (frequency in ('weekly','monthly','yearly')),
  next_due date not null,
  is_subscription boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id)
);
create index recurring_user_due_idx on public.recurring_transactions(user_id, next_due) where active;

-- ---------- TRANSACTIONS ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null,
  category_id uuid,
  recurring_id uuid,
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  description text not null default '',
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts(id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id),
  foreign key (recurring_id, user_id) references public.recurring_transactions(id, user_id) on delete set null (recurring_id)
);
create index transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index transactions_account_idx on public.transactions(account_id);
create index transactions_category_idx on public.transactions(category_id);
-- one generated transaction per recurring schedule per date (no duplicates)
create unique index transactions_recurring_once_idx
  on public.transactions(recurring_id, occurred_on) where recurring_id is not null;

-- ---------- TRANSFERS ----------
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_account_id uuid not null,
  to_account_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '',
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id),
  foreign key (from_account_id, user_id) references public.accounts(id, user_id) on delete cascade,
  foreign key (to_account_id, user_id) references public.accounts(id, user_id) on delete cascade
);
create index transfers_user_date_idx on public.transfers(user_id, occurred_on desc);

-- ---------- BUDGETS ----------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null,
  month date not null check (month = date_trunc('month', month)::date),
  limit_amount numeric(14,2) not null check (limit_amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete cascade
);
create index budgets_user_month_idx on public.budgets(user_id, month);

-- ---------- SAVINGS GOALS ----------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  target_amount numeric(14,2) not null check (target_amount > 0),
  target_date date,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index goals_user_idx on public.goals(user_id);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null,
  amount numeric(14,2) not null check (amount <> 0),
  contributed_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade
);
create index goal_contrib_goal_idx on public.goal_contributions(goal_id);

-- ---------- NOTIFICATIONS ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info' check (kind in ('info','budget','goal','recurring')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------- DERIVED VIEWS (run with caller's RLS) ----------
create view public.account_balances with (security_invoker = true) as
select
  a.id, a.user_id, a.name, a.type, a.opening_balance, a.is_manual, a.created_at,
  a.opening_balance
    + coalesce((select sum(case t.kind when 'income' then t.amount else -t.amount end)
                from public.transactions t where t.account_id = a.id), 0)
    + coalesce((select sum(tr.amount) from public.transfers tr where tr.to_account_id = a.id), 0)
    - coalesce((select sum(tr.amount) from public.transfers tr where tr.from_account_id = a.id), 0)
  as balance
from public.accounts a;

create view public.goal_progress with (security_invoker = true) as
select g.id, g.user_id, g.name, g.target_amount, g.target_date, g.created_at,
  coalesce(sum(c.amount), 0) as saved,
  coalesce(sum(c.amount), 0) >= g.target_amount as completed
from public.goals g
left join public.goal_contributions c on c.goal_id = g.id
group by g.id;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
create policy profiles_own on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['accounts','categories','recurring_transactions','transactions',
    'transfers','budgets','goals','goal_contributions','notifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_own', t);
  end loop;
end $$;

-- ---------- TRIGGERS ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- new auth user -> profile + default categories + cash wallet
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.categories (user_id, name, kind, color, icon) values
    (new.id,'Salary','income','#22C55E','wallet'),
    (new.id,'Business','income','#22C55E','chart'),
    (new.id,'Investments','income','#8B5CF6','trending'),
    (new.id,'Other income','income','#22C55E','plus'),
    (new.id,'Food & dining','expense','#FF7023','tag'),
    (new.id,'Transport','expense','#EF4444','tag'),
    (new.id,'Housing','expense','#EF4444','home'),
    (new.id,'Bills & utilities','expense','#EF4444','receipt'),
    (new.id,'Shopping','expense','#FF7023','tag'),
    (new.id,'Health','expense','#EF4444','shield'),
    (new.id,'Entertainment','expense','#8B5CF6','sparkle'),
    (new.id,'Subscriptions','expense','#8B5CF6','repeat'),
    (new.id,'Other expense','expense','#EF4444','tag');

  insert into public.accounts (user_id, name, type) values (new.id, 'Cash', 'cash');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ATOMIC FUNCTIONS ----------
-- Post every due recurring item exactly once, then advance next_due. Atomic.
create or replace function public.run_due_recurring() returns integer
language plpgsql security invoker set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select * from public.recurring_transactions
           where user_id = auth.uid() and active and next_due <= current_date
           for update loop
    while r.next_due <= current_date loop
      insert into public.transactions
        (user_id, account_id, category_id, recurring_id, kind, amount, description, occurred_on)
      values (r.user_id, r.account_id, r.category_id, r.id, r.kind, r.amount, r.description, r.next_due)
      on conflict (recurring_id, occurred_on) where recurring_id is not null do nothing;
      n := n + 1;
      r.next_due := case r.frequency
        when 'weekly'  then r.next_due + 7
        when 'monthly' then (r.next_due + interval '1 month')::date
        else (r.next_due + interval '1 year')::date end;
    end loop;
    update public.recurring_transactions set next_due = r.next_due where id = r.id;
  end loop;
  return n;
end $$;

-- Permanently delete the caller's account and all data (cascades).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.run_due_recurring() from public, anon;
grant execute on function public.run_due_recurring() to authenticated;