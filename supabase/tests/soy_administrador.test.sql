-- public.soy_administrador(): tells the admin panel whether the signed-in user is an administrator.
-- It only shapes the interface; row level security stays the real authority over every write.
-- Runs on the local stack only (supabase test db); every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Shape: no parameters, boolean, security definer, stable, empty search_path.
select has_function('public', 'soy_administrador', array[]::text[], 'public.soy_administrador() exists without parameters');
select function_returns('public', 'soy_administrador', array[]::text[], 'boolean', 'it returns a boolean');
select is(
  (select p.prosecdef from pg_proc p where p.oid = 'public.soy_administrador()'::regprocedure),
  true,
  'it is security definer'
);
select is(
  (select p.provolatile::text from pg_proc p where p.oid = 'public.soy_administrador()'::regprocedure),
  's',
  'it is stable'
);
select is(
  (select p.proconfig from pg_proc p where p.oid = 'public.soy_administrador()'::regprocedure),
  array['search_path=""'],
  'it runs with an empty search_path'
);

-- Privileges: only authenticated may execute it; anon and PUBLIC may not.
select ok(
  not has_function_privilege('anon', 'public.soy_administrador()', 'execute'),
  'anon cannot execute it'
);
select ok(
  has_function_privilege('authenticated', 'public.soy_administrador()', 'execute'),
  'authenticated can execute it'
);
select is(
  (select count(*)::int
    from pg_proc p, aclexplode(p.proacl) a
    where p.oid = 'public.soy_administrador()'::regprocedure and a.grantee = 0),
  0,
  'PUBLIC holds no privilege on it'
);

select results_eq(
  $$select (case a.grantee when 0 then 'PUBLIC' else a.grantee::regrole::text end) collate "default"
    from pg_proc p, aclexplode(p.proacl) a
    where p.oid = 'public.soy_administrador()'::regprocedure and a.grantee <> p.proowner and a.privilege_type = 'EXECUTE'$$,
  array['authenticated'],
  'besides its owner, only authenticated may execute it (not anon, PUBLIC, or service_role)'
);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'cliente@example.test');
insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000a1');

set local role anon;
select throws_ok($$select public.soy_administrador()$$, '42501', null, 'anon gets permission denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is(public.soy_administrador(), true, 'an administrator gets true');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select is(public.soy_administrador(), false, 'a signed-in user who is not an administrator gets false');

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"service_role","app_metadata":{"role":"admin"},"user_metadata":{"es_admin":true}}',
  true
);
select is(public.soy_administrador(), false, 'admin-looking claims do not change the answer');

select set_config('request.jwt.claims', '{}', true);
select is(public.soy_administrador(), false, 'claims without a subject get false');
reset role;

-- A decoy administradores earlier in the caller's search_path does not fool it (postgres plants it, rolled back).
create schema senuelo;
create table senuelo.administradores (user_id uuid primary key);
insert into senuelo.administradores (user_id) values ('00000000-0000-4000-8000-0000000000b2');
grant usage on schema senuelo to authenticated;
grant select on table senuelo.administradores to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
set local search_path = senuelo, public, extensions;
select is(public.soy_administrador(), false, 'a decoy administradores in the caller search_path does not fool it');

-- It decides nothing: the same non-admin still cannot write, whatever the interface shows.
select throws_ok(
  $$insert into public.categorias (nombre, orden) values ('Desde la interfaz', 1)$$,
  '42501', null, 'row level security still rejects the non-admin write'
);
reset search_path;
reset role;

-- Removing the row is enough: the answer follows the table, not the session.
delete from public.administradores where user_id = '00000000-0000-4000-8000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is(public.soy_administrador(), false, 'a removed administrator gets false');
reset role;

select * from finish();
rollback;
