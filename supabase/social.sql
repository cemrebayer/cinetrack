-- schema.sql sonrasında bir kez çalıştırın. İstemciye service_role anahtarı verilmez.
begin;
create table public.social_profiles (id uuid primary key references auth.users(id) on delete cascade, handle text unique not null check(handle ~ '^[a-z0-9_]{3,30}$'));
create table public.follows (follower_id uuid references public.social_profiles(id) on delete cascade,following_id uuid references public.social_profiles(id) on delete cascade,primary key(follower_id,following_id),check(follower_id<>following_id));
create table public.shared_lists (id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,name text not null check(length(trim(name)) between 1 and 120));
create table public.list_members(list_id uuid references public.shared_lists(id) on delete cascade,user_id uuid references public.social_profiles(id) on delete cascade,primary key(list_id,user_id));
create table public.shared_list_items(list_id uuid references public.shared_lists(id) on delete cascade,media_id text,media jsonb not null,primary key(list_id,media_id),check(media ?& array['id','type','title','tmdbId','posterPath','runtimeMinutes','genres','releaseYear'] and jsonb_typeof(media->'title')='string' and jsonb_typeof(media->'genres')='array' and jsonb_typeof(media)='object' and media->>'id'=media_id and media->>'type' in ('movie','tv') and length(media->>'title')>0));
create index follows_reverse on public.follows(following_id);
create index member_user on public.list_members(user_id);
alter table public.social_profiles enable row level security;
alter table public.follows enable row level security;
alter table public.shared_lists enable row level security;
alter table public.list_members enable row level security;
alter table public.shared_list_items enable row level security;
create function public.can_access_list(p_list uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.shared_lists where id=p_list and owner_id=auth.uid()) or exists(select 1 from public.list_members where list_id=p_list and user_id=auth.uid()));
$$;
create function public.owns_list(p_list uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.shared_lists where id=p_list and owner_id=auth.uid());$$;
create policy profile_read on public.social_profiles for select to authenticated using(true);
create policy profile_insert on public.social_profiles for insert to authenticated with check(id=auth.uid());
create policy profile_update on public.social_profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy follows_read on public.follows for select to authenticated using(follower_id=auth.uid() or following_id=auth.uid());
create policy follows_insert on public.follows for insert to authenticated with check(follower_id=auth.uid());
create policy follows_delete on public.follows for delete to authenticated using(follower_id=auth.uid());
create policy lists_read on public.shared_lists for select to authenticated using(public.can_access_list(id));
create policy lists_rename on public.shared_lists for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy members_read on public.list_members for select to authenticated using(public.can_access_list(list_id));
create policy members_remove on public.list_members for delete to authenticated using(public.owns_list(list_id) or user_id=auth.uid());
create policy items_read on public.shared_list_items for select to authenticated using(public.can_access_list(list_id));
create policy items_insert on public.shared_list_items for insert to authenticated with check(public.can_access_list(list_id));
create policy items_update on public.shared_list_items for update to authenticated using(public.can_access_list(list_id)) with check(public.can_access_list(list_id));
create policy items_delete on public.shared_list_items for delete to authenticated using(public.can_access_list(list_id));
create function public.publish_shared_list(p_name text,p_items jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Giriş yapmalısın.';end if;
 if jsonb_typeof(p_items)<>'array' then raise exception 'Geçersiz liste.';end if;
 insert into public.shared_lists(owner_id,name) values(auth.uid(),trim(p_name)) returning id into new_id;
 insert into public.shared_list_items(list_id,media_id,media) select new_id,item->>'id',item from jsonb_array_elements(p_items) item on conflict do nothing;
 return new_id;
end;$$;
create function public.invite_list_friend(p_list uuid,p_handle text) returns void language plpgsql security definer set search_path='' as $$
declare friend_id uuid;
begin
 if not public.owns_list(p_list) then raise exception 'Yalnızca liste sahibi arkadaş ekleyebilir.';end if;
 select id into friend_id from public.social_profiles where handle=lower(trim(p_handle));
 if friend_id is null or not exists(select 1 from public.follows where follower_id=auth.uid() and following_id=friend_id) or not exists(select 1 from public.follows where follower_id=friend_id and following_id=auth.uid()) then raise exception 'Ortak liste için önce karşılıklı takipleşmelisiniz.';end if;
 insert into public.list_members(list_id,user_id) values(p_list,friend_id) on conflict do nothing;
end;$$;
create function public.get_list_members(p_list uuid) returns table(id uuid,handle text) language sql stable security definer set search_path='' as $$select p.id,p.handle from public.social_profiles p join public.list_members m on m.user_id=p.id where m.list_id=p_list and public.can_access_list(p_list) order by p.handle;$$;
revoke all on public.social_profiles,public.follows,public.shared_lists,public.list_members,public.shared_list_items from anon,authenticated;
grant select,insert on public.social_profiles to authenticated;
grant update(handle) on public.social_profiles to authenticated;
grant select,insert,delete on public.follows to authenticated;
grant select on public.shared_lists to authenticated;
grant update(name) on public.shared_lists to authenticated;
grant select,delete on public.list_members to authenticated;
grant select,insert,delete on public.shared_list_items to authenticated;
grant update(media) on public.shared_list_items to authenticated;
revoke all on function public.can_access_list(uuid),public.owns_list(uuid),public.publish_shared_list(text,jsonb),public.invite_list_friend(uuid,text),public.get_list_members(uuid) from public,anon;
grant execute on function public.can_access_list(uuid),public.owns_list(uuid),public.publish_shared_list(text,jsonb),public.invite_list_friend(uuid,text),public.get_list_members(uuid) to authenticated;
create function public.put_list_item(p_list uuid,p_media jsonb) returns void language sql security invoker set search_path='' as $$
 insert into public.shared_list_items(list_id,media_id,media) values(p_list,p_media->>'id',p_media) on conflict(list_id,media_id) do update set media=excluded.media;
$$;
revoke all on function public.put_list_item(uuid,jsonb) from public,anon;
grant execute on function public.put_list_item(uuid,jsonb) to authenticated;
commit;
