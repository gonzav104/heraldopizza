-- public.actualizar_precios_producto(producto, precios) (U5): saves the prices of one product's variants all together
-- or not at all.
--
-- precios is a JSON array of {"id": variant uuid, "precio": positive integer or null, "actualizado_en": timestamptz}.
-- actualizado_en is the token the panel read: if any variant changed since, nothing is saved (optimistic lock). The
-- update fires the actualizado_en trigger, so the same transaction renews the token of every saved variant, and the
-- function returns the new tokens.
--
-- Everything is validated explicitly, without relying on row level security: the list shape, positive whole prices
-- (null only when written as null, never as 0), no repeated variant, and that every variant belongs to the product.
-- Any failure raises and the whole call rolls back. Error codes for the panel:
--   HP422 invalid input · HP404 variant not in the product · HP409 stale token · HP403 nothing could be written.
--
-- It runs as the caller (security invoker), so row level security still decides who may write: only administrators.
create function public.actualizar_precios_producto(p_producto uuid, p_precios jsonb)
returns table (id uuid, precio integer, actualizado_en timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_total integer;
  v_count integer;
begin
  if p_producto is null or jsonb_typeof(p_precios) is distinct from 'array' or jsonb_array_length(p_precios) = 0 then
    raise exception using errcode = 'HP422', message = 'precios must be a non-empty array';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_precios) e
    where jsonb_typeof(e) <> 'object' or not (e ? 'id' and e ? 'precio' and e ? 'actualizado_en')
  ) then
    raise exception using errcode = 'HP422', message = 'every entry needs id, precio, and actualizado_en';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_precios) e
    where not (
      jsonb_typeof(e -> 'precio') = 'null'
      or (
        jsonb_typeof(e -> 'precio') = 'number'
        and (e ->> 'precio')::numeric = trunc((e ->> 'precio')::numeric)
        and (e ->> 'precio')::numeric between 1 and 2147483647
      )
    )
  ) then
    raise exception using errcode = 'HP422', message = 'prices must be positive whole pesos or null';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_precios) e
    where jsonb_typeof(e -> 'id') <> 'string' or jsonb_typeof(e -> 'actualizado_en') <> 'string'
  ) then
    raise exception using errcode = 'HP422', message = 'id and actualizado_en must be text';
  end if;

  begin
    select array_agg((e ->> 'id')::uuid), count(*) into v_ids, v_total from jsonb_array_elements(p_precios) e;
    perform (e ->> 'actualizado_en')::timestamptz from jsonb_array_elements(p_precios) e;
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception using errcode = 'HP422', message = 'id must be a uuid and actualizado_en a timestamp';
  end;

  if (select count(distinct x) from unnest(v_ids) x) <> v_total then
    raise exception using errcode = 'HP422', message = 'the same variant appears more than once';
  end if;

  -- Ownership, checked explicitly, and the rows locked until the transaction ends.
  select count(*) into v_count
  from (
    select v.id from public.variantes v
    where v.id = any (v_ids) and v.producto_id = p_producto
    for update
  ) owned;
  if v_count <> v_total then
    raise exception using errcode = 'HP404', message = 'a variant does not belong to the product';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_precios) e
    join public.variantes v on v.id = (e ->> 'id')::uuid
    where v.actualizado_en is distinct from (e ->> 'actualizado_en')::timestamptz
  ) then
    raise exception using errcode = 'HP409', message = 'a variant changed since it was read';
  end if;

  update public.variantes v
  set precio = (e ->> 'precio')::numeric::integer
  from jsonb_array_elements(p_precios) e
  where v.id = (e ->> 'id')::uuid and v.producto_id = p_producto;
  get diagnostics v_count = row_count;
  if v_count <> v_total then
    raise exception using errcode = 'HP403', message = 'not every variant could be written';
  end if;

  return query
    select v.id, v.precio, v.actualizado_en from public.variantes v where v.id = any (v_ids) order by v.orden;
end;
$$;

comment on function public.actualizar_precios_producto(uuid, jsonb) is
  'Saves the prices of one product''s variants all together or not at all, with an optimistic lock (U5).';

revoke all on function public.actualizar_precios_producto(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.actualizar_precios_producto(uuid, jsonb) to authenticated;
