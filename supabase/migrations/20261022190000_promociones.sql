-- Promotions (P5a): the store's combos, read by the public menu and managed by the administrator.
--
-- Identity: `id` is the internal uuid; `codigo` is the commercial code the public menu and saved carts use
-- (Promotion.id in the app). The eight original codes, such as promo-docena-eleccion, come from the seed unchanged.
-- New promotions get a generated promo- code; nobody chooses or changes a code (column privileges and a trigger).
--
-- Validity is evaluated in PostgreSQL with Argentina's clock, written inline in the public read policy so the public
-- roles need nothing on privado. No images and no deletes: a promotion is switched off with `visible`.

-- Weekdays go from 0 (Sunday) to 6 (Saturday), as in extract(dow) and JavaScript's getDay(); at least one, no repeats.
create function privado.dias_validos(dias smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(dias) between 1 and 7
    and (select count(distinct d) from unnest(dias) as d) = cardinality(dias)
    and (select bool_and(d between 0 and 6) from unnest(dias) as d);
$$;
revoke all on function privado.dias_validos(smallint[]) from public;
-- Only the administrator writes promotions; the check runs with the writer's privileges.
grant execute on function privado.dias_validos(smallint[]) to authenticated;

create function privado.codigo_inmutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.codigo is distinct from old.codigo then
    raise exception 'El código de una promoción no se puede cambiar.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function privado.codigo_inmutable() from public;

create table public.promociones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null default ('promo-' || replace(gen_random_uuid()::text, '-', ''))
    constraint promociones_codigo_formato check (codigo ~ '^promo-[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null constraint promociones_titulo_no_vacio check (length(btrim(titulo)) > 0),
  descripcion text constraint promociones_descripcion_no_vacia check (descripcion is null or length(btrim(descripcion)) > 0),
  -- Whole Argentine pesos (RN-02), never missing: a promotion always has its own price (RN-13).
  precio integer not null constraint promociones_precio_positivo check (precio > 0),
  visible boolean not null default true,
  orden integer not null,
  -- Null dates mean no limit; both ends are included.
  vigente_desde date,
  vigente_hasta date,
  -- Null means every day.
  dias_semana smallint[] constraint promociones_dias_validos check (dias_semana is null or privado.dias_validos(dias_semana)),
  -- A combo the customer fills in. The menu has a single configurator, the dozen of empanadas to choose, so the
  -- only flavor choice allowed is 12 units of the Empanadas category, by its stable id from the authorized catalog
  -- (docs/seed_catalogo.sql), never by name. Any other configurator needs an explicit change of schema and frontend.
  eleccion_categoria_id uuid references public.categorias (id) on delete restrict
    constraint promociones_eleccion_empanadas check (eleccion_categoria_id is null or eleccion_categoria_id = 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4'),
  eleccion_unidades integer constraint promociones_eleccion_docena check (eleccion_unidades is null or eleccion_unidades = 12),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint promociones_codigo_unico unique (codigo),
  constraint promociones_vigencia_ordenada check (vigente_desde is null or vigente_hasta is null or vigente_desde <= vigente_hasta),
  constraint promociones_eleccion_completa check ((eleccion_categoria_id is null) = (eleccion_unidades is null))
);
create index promociones_eleccion_categoria_id_idx on public.promociones (eleccion_categoria_id)
  where eleccion_categoria_id is not null;
comment on column public.promociones.codigo is
  'Commercial code (Promotion.id in the app, kept in saved carts). Generated for new promotions; never changes.';
comment on column public.promociones.visible is
  'Switched off promotions stay in the table for the administrator and are never shown on the public menu.';

create trigger promociones_actualizado_en before update on public.promociones
  for each row execute function privado.tocar_actualizado_en();
create trigger promociones_codigo_inmutable before update of codigo on public.promociones
  for each row execute function privado.codigo_inmutable();

alter table public.promociones enable row level security;
revoke all on table public.promociones from anon, authenticated;

-- Everyone may read (the policies filter). Only signed-in users may write, through the columns below, and the
-- policies let only administrators do it. No role may delete, and no role may set or change the code. The flavor
-- choice is set only when a promotion is created: what a combo is made of never changes afterwards.
grant select on table public.promociones to anon, authenticated;
grant insert (titulo, descripcion, precio, visible, orden, vigente_desde, vigente_hasta, dias_semana, eleccion_categoria_id, eleccion_unidades)
  on table public.promociones to authenticated;
grant update (titulo, descripcion, precio, visible, orden, vigente_desde, vigente_hasta, dias_semana)
  on table public.promociones to authenticated;

-- Public read: visible, within its dates and weekdays on Argentina's clock, and never a combo whose flavor category
-- is hidden (its configurator would have nothing to offer). Inline on purpose: no function, nothing on privado.
create policy "promociones: lectura pública de las vigentes"
  on public.promociones for select to anon, authenticated
  using (
    visible
    and (vigente_desde is null or vigente_desde <= (now() at time zone 'America/Argentina/Buenos_Aires')::date)
    and (vigente_hasta is null or vigente_hasta >= (now() at time zone 'America/Argentina/Buenos_Aires')::date)
    and (dias_semana is null
      or extract(dow from now() at time zone 'America/Argentina/Buenos_Aires')::smallint = any (dias_semana))
    and (eleccion_categoria_id is null
      or exists (select 1 from public.categorias c where c.id = eleccion_categoria_id and c.visible))
  );

-- Administrators: read every promotion, active or not; add and change them. No delete policy on purpose.
create policy "promociones: lectura del administrador" on public.promociones
  for select to authenticated using ((select privado.es_admin()));
create policy "promociones: alta del administrador" on public.promociones
  for insert to authenticated with check ((select privado.es_admin()));
create policy "promociones: cambios del administrador" on public.promociones
  for update to authenticated using ((select privado.es_admin())) with check ((select privado.es_admin()));
