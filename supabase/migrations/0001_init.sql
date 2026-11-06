-- Hygge: initial schema. Every table has row-level security: a user only ever sees their own rows.

create type public.gender as enum ('male', 'female');
create type public.app_mode as enum ('islamic', 'default');
create type public.theme_mode as enum ('day', 'night', 'system');
create type public.item_kind as enum (
  'pubic_hair', 'armpit_hair', 'nails', 'head_hair', 'beard', 'moustache', 'body_hair', 'facial_hair'
);
create type public.beard_variant as enum ('shave', 'trim');
create type public.pause_kind as enum ('ihram', 'custom');
create type public.flow_level as enum ('none', 'spotting', 'light', 'medium', 'heavy');

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text,
  gender            public.gender,
  mode              public.app_mode not null default 'islamic',
  theme_mode        public.theme_mode not null default 'system',
  timezone          text not null default 'UTC',
  reminder_hour     smallint not null default 9  check (reminder_hour between 0 and 23),
  quiet_start       smallint not null default 22 check (quiet_start between 0 and 23),
  quiet_end         smallint not null default 7  check (quiet_end between 0 and 23),
  discreet          boolean not null default false,
  preferred_weekday smallint check (preferred_weekday between 0 and 6),
  plans_qurbani     boolean not null default false,
  qurbani_day       smallint not null default 10 check (qurbani_day between 10 and 13),
  hijri_offset      smallint not null default 0  check (hijri_offset between -2 and 2),
  period_lead_days  smallint not null default 2  check (period_lead_days between 0 and 7),
  channel_inapp     boolean not null default true,
  channel_push      boolean not null default false,
  channel_email     boolean not null default false,
  channel_calendar  boolean not null default false,
  ics_token         text not null default encode(gen_random_bytes(24), 'hex'),
  onboarded         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------- tracker_items
create table public.tracker_items (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  kind                 public.item_kind not null,
  variant              public.beard_variant,
  interval_days        smallint not null check (interval_days between 1 and 365),
  lead_days            smallint not null check (lead_days between 0 and 30),
  remind_on_due        boolean not null default true,
  remind_overdue_daily boolean not null default true,
  snoozed_until        date,
  enabled              boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, kind),
  check (variant is null or kind = 'beard')
);
create trigger tracker_items_updated before update on public.tracker_items
  for each row execute function public.set_updated_at();

create index tracker_items_user_idx on public.tracker_items (user_id);

-- ----------------------------------------------------------- grooming_logs
create table public.grooming_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  item_id    uuid not null references public.tracker_items (id) on delete cascade,
  done_on    date not null,
  note       text,
  created_at timestamptz not null default now()
);
create index grooming_logs_item_idx on public.grooming_logs (item_id, done_on desc);
create index grooming_logs_user_idx on public.grooming_logs (user_id, done_on desc);

-- ------------------------------------------------------------------ pauses
create table public.pauses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.pause_kind not null,
  start_date date not null,
  end_date   date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index pauses_user_idx on public.pauses (user_id);

-- ------------------------------------------------------------------ cycles
create table public.cycles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date   date,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index cycles_user_idx on public.cycles (user_id, start_date desc);

create table public.cycle_day_logs (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  day      date not null,
  flow     public.flow_level,
  symptoms text[] not null default '{}',
  mood     text,
  note     text,
  primary key (user_id, day)
);

-- --------------------------------------------------------- reminder plumbing
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  platform   text not null default 'web' check (platform in ('web', 'expo')),
  endpoint   text not null,
  p256dh     text,
  auth       text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table public.notification_log (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  for_date date not null,
  channel  text not null check (channel in ('push', 'email')),
  sent_at  timestamptz not null default now(),
  primary key (user_id, for_date, channel)         -- at most one digest per channel per day
);

create table public.action_tokens (
  token_hash text primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  item_ids   uuid[] not null,
  action     text not null check (action in ('done', 'snooze')),
  expires_at timestamptz not null,
  used_at    timestamptz
);

-- ------------------------------------------------------ row-level security
alter table public.profiles          enable row level security;
alter table public.tracker_items     enable row level security;
alter table public.grooming_logs     enable row level security;
alter table public.pauses            enable row level security;
alter table public.cycles            enable row level security;
alter table public.cycle_day_logs    enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log  enable row level security;
alter table public.action_tokens     enable row level security;

create policy profiles_own on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['tracker_items', 'grooming_logs', 'pauses', 'cycles', 'cycle_day_logs', 'push_subscriptions']
  loop
    execute format(
      'create policy %I on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_own', t);
  end loop;
end $$;

-- notification_log and action_tokens are written only by the server (service role), never by the client.
-- RLS is on and no client policy exists, so clients can neither read nor write them.

-- A log must belong to an item owned by the same user.
create function public.check_log_owner() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.tracker_items i where i.id = new.item_id and i.user_id = new.user_id) then
    raise exception 'item does not belong to user';
  end if;
  return new;
end $$;
create trigger grooming_logs_owner before insert or update on public.grooming_logs
  for each row execute function public.check_log_owner();

-- ------------------------------------------------ profile on sign-up (guest too)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------ default items by gender
create function public.apply_gender(p_gender public.gender, p_beard public.beard_variant default 'trim')
returns void language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := auth.uid();
  wanted public.item_kind[];
begin
  if uid is null then raise exception 'not signed in'; end if;
  wanted := case p_gender
    when 'male'   then array['pubic_hair','armpit_hair','nails','head_hair','beard','moustache']::public.item_kind[]
    else               array['pubic_hair','armpit_hair','nails','head_hair','body_hair','facial_hair']::public.item_kind[]
  end;

  update public.profiles set gender = p_gender where id = uid;

  -- create missing items with defaults (40 days, nails 7; lead 3 days, nails 1)
  insert into public.tracker_items (user_id, kind, variant, interval_days, lead_days)
  select uid, k, case when k = 'beard' then p_beard end,
         case when k = 'nails' then 7 else 40 end,
         case when k = 'nails' then 1 else 3 end
  from unnest(wanted) as k
  on conflict (user_id, kind) do nothing;

  -- switch items on/off; nothing is ever deleted so history survives switching back
  update public.tracker_items set enabled = (kind = any (wanted)) where user_id = uid;
end $$;

-- ---------------------------------------------------------- delete my account
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();   -- cascades to every table above
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
