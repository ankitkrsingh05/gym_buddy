-- GainLab sync schema. Run once in Supabase → SQL Editor.
-- One generic table holds every record type; row-level security keeps each user's data private.

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tbl text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at bigint not null,                      -- client timestamp (ms) for last-write-wins
  server_updated_at timestamptz not null default now(), -- server timestamp for incremental pulls
  primary key (user_id, tbl, id)
);

create index if not exists records_pull_idx on public.records (user_id, server_updated_at);

create or replace function public.touch_server_updated_at() returns trigger language plpgsql as $$
begin
  new.server_updated_at = clock_timestamp();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
for each row execute function public.touch_server_updated_at();

alter table public.records enable row level security;

drop policy if exists "own records" on public.records;
create policy "own records" on public.records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private bucket for progress photos: each user can only touch files in their own folder.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "own photos select" on storage.objects;
drop policy if exists "own photos insert" on storage.objects;
drop policy if exists "own photos update" on storage.objects;
drop policy if exists "own photos delete" on storage.objects;
create policy "own photos select" on storage.objects for select using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos insert" on storage.objects for insert with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos update" on storage.objects for update using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
