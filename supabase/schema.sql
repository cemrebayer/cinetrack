-- Supabase SQL Editor içinde çalıştırın. İstemcide yalnızca anon/publishable key kullanın.
create table if not exists public.backups (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.backups enable row level security;
create policy "Own backup read" on public.backups for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own backup insert" on public.backups for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own backup update" on public.backups for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
