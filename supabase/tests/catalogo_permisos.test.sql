-- Inventory of the catalog's policies and API-role privileges, plus attempts to change the schema itself.
--
-- authenticated holds write privileges on the catalog by design, so RLS alone stops a non-administrator. Pinning the
-- exact set of policies and grants makes any unplanned policy or privilege fail here instead of silently opening
-- writes. Runs on the local stack only (supabase test db); every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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
    'promociones | promociones: alta del administrador',
    'promociones | promociones: cambios del administrador',
    'promociones | promociones: lectura del administrador',
    'promociones | promociones: lectura pública de las vigentes',
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
    'anon categorias SELECT', 'anon productos SELECT', 'anon promociones SELECT', 'anon variantes SELECT',
    'authenticated categorias DELETE', 'authenticated categorias INSERT',
    'authenticated categorias SELECT', 'authenticated categorias UPDATE',
    'authenticated productos DELETE', 'authenticated productos INSERT',
    'authenticated productos SELECT', 'authenticated productos UPDATE',
    'authenticated promociones SELECT',
    'authenticated variantes DELETE', 'authenticated variantes INSERT',
    'authenticated variantes SELECT', 'authenticated variantes UPDATE'
  ],
  'the API roles hold exactly the planned table privileges (none on administradores)'
);

-- Promotions are written through column privileges only: never codigo, id, or the timestamps; never deleted.
select results_eq(
  $$select fila from (
      select (grantee::text collate "default") || ' ' || (privilege_type::text collate "default") || ' '
        || (column_name::text collate "default") as fila
      from information_schema.role_column_grants
      where table_schema = 'public' and table_name = 'promociones' and grantee in ('anon', 'authenticated')
        and privilege_type in ('INSERT', 'UPDATE')
    ) t order by fila collate "C"$$,
  array[
    'authenticated INSERT descripcion', 'authenticated INSERT dias_semana', 'authenticated INSERT eleccion_categoria_id',
    'authenticated INSERT eleccion_unidades', 'authenticated INSERT orden', 'authenticated INSERT precio',
    'authenticated INSERT titulo', 'authenticated INSERT vigente_desde', 'authenticated INSERT vigente_hasta',
    'authenticated INSERT visible',
    'authenticated UPDATE descripcion', 'authenticated UPDATE dias_semana', 'authenticated UPDATE eleccion_categoria_id',
    'authenticated UPDATE eleccion_unidades', 'authenticated UPDATE orden', 'authenticated UPDATE precio',
    'authenticated UPDATE titulo', 'authenticated UPDATE vigente_desde', 'authenticated UPDATE vigente_hasta',
    'authenticated UPDATE visible'
  ],
  'promotions: authenticated writes only the planned columns, never codigo, id, or the timestamps'
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

-- es_admin() does not depend on a search_path the caller controls.
-- Worst case: a decoy schema, first in the caller's search_path, holds an administradores table that lists the
-- non-admin user. A real user cannot create schemas (asserted above), so postgres plants it here, inside this
-- transaction; the rollback at the end leaves nothing behind.
reset role;
create schema senuelo;
create table senuelo.administradores (user_id uuid primary key);
insert into senuelo.administradores (user_id) values ('00000000-0000-4000-8000-0000000000b2');
-- Positive control: the same check without a pinned search_path and with an unqualified table name. If this copy
-- did not return true under the decoy, a false from the real function would prove nothing.
create function senuelo.es_admin_vulnerable()
returns boolean
language sql
stable
security definer
as $$
  select exists (select 1 from administradores a where a.user_id = (select auth.uid()));
$$;
grant usage on schema senuelo to authenticated;
grant select on table senuelo.administradores to authenticated;
grant execute on function senuelo.es_admin_vulnerable() to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
set local search_path = senuelo, public, extensions;
select is(
  senuelo.es_admin_vulnerable(),
  true,
  'control: a check without a pinned search_path is fooled by the decoy administradores'
);
select is(
  privado.es_admin(),
  false,
  'es_admin() is not fooled by a decoy administradores earlier in the caller search_path'
);
select throws_ok(
  $$insert into public.categorias (nombre, orden) values ('Con señuelo', 1)$$,
  '42501', null, 'with the decoy in place, the non-admin still cannot write to the catalog'
);
reset search_path;

select set_config('request.jwt.claims', '{}', true);
select is(privado.es_admin(), false, 'es_admin() is false for claims without a subject');
reset role;

select * from finish();
rollback;
