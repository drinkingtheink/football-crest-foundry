-- Crest Foundry — v1 backend: cloud save (designs table + owner-scoped RLS)
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.

create table if not exists public.designs (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users on delete cascade,
  title        text,
  config       jsonb not null,
  thumbnail_url text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Fast "my designs, newest first" listing.
create index if not exists designs_owner_updated_idx
  on public.designs (owner_id, updated_at desc);

-- Authorization model: a row is visible/mutable only by its owner.
alter table public.designs enable row level security;

drop policy if exists "designs owner select" on public.designs;
drop policy if exists "designs owner insert" on public.designs;
drop policy if exists "designs owner update" on public.designs;
drop policy if exists "designs owner delete" on public.designs;

create policy "designs owner select" on public.designs
  for select using (auth.uid() = owner_id);
create policy "designs owner insert" on public.designs
  for insert with check (auth.uid() = owner_id);
create policy "designs owner update" on public.designs
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "designs owner delete" on public.designs
  for delete using (auth.uid() = owner_id);

-- Auto-bump updated_at on every update (cleaner than trusting the client).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists designs_touch_updated_at on public.designs;
create trigger designs_touch_updated_at
  before update on public.designs
  for each row execute function public.touch_updated_at();
