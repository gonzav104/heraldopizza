-- public.actualizar_precios_producto(producto, precios): saves the prices of one product's variants all together or
-- not at all, with an optimistic lock per variant. Runs on the local stack only; every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

-- Shape and privileges.
select has_function('public', 'actualizar_precios_producto', array['uuid', 'jsonb'], 'the function exists');
select is(
  (select p.prosecdef from pg_proc p where p.oid = 'public.actualizar_precios_producto(uuid,jsonb)'::regprocedure),
  false,
  'it is security invoker, so row level security applies to the caller'
);
select is(
  (select p.proconfig from pg_proc p where p.oid = 'public.actualizar_precios_producto(uuid,jsonb)'::regprocedure),
  array['search_path=""'],
  'it runs with an empty search_path'
);
select results_eq(
  $$select (case a.grantee when 0 then 'PUBLIC' else a.grantee::regrole::text end) collate "default"
    from pg_proc p, aclexplode(p.proacl) a
    where p.oid = 'public.actualizar_precios_producto(uuid,jsonb)'::regprocedure
      and a.grantee <> p.proowner and a.privilege_type = 'EXECUTE'$$,
  array['authenticated'],
  'besides its owner, only authenticated may execute it'
);

-- Fixtures: the seed's Muzzarella (Entera, Media) and a variant of another product.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'cliente@example.test');
insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000a1');
create temporary table muzza as
  select p.id as producto,
    (select v.id from public.variantes v where v.producto_id = p.id and v.nombre = 'Entera') as entera,
    (select v.id from public.variantes v where v.producto_id = p.id and v.nombre = 'Media') as media
  from public.productos p where p.nombre = 'Muzzarella';
create temporary table ajena as
  select v.id from public.variantes v join public.productos p on p.id = v.producto_id
  where p.nombre = 'Especial' and v.nombre = 'Entera';
grant select on muzza, ajena to anon, authenticated;

create function pg_temp.precios(p_entera jsonb, p_media jsonb) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('id', m.entera, 'precio', p_entera,
      'actualizado_en', (select v.actualizado_en from public.variantes v where v.id = m.entera)),
    jsonb_build_object('id', m.media, 'precio', p_media,
      'actualizado_en', (select v.actualizado_en from public.variantes v where v.id = m.media)))
  from muzza m
$$;
create function pg_temp.estado() returns text language sql as $$
  select string_agg(v.nombre || '=' || coalesce(v.precio::text, 'null'), ',' order by v.nombre)
  from public.variantes v join muzza m on v.producto_id = m.producto
$$;
grant execute on function pg_temp.precios(jsonb, jsonb), pg_temp.estado() to anon, authenticated;

select is(pg_temp.estado(), 'Entera=16000,Media=10500', 'the seed prices of Muzzarella');

-- Anonymous visitors cannot call it at all.
set local role anon;
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('1'::jsonb, '1'::jsonb))$$,
  '42501', null, 'anon cannot execute it'
);
reset role;

-- A signed-in user without the administrator role changes nothing.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('17000'::jsonb, '11000'::jsonb))$$,
  null, null, 'a non-admin gets an error'
);
select is(pg_temp.estado(), 'Entera=16000,Media=10500', 'and the prices are unchanged');
reset role;

-- The administrator.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

-- Validation errors (HP422), each one leaving everything as it was.
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), '[]'::jsonb)$$,
  'HP422', null, 'an empty list is rejected'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), '{"id":"x"}'::jsonb)$$,
  'HP422', null, 'a value that is not a list is rejected'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza),
    jsonb_build_array(jsonb_build_object('id', (select entera from muzza), 'precio', 17000)))$$,
  'HP422', null, 'an entry without its actualizado_en is rejected'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza),
    pg_temp.precios('17000'::jsonb, '11000'::jsonb) - 1 ||
    jsonb_build_array(jsonb_build_object('id', (select entera from muzza), 'actualizado_en', now())))$$,
  'HP422', null, 'an entry without a precio key is rejected (null must be explicit)'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('0'::jsonb, '11000'::jsonb))$$,
  'HP422', null, 'a price of 0 is rejected'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('-100'::jsonb, '11000'::jsonb))$$,
  'HP422', null, 'a negative price is rejected'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('16000.5'::jsonb, '11000'::jsonb))$$,
  'HP422', null, 'a decimal price is rejected'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('"16000"'::jsonb, '11000'::jsonb))$$,
  'HP422', null, 'a price written as text is rejected'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('3000000000'::jsonb, '11000'::jsonb))$$,
  'HP422', null, 'a price beyond the integer range is rejected'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza),
    pg_temp.precios('17000'::jsonb, '11000'::jsonb) - 1 || (pg_temp.precios('17000'::jsonb, '11000'::jsonb) -> 0))$$,
  'HP422', null, 'the same variant twice is rejected'
);
select is(pg_temp.estado(), 'Entera=16000,Media=10500', 'no validation error changed anything');

-- Ownership is checked explicitly (HP404): a variant of another product, or an unknown id.
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza),
    (pg_temp.precios('17000'::jsonb, '11000'::jsonb) - 1) || jsonb_build_array(jsonb_build_object(
      'id', (select id from ajena), 'precio', 1,
      'actualizado_en', (select v.actualizado_en from public.variantes v where v.id = (select id from ajena)))))$$,
  'HP404', null, 'a variant of another product is rejected, with the valid one in the same call'
);
select throws_ok(
  $$select * from public.actualizar_precios_producto((select producto from muzza),
    jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'precio', 1, 'actualizado_en', now())))$$,
  'HP404', null, 'an unknown variant is rejected'
);
select is(pg_temp.estado(), 'Entera=16000,Media=10500', 'the valid variant in the rejected call was not saved');
select is(
  (select v.precio from public.variantes v where v.id = (select id from ajena)),
  23600,
  'and the other product kept its price'
);

-- Optimistic lock (HP409): one stale token rolls back the whole call.
create temporary table viejo as select pg_temp.precios('17000'::jsonb, '11000'::jsonb) as precios;
grant select on viejo to authenticated;
select results_eq(
  $$select count(*)::int from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('17000'::jsonb, '11000'::jsonb))$$,
  array[2],
  'the administrator saves both prices in one call'
);
select is(pg_temp.estado(), 'Entera=17000,Media=11000', 'both prices were saved');
select ok(
  (select bool_and(v.actualizado_en > (e->>'actualizado_en')::timestamptz)
    from viejo, jsonb_array_elements(viejo.precios) e join public.variantes v on v.id = (e->>'id')::uuid),
  'the same transaction renewed the token of every saved variant'
);
select throws_ok(
  $$select r.* from viejo, public.actualizar_precios_producto((select producto from muzza),
    jsonb_set(jsonb_set(viejo.precios, '{0,precio}', '18000'), '{1,precio}', '12000')) r$$,
  'HP409', null, 'a stale token is a conflict'
);
select is(pg_temp.estado(), 'Entera=17000,Media=11000', 'the conflict saved neither price');
select throws_ok(
  $$select r.* from viejo, public.actualizar_precios_producto((select producto from muzza),
    jsonb_build_array(
      jsonb_set(pg_temp.precios('18000'::jsonb, '12000'::jsonb) -> 0, '{precio}', '18000'),
      jsonb_set(viejo.precios -> 1, '{precio}', '12000'))) r$$,
  'HP409', null, 'one fresh and one stale token is still a conflict'
);
select is(pg_temp.estado(), 'Entera=17000,Media=11000', 'and the fresh one was not saved either');

-- An explicit null publishes «Consultar en barra», and the returned rows carry the renewed tokens.
select results_eq(
  $$select precio from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('null'::jsonb, '11000'::jsonb)) order by precio nulls first$$,
  $$values (null::integer), (11000)$$,
  'an explicit null is saved as no published price, never as 0'
);
select is(pg_temp.estado(), 'Entera=null,Media=11000', 'Entera is now «Consultar en barra»');
select results_eq(
  $$select r.actualizado_en from public.actualizar_precios_producto((select producto from muzza), pg_temp.precios('16000'::jsonb, '10500'::jsonb)) r
    order by r.id$$,
  $$select v.actualizado_en from public.variantes v join muzza m on v.producto_id = m.producto order by v.id$$,
  'the function returns the tokens that are now stored'
);
select is(pg_temp.estado(), 'Entera=16000,Media=10500', 'the prices can be restored the same way');
reset role;

select * from finish();
rollback;
