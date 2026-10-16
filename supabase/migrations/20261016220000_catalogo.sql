-- Catalog schema (U3a). Table and column names match docs/seed_catalogo.sql, the authority for the data.
-- Schema only: the initial data loads separately, from the seed, and only on the local stack.
--
-- Every table is born with row level security on and with no privileges for the API roles. Supabase grants
-- anon and authenticated everything on new tables in public by default; revoking here means that applying this
-- migration alone never exposes or opens anything. The next migration grants exactly what each role needs.

-- Internal helpers live outside the schemas the API exposes (only public and graphql_public are exposed).
create schema privado;
revoke all on schema privado from public;

create function privado.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;
revoke all on function privado.tocar_actualizado_en() from public;

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null constraint categorias_nombre_no_vacio check (length(btrim(nombre)) > 0),
  orden integer not null,
  recargo_envio boolean not null default false,
  visible boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint categorias_nombre_unico unique (nombre)
);
comment on column public.categorias.recargo_envio is
  'Each item of this category adds the per-item delivery surcharge (RF-62).';
comment on column public.categorias.visible is
  'Hidden categories, and their products, are not shown on the public menu (RF-31).';

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  nombre text not null constraint productos_nombre_no_vacio check (length(btrim(nombre)) > 0),
  descripcion text,
  solo_por_encargo boolean not null default false,
  aviso_encargo text,
  sin_stock boolean not null default false,
  visible boolean not null default true,
  orden integer not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- A made-to-order product always tells the customer how much notice it needs (RF-06, RF-35, RN-07).
  constraint productos_encargo_con_aviso
    check (not solo_por_encargo or length(btrim(coalesce(aviso_encargo, ''))) > 0)
);
create index productos_categoria_id_idx on public.productos (categoria_id);
comment on column public.productos.sin_stock is
  'Out of stock: still shown, never orderable (RF-05, RN-06).';

create table public.variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  nombre text not null constraint variantes_nombre_no_vacio check (length(btrim(nombre)) > 0),
  -- Whole Argentine pesos (RN-02). NULL means the price is not published.
  precio integer constraint variantes_precio_positivo check (precio is null or precio > 0),
  orden integer not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint variantes_nombre_unico_por_producto unique (producto_id, nombre)
);
comment on column public.variantes.precio is
  'Whole ARS (RN-02). NULL = not published: shown as "Consultar en barra" and never orderable. Never read it as 0.';

create trigger categorias_actualizado_en before update on public.categorias
  for each row execute function privado.tocar_actualizado_en();
create trigger productos_actualizado_en before update on public.productos
  for each row execute function privado.tocar_actualizado_en();
create trigger variantes_actualizado_en before update on public.variantes
  for each row execute function privado.tocar_actualizado_en();

alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.variantes enable row level security;

revoke all on table public.categorias, public.productos, public.variantes from anon, authenticated;
