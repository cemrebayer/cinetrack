-- ONLY isolated disposable PostgreSQL: bootstrap auth.users with UUIDs 1,2,3 first.
-- Transaction rolls back all test fixtures. Run as database owner after social.sql.
\set ON_ERROR_STOP on
begin;
insert into public.social_profiles values ('00000000-0000-0000-0000-000000000001','owner'),('00000000-0000-0000-0000-000000000002','friend'),('00000000-0000-0000-0000-000000000003','outsider');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.publish_shared_list('Test', '[]') as list_id \gset
select set_config('test.list', :'list_id', true);
insert into public.follows values(auth.uid(),'00000000-0000-0000-0000-000000000002');
do $$begin
 begin
 perform public.invite_list_friend(current_setting('test.list')::uuid,'friend');
 raise exception 'One-way follow incorrectly allowed';
 exception when raise_exception then
 if SQLERRM not like 'Ortak liste%' then raise; end if;
 end;
end$$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
insert into public.follows values(auth.uid(),'00000000-0000-0000-0000-000000000001');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.invite_list_friend(:'list_id','friend');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$declare n int; m jsonb; begin
 if not public.can_access_list(current_setting('test.list')::uuid) then raise exception 'Member cannot access';end if;
 m='{"id":"movie-1","type":"movie","title":"Film","tmdbId":1,"posterPath":"","runtimeMinutes":100,"genres":[],"releaseYear":2026}'::jsonb;
 perform public.put_list_item(current_setting('test.list')::uuid,m);
 perform public.put_list_item(current_setting('test.list')::uuid,m);
 select count(*) into n from public.shared_list_items;
 if n<>1 then raise exception 'Upsert failed';end if;
 update public.shared_lists set name='Hacked' where id=current_setting('test.list')::uuid;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Member renamed list';end if;
 begin
 perform public.invite_list_friend(current_setting('test.list')::uuid,'outsider');
 raise exception 'Member invited outsider';
 exception when raise_exception then
 if SQLERRM not like 'Yalnızca%' then raise;end if;
 end;
end$$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$begin
 if exists(select 1 from public.shared_lists) or exists(select 1 from public.shared_list_items) or exists(select 1 from public.get_list_members(current_setting('test.list')::uuid)) then raise exception 'Outsider read private list';end if;
 begin
 perform public.put_list_item(current_setting('test.list')::uuid,'{"id":"tv-2","type":"tv","title":"TV","tmdbId":2,"posterPath":"","runtimeMinutes":45,"genres":[],"releaseYear":2026}');
 raise exception 'Outsider wrote to list';
 exception when insufficient_privilege then null;end;
end$$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
update public.shared_lists set name='Renamed' where id=:'list_id';
delete from public.list_members where list_id=:'list_id';
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 if public.can_access_list(current_setting('test.list')::uuid) then raise exception 'Revocation failed';end if;
end$$;
rollback;
\echo 'Social RLS tests passed'
