-- Crest Foundry — link-only ("unlisted") sharing.
-- Run in the Supabase dashboard → SQL Editor.

-- 1) Sharing state on each design. share_token is the unguessable link key.
alter table public.designs
  add column if not exists share_token text unique,
  add column if not exists is_shared boolean not null default false,
  add column if not exists shared_at timestamptz;

-- 2) Public read is link-only, via a SECURITY DEFINER function that returns
--    ONLY the single row matching the token (and only if it's shared). The
--    table itself stays owner-only (existing RLS) — so shared designs can't be
--    enumerated, and owner_id is never exposed.
create or replace function public.get_shared_design(token text)
returns table (id uuid, title text, config jsonb, thumbnail_url text, shared_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select id, title, config, thumbnail_url, shared_at
  from public.designs
  where share_token = token and is_shared = true
$$;

-- Anyone (signed in or not) may resolve a share link.
grant execute on function public.get_shared_design(text) to anon, authenticated;
