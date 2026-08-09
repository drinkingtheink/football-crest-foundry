-- Crest Foundry — make the local→cloud import idempotent so it can never
-- create duplicate rows, even if re-run.
-- Run in the Supabase dashboard → SQL Editor.

-- 1) Remember which local snapshot each migrated row came from.
alter table public.designs
  add column if not exists source_local_id text;

-- 2) At most one row per (owner, local snapshot). NULLs are distinct, so
--    normal manual saves (source_local_id = null) are unaffected — a user can
--    still have many of those. This is what the client's upsert conflicts on.
create unique index if not exists designs_owner_source_local_uniq
  on public.designs (owner_id, source_local_id);
