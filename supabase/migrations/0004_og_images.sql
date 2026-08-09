-- Crest Foundry — social preview (OG) images for shared crests.
-- Run in the Supabase dashboard → SQL Editor.

-- 1) Public URL of the generated OG preview image for a design.
alter table public.designs add column if not exists og_image_url text;

-- 2) Include og_image_url in the link-only lookup (return type changes, so drop first).
drop function if exists public.get_shared_design(text);
create function public.get_shared_design(token text)
returns table (id uuid, title text, config jsonb, thumbnail_url text, og_image_url text, shared_at timestamptz)
language sql security definer set search_path = public as $$
  select id, title, config, thumbnail_url, og_image_url, shared_at
  from public.designs
  where share_token = token and is_shared = true
$$;
grant execute on function public.get_shared_design(text) to anon, authenticated;

-- 3) Public bucket to hold the generated OG images.
insert into storage.buckets (id, name, public)
values ('og-images', 'og-images', true)
on conflict (id) do nothing;

-- 4) Storage RLS: anyone can read (it's public); signed-in users can write.
drop policy if exists "og images public read" on storage.objects;
drop policy if exists "og images auth write" on storage.objects;
drop policy if exists "og images auth update" on storage.objects;

create policy "og images public read" on storage.objects
  for select using (bucket_id = 'og-images');
create policy "og images auth write" on storage.objects
  for insert to authenticated with check (bucket_id = 'og-images');
create policy "og images auth update" on storage.objects
  for update to authenticated using (bucket_id = 'og-images');
