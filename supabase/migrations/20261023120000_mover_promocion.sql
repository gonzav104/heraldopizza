-- P5b: atomic reordering of promotions for the admin panel («Subir» / «Bajar»).
--
-- mover_promocion(p_promocion, p_vecina, p_tokens) swaps a promotion with its neighbor in the current order:
--   p_promocion  the promotion to move;
--   p_vecina     the promotion right before or after it, as the panel read the list;
--   p_tokens     {"<uuid>": "<actualizado_en>"} with the tokens the panel read for both.
-- The current order is (orden, codigo): codigo is unique and immutable, so it breaks ties the same way everywhere the
-- order is read (the public menu and the panel). The call locks every promotion, checks that both rows still exist,
-- are still neighbors, and still carry the tokens the panel read (optimistic lock), then renumbers 1..n in the new
-- order, writing only the rows whose position changes. It returns every promotion with its position and token, so
-- the panel shows what the database holds and never assumes success.
--
-- What the database guarantees: only administrators move promotions (es_admin() plus row level security, since the
-- function runs as the caller); a move is all or nothing; a stale view (different neighbor or token) changes nothing;
-- concurrent moves serialize on the row locks, and the second one fails with a conflict because the first changed the
-- tokens; after a move, positions are 1..n with no repeats. What it does not guarantee: unique positions at all times
-- (a create takes «last + 1» from the panel, so two concurrent creates may share one until the next move renumbers).
-- Ties are harmless because codigo breaks them. Disabling «Subir» on the first and «Bajar» on the last is the panel's.
--
-- Error codes for the panel (shared with actualizar_precios_producto):
--   HP422 invalid input · HP404 promotion not found · HP409 not neighbors anymore or stale token · HP403 not an
--   administrator, or a row could not be written.

create function public.mover_promocion(p_promocion uuid, p_vecina uuid, p_tokens jsonb)
returns table (id uuid, orden integer, actualizado_en timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_desde integer;
  v_hacia integer;
  v_cambios integer;
  v_escritas integer;
begin
  if not (select privado.es_admin()) then
    raise exception using errcode = 'HP403', message = 'only administrators reorder promotions';
  end if;
  if p_promocion is null or p_vecina is null or p_promocion = p_vecina then
    raise exception using errcode = 'HP422', message = 'a promotion and a different neighbor are required';
  end if;
  if jsonb_typeof(p_tokens) is distinct from 'object'
    or exists (select 1 from jsonb_each(p_tokens) t where jsonb_typeof(t.value) <> 'string') then
    raise exception using errcode = 'HP422', message = 'tokens must be an object of text timestamps';
  end if;
  begin
    perform (t.value #>> '{}')::timestamptz from jsonb_each(p_tokens) t;
  exception when others then
    raise exception using errcode = 'HP422', message = 'tokens must be timestamps';
  end;

  -- Every promotion, locked until the end of the transaction: a concurrent move or edit waits, then sees new tokens.
  perform 1 from public.promociones p for update;
  select array_agg(p.id order by p.orden, p.codigo) into v_ids from public.promociones p;
  v_desde := array_position(v_ids, p_promocion);
  v_hacia := array_position(v_ids, p_vecina);
  if v_desde is null or v_hacia is null then
    raise exception using errcode = 'HP404', message = 'a promotion was not found';
  end if;
  if abs(v_desde - v_hacia) <> 1 then
    raise exception using errcode = 'HP409', message = 'the promotions are not neighbors anymore';
  end if;
  if exists (
    select 1 from public.promociones p
    where p.id in (p_promocion, p_vecina)
      and p.actualizado_en is distinct from (p_tokens ->> p.id::text)::timestamptz
  ) then
    raise exception using errcode = 'HP409', message = 'a promotion changed since it was read';
  end if;

  v_ids[v_desde] := p_vecina;
  v_ids[v_hacia] := p_promocion;
  select count(*) into v_cambios
  from unnest(v_ids) with ordinality as n(id, posicion)
  join public.promociones p on p.id = n.id
  where p.orden is distinct from n.posicion;

  update public.promociones p set orden = n.posicion
  from unnest(v_ids) with ordinality as n(id, posicion)
  where p.id = n.id and p.orden is distinct from n.posicion;
  get diagnostics v_escritas = row_count;
  if v_escritas <> v_cambios then
    raise exception using errcode = 'HP403', message = 'not every promotion could be written';
  end if;

  return query select p.id, p.orden, p.actualizado_en from public.promociones p order by p.orden, p.codigo;
end;
$$;

comment on function public.mover_promocion(uuid, uuid, jsonb) is
  'Swaps a promotion with its neighbor in the order (orden, codigo), all or nothing, guarded by both tokens (P5b).';

revoke all on function public.mover_promocion(uuid, uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.mover_promocion(uuid, uuid, jsonb) to authenticated;
