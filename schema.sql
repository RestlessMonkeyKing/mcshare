-- ═══════════════════════════════════════════════════════════
-- mcshare — full Supabase schema (run once in the SQL editor)
-- Rules enforced here:
--   1. Only the sender can delete (secure RPC + NO direct delete policy)
--   2. Codes auto-expire after 1 hour (expires_at + cron cleanup)
--   3. Max 10 posts per owner per hour (trigger)
-- ═══════════════════════════════════════════════════════════

-- 1) Table
create table if not exists public.codes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 60),
  slot1 text not null,
  slot2 text not null,
  slot3 text not null,
  slot4 text not null,
  owner_token text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  constraint valid_slots check (
    slot1 in ('steve','alex','agent','llama','panda','apple','book','cake','cookie','map','pickaxe','sign','bucket','balloon','carrot','fish','ladder','potion')
    and slot2 in ('steve','alex','agent','llama','panda','apple','book','cake','cookie','map','pickaxe','sign','bucket','balloon','carrot','fish','ladder','potion')
    and slot3 in ('steve','alex','agent','llama','panda','apple','book','cake','cookie','map','pickaxe','sign','bucket','balloon','carrot','fish','ladder','potion')
    and slot4 in ('steve','alex','agent','llama','panda','apple','book','cake','cookie','map','pickaxe','sign','bucket','balloon','carrot','fish','ladder','potion')
  )
);

-- Migrate old tables (safe to re-run)
alter table public.codes add column if not exists owner_token text not null default 'legacy';
alter table public.codes add column if not exists expires_at timestamptz not null default now() + interval '1 hour';

-- 2) Indexes
create index if not exists codes_created_at_idx on public.codes (created_at desc);
create index if not exists codes_expires_at_idx on public.codes (expires_at);
create index if not exists codes_owner_created_idx on public.codes (owner_token, created_at desc);

-- 3) RLS — public read + insert only. NO delete policy on purpose:
-- deletes go through delete_my_code() which checks the owner token.
alter table public.codes enable row level security;

drop policy if exists "codes: anyone can read" on public.codes;
create policy "codes: anyone can read"
  on public.codes for select using (true);

drop policy if exists "codes: anyone can post" on public.codes;
create policy "codes: anyone can post"
  on public.codes for insert with check (char_length(title) between 1 and 60);

-- remove any legacy open-delete policy so strangers can't wipe codes
drop policy if exists "codes: anyone can delete" on public.codes;
drop policy if exists "read all" on public.codes;
drop policy if exists "insert all" on public.codes;

-- 4) Rate limit: max 10 inserts per owner_token per rolling hour
create or replace function public.enforce_code_rate_limit()
returns trigger language plpgsql security definer as $$
declare cnt int;
begin
  select count(*) into cnt from public.codes
    where owner_token = NEW.owner_token
      and created_at > now() - interval '1 hour';
  if cnt >= 10 then
    raise exception 'Rate limit: max 10 codes per hour' using errcode = 'P0001';
  end if;
  if NEW.expires_at is null or NEW.expires_at <= now() then
    NEW.expires_at := now() + interval '1 hour';
  end if;
  return NEW;
end $$;

drop trigger if exists codes_rate_limit on public.codes;
create trigger codes_rate_limit
  before insert on public.codes
  for each row execute function public.enforce_code_rate_limit();

-- 5) Owner-only delete via RPC (checks token server-side)
create or replace function public.delete_my_code(p_id uuid, p_token text)
returns boolean language plpgsql security definer as $$
declare gone boolean := false;
begin
  delete from public.codes where id = p_id and owner_token = p_token;
  get diagnostics gone = ROW_COUNT;
  return coalesce(gone, false) > 0;
end $$;

grant execute on function public.delete_my_code(uuid, text) to anon, authenticated;

-- 6) Auto-delete expired codes (runs server-side via pg_cron)
create or replace function public.delete_expired_codes()
returns void language sql security definer as $$
  delete from public.codes where expires_at < now();
$$;

-- Enable pg_cron + schedule every minute (run once; comment out if cron already enabled):
-- create extension if not exists pg_cron;
-- select cron.schedule('mcshare-delete-expired', '* * * * *', 'select public.delete_expired_codes();');

-- 7) Optional seed rows (each lives 1 hour)
-- insert into public.codes (title, slot1, slot2, slot3, slot4, owner_token) values
--   ('Castle Build Friday', 'steve', 'cookie', 'pickaxe', 'panda', 'seed'),
--   ('Science Lab 101', 'agent', 'map', 'apple', 'bucket', 'seed');
