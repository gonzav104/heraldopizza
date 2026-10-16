-- Inventory of the catalog's policies and API-role privileges, plus attempts to change the schema itself.
--
-- authenticated holds write privileges on the catalog by design, so RLS alone stops a non-administrator. Pinning the
-- exact set of policies and grants makes any unplanned policy or privilege fail here instead of silently opening
-- writes. Runs on the local stack only (supabase test db); every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select results_eq(
  $$select fila from (
      select (tablename::text collate "default") || ' | ' || (policyname::text collate "default") as fila from pg_policies where schemaname = 'public'
    ) t order by fila collate "C"$$,
  array[
    'categorias | categorias: alta del administrador',
    'categorias | categorias: baja del administrador',
    'categorias | categorias: cambios del administrador',
    'categorias | categorias: lectura del administrador',
    'categorias | categorias: lectura pública de las visibles',
    'productos | productos: alta del administrador',
    'productos | productos: baja del administrador',
    'productos | productos: cambios del administrador',
    'productos | productos: lectura del administrador',
    'productos | productos: lectura pública de los visibles',
    'variantes | variantes: alta del administrador',
    'variantes | variantes: baja del administrador',
    'variantes | variantes: cambios del administrador',
    'variantes | variantes: lectura del administrador',
    'variantes | variantes: lectura pública de las de productos visibles'
  ],
  'public holds exactly the planned policies, and no other'
);

select results_eq(
  $$select fila from (
      select (grantee::text collate "default") || ' ' || (table_name::text collate "default") || ' '
        || (privilege_type::text collate "default") as fila
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
    ) t order by fila collate "C"$$,
  array[
    'anon categorias SELECT', 'anon productos SELECT', 'anon variantes SELECT',
    'authenticated categorias DELETE', 'authenticated categorias INSERT',
    'authenticated categorias SELECT', 'authenticated categorias UPDATE',
    'authenticated productos DELETE', 'authenticated productos INSERT',
    'authenticated productos SELECT', 'authenticated productos UPDATE',
    'authenticated variantes DELETE', 'authenticated variantes INSERT',
    'authenticated variantes SELECT', 'authenticated variantes UPDATE'
  ],
  'the API roles hold exactly the planned table privileges (none on administradores)'
);

select is(
  (select count(*)::int from pg_tables
    where schemaname = 'public' and tablename in ('categorias', 'productos', 'variantes', 'administradores')
      and rowsecurity),
  4,
  'row level security is on for the four tables'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'privado' and p.proname = 'es_admin' and p.prosecdef
      and p.proconfig @> array['search_path=""']),
  1,
  'es_admin() is security definer with an empty search_path'
);

-- A signed-in user who is not an administrator cannot change the schema or switch RLS off.
insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000b2', 'cliente@example.test');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$create table public.intrusa (id int)$$, '42501', null, 'a non-admin cannot create tables in public');
select throws_ok(
  $$create function public.intrusa() returns int language sql as 'select 1'$$,
  '42501', null, 'a non-admin cannot create functions in public'
);
select throws_ok($$create schema intrusa$$, '42501', null, 'a non-admin cannot create schemas');
select throws_ok($$create table privado.administradores (user_id uuid)$$, '42501', null, 'a non-admin cannot plant objects in privado');
select throws_ok(
  $$alter table public.variantes disable row level security$$,
  '42501', null, 'a non-admin cannot switch row level security off'
);
select throws_ok(
  $$create policy intrusa on public.variantes for update to authenticated using (true)$$,
  '42501', null, 'a non-admin cannot add a policy'
);
select throws_ok($$truncate public.variantes$$, '42501', null, 'a non-admin cannot truncate the catalog');

-- es_admin() ignores the caller's search_path and claims without a subject.
set local search_path = public, extensions;
select is(privado.es_admin(), false, 'es_admin() stays false whatever the caller search_path is');
select set_config('request.jwt.claims', '{}', true);
select is(privado.es_admin(), false, 'es_admin() is false for claims without a subject');
reset role;

select * from finish();
rollback;
