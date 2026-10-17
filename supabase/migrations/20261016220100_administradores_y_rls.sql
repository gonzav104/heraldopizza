-- Administrator list, the es_admin() check, and the row level security of the catalog (U3a).
--
-- Who is an administrator is decided only by public.administradores, never by JWT claims or user metadata, which the
-- user can influence. The table has RLS on and no policies, and the API roles hold no privileges on it, so nobody
-- can read it or add themselves through the API. Rows are added by hand, per environment (RF-28).

create table public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now()
);
alter table public.administradores enable row level security;
revoke all on table public.administradores from anon, authenticated;

-- security definer so policies can consult administradores without the caller holding any privilege on it.
-- search_path is empty and every name is schema-qualified, so a caller cannot redirect the lookup.
create function privado.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores a where a.user_id = (select auth.uid())
  );
$$;
revoke all on function privado.es_admin() from public, anon;
grant usage on schema privado to authenticated;
grant execute on function privado.es_admin() to authenticated;

-- Privileges: everyone may read (policies then filter); only signed-in users hold write privileges, and the
-- policies below let only administrators use them. anon holds no write privilege at all.
grant select on table public.categorias, public.productos, public.variantes to anon, authenticated;
grant insert, update, delete on table public.categorias, public.productos, public.variantes to authenticated;

-- Public reads never call es_admin(): visibility alone decides what the menu shows.
create policy "categorias: lectura pública de las visibles"
  on public.categorias for select to anon, authenticated
  using (visible);

create policy "productos: lectura pública de los visibles"
  on public.productos for select to anon, authenticated
  using (
    visible
    and exists (select 1 from public.categorias c where c.id = categoria_id and c.visible)
  );

create policy "variantes: lectura pública de las de productos visibles"
  on public.variantes for select to anon, authenticated
  using (
    exists (
      select 1
      from public.productos p
      join public.categorias c on c.id = p.categoria_id
      where p.id = producto_id and p.visible and c.visible
    )
  );

-- Administrators: full access. (select ...) lets Postgres evaluate es_admin() once per statement.
create policy "categorias: lectura del administrador" on public.categorias
  for select to authenticated using ((select privado.es_admin()));
create policy "categorias: alta del administrador" on public.categorias
  for insert to authenticated with check ((select privado.es_admin()));
create policy "categorias: cambios del administrador" on public.categorias
  for update to authenticated using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "categorias: baja del administrador" on public.categorias
  for delete to authenticated using ((select privado.es_admin()));

create policy "productos: lectura del administrador" on public.productos
  for select to authenticated using ((select privado.es_admin()));
create policy "productos: alta del administrador" on public.productos
  for insert to authenticated with check ((select privado.es_admin()));
create policy "productos: cambios del administrador" on public.productos
  for update to authenticated using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "productos: baja del administrador" on public.productos
  for delete to authenticated using ((select privado.es_admin()));

create policy "variantes: lectura del administrador" on public.variantes
  for select to authenticated using ((select privado.es_admin()));
create policy "variantes: alta del administrador" on public.variantes
  for insert to authenticated with check ((select privado.es_admin()));
create policy "variantes: cambios del administrador" on public.variantes
  for update to authenticated using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "variantes: baja del administrador" on public.variantes
  for delete to authenticated using ((select privado.es_admin()));
