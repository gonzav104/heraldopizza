-- Ordering promotions (P5b): mover_promocion() swaps a promotion with its neighbor in the current order, atomically.
--
-- The current order is (orden, codigo): codigo breaks ties, everywhere the order is read. The call checks that the
-- neighbor is still next to the promotion and that both tokens are still current, locks every promotion while it
-- works, renumbers 1..n only the rows whose position changes, and returns every promotion with its new position and
-- token. Any failure changes nothing. Security invoker: row level security and the column grants still apply.
-- Local stack only; every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'cliente@example.test');
insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000a1');

-- The seed's eight promotions hold positions 1..8; tokens as the panel would have read them. The helpers live in
-- public only inside this rolled-back transaction.
create temporary table antes on commit drop as
  select id, codigo, orden, actualizado_en from public.promociones;
grant select on antes to authenticated;
create function public.prueba_tokens(variadic codigos text[]) returns jsonb language sql as $$
  select jsonb_object_agg(a.id::text, a.actualizado_en) from antes a where a.codigo = any (codigos)
$$;
grant execute on function public.prueba_tokens(text[]) to authenticated;
create function public.prueba_id(codigo text) returns uuid language sql as $$
  select a.id from antes a where a.codigo = $1
$$;
grant execute on function public.prueba_id(text) to authenticated;
create function public.prueba_orden() returns text[] language sql as $$
  select array_agg(p.codigo order by p.orden, p.codigo) from public.promociones p
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- The function itself.
select has_function('public', 'mover_promocion', array['uuid', 'uuid', 'jsonb'], 'mover_promocion(uuid, uuid, jsonb) exists');
select is(
  (select prosecdef from pg_proc where oid = 'public.mover_promocion(uuid, uuid, jsonb)'::regprocedure),
  false,
  'it runs as the caller (security invoker), so row level security applies'
);
select is(
  (select proconfig from pg_proc where oid = 'public.mover_promocion(uuid, uuid, jsonb)'::regprocedure),
  array['search_path=""'],
  'it pins an empty search_path'
);
select is(has_function_privilege('anon', 'public.mover_promocion(uuid, uuid, jsonb)', 'EXECUTE'), false, 'anon cannot call it');
select is(has_function_privilege('public', 'public.mover_promocion(uuid, uuid, jsonb)', 'EXECUTE'), false, 'PUBLIC cannot call it');
select is(
  has_function_privilege('authenticated', 'public.mover_promocion(uuid, uuid, jsonb)', 'EXECUTE'),
  true,
  'signed-in users can call it; the function and row level security decide the rest'
);

-- ---------------------------------------------------------------------------------------------------------------
-- Anonymous visitor and signed-in customer: nothing moves.
set local role anon;
select throws_ok(
  $$select * from public.mover_promocion(gen_random_uuid(), gen_random_uuid(), '{}')$$,
  '42501', null, 'anon is refused before anything runs'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-muzza-especial-6-jyq'),
      public.prueba_tokens('promo-tres-muzzarella', 'promo-muzza-especial-6-jyq'))$$,
  'HP403', null, 'a customer who is not an administrator cannot reorder'
);
reset role;
select is(public.prueba_orden(), (select array_agg(codigo order by orden, codigo) from antes), 'and the order did not change');

-- ---------------------------------------------------------------------------------------------------------------
-- Administrator.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

select throws_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-tres-muzzarella'),
      public.prueba_tokens('promo-tres-muzzarella'))$$,
  'HP422', null, 'a promotion cannot swap with itself'
);
select throws_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-muzza-especial-6-jyq'), '[]')$$,
  'HP422', null, 'tokens must be an object'
);
select throws_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-muzza-especial-6-jyq'),
      jsonb_build_object(public.prueba_id('promo-tres-muzzarella')::text, 'ayer', public.prueba_id('promo-muzza-especial-6-jyq')::text, 'hoy'))$$,
  'HP422', null, 'tokens must be timestamps'
);
select throws_ok(
  $$select * from public.mover_promocion(gen_random_uuid(), public.prueba_id('promo-muzza-especial-6-jyq'), public.prueba_tokens('promo-muzza-especial-6-jyq'))$$,
  'HP404', null, 'an unknown promotion is not found'
);
select throws_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-muzza-6-empanadas'),
      public.prueba_tokens('promo-tres-muzzarella', 'promo-muzza-6-empanadas'))$$,
  'HP409', null, 'a promotion that is not its neighbor anymore is a conflict'
);
select throws_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-muzza-especial-6-jyq'),
      public.prueba_tokens('promo-tres-muzzarella'))$$,
  'HP409', null, 'a missing token is a conflict'
);
select throws_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-muzza-especial-6-jyq'),
      public.prueba_tokens('promo-tres-muzzarella') || jsonb_build_object(public.prueba_id('promo-muzza-especial-6-jyq')::text, '2000-01-01T00:00:00Z'))$$,
  'HP409', null, 'a stale token of the neighbor is a conflict'
);
reset role;
select is(public.prueba_orden(), (select array_agg(codigo order by orden, codigo) from antes), 'no failed call changed the order');
select is(
  (select count(*)::int from public.promociones p join antes a using (id) where p.actualizado_en <> a.actualizado_en),
  0,
  'no failed call touched any row'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
create temporary table movido on commit drop as
  select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-muzza-especial-6-jyq'),
    public.prueba_tokens('promo-tres-muzzarella', 'promo-muzza-especial-6-jyq'));
reset role;
select is(
  public.prueba_orden(),
  array['promo-muzza-6-empanadas', 'promo-especial-muzzarella', 'promo-especial-coca-6-jyq', 'promo-docena-surtida',
        'promo-docena-eleccion', 'promo-tres-muzzarella', 'promo-muzza-especial-6-jyq', 'promo-napolitana-especial'],
  'the administrator moves «Tres pizzas Muzzarella» up one place'
);
select is(
  (select array_agg(p.codigo order by p.codigo) from public.promociones p join antes a using (id) where p.actualizado_en <> a.actualizado_en),
  array['promo-muzza-especial-6-jyq', 'promo-tres-muzzarella'],
  'only the two swapped promotions were written'
);
select is((select count(*)::int from movido), 8, 'it returns every promotion');
select is(
  (select array_agg(m.orden order by m.orden) from movido m),
  array[1, 2, 3, 4, 5, 6, 7, 8],
  'with its position'
);
select is(
  (select m.actualizado_en from movido m where m.id = public.prueba_id('promo-tres-muzzarella')),
  (select p.actualizado_en from public.promociones p where p.codigo = 'promo-tres-muzzarella'),
  'and its new token'
);

-- The tokens it returned are the ones a second move must send; the old ones are now stale.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-docena-eleccion'),
      public.prueba_tokens('promo-tres-muzzarella', 'promo-docena-eleccion'))$$,
  'HP409', null, 'a second move with the token read before the first is a conflict'
);
reset role;

-- Repeated positions (concurrent creates, older data): the move renumbers 1..n in the current order, ties by code.
update public.promociones set orden = 5 where codigo in ('promo-tres-muzzarella', 'promo-napolitana-especial');
insert into public.promociones (codigo, titulo, precio, orden) values ('promo-aa-nueva', 'Nueva', 1000, 5);
delete from antes;
insert into antes select id, codigo, orden, actualizado_en from public.promociones;
select is(
  public.prueba_orden(),
  array['promo-muzza-6-empanadas', 'promo-especial-muzzarella', 'promo-especial-coca-6-jyq', 'promo-docena-surtida',
        'promo-aa-nueva', 'promo-docena-eleccion', 'promo-napolitana-especial', 'promo-tres-muzzarella', 'promo-muzza-especial-6-jyq'],
  'repeated positions read in code order'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select lives_ok(
  $$select * from public.mover_promocion(public.prueba_id('promo-tres-muzzarella'), public.prueba_id('promo-napolitana-especial'),
      public.prueba_tokens('promo-tres-muzzarella', 'promo-napolitana-especial'))$$,
  'a promotion moves past a neighbor with the same position'
);
reset role;
select is(
  public.prueba_orden(),
  array['promo-muzza-6-empanadas', 'promo-especial-muzzarella', 'promo-especial-coca-6-jyq', 'promo-docena-surtida',
        'promo-aa-nueva', 'promo-docena-eleccion', 'promo-tres-muzzarella', 'promo-napolitana-especial', 'promo-muzza-especial-6-jyq'],
  'and lands right before it'
);
select is(
  (select array_agg(orden order by orden) from public.promociones),
  array[1, 2, 3, 4, 5, 6, 7, 8, 9],
  'positions are 1..n again, with no repeats'
);
-- Moving changes only positions. The expected composition is written out here, from the owner's data and the
-- authorized catalog, never read from the rows under test: the dozen is 12 units of Empanadas, by its stable id, and
-- every other promotion (the seven original closed combos and this test's own) has no flavor choice.
select results_eq(
  $$select eleccion_categoria_id, eleccion_unidades from public.promociones where codigo = 'promo-docena-eleccion'$$,
  $$values ('e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4'::uuid, 12)$$,
  'after the moves, the dozen to choose is still 12 empanadas of the Empanadas category'
);
select results_eq(
  $$select codigo from public.promociones
    where eleccion_categoria_id is null and eleccion_unidades is null order by codigo$$,
  array['promo-aa-nueva', 'promo-docena-surtida', 'promo-especial-coca-6-jyq', 'promo-especial-muzzarella',
        'promo-muzza-6-empanadas', 'promo-muzza-especial-6-jyq', 'promo-napolitana-especial', 'promo-tres-muzzarella'],
  'and every closed combo still has no flavor choice'
);
select throws_ok(
  $$update public.promociones set eleccion_unidades = 6 where codigo = 'promo-docena-eleccion'$$,
  '23514', null, 'not even the table owner can make the dozen anything but 12 units'
);
select throws_ok(
  $$update public.promociones set eleccion_categoria_id = '9905ae9a-9374-55b3-b1ae-4435e5d036cf' where codigo = 'promo-docena-eleccion'$$,
  '23514', null, 'nor point it at another category (Pizzas)'
);

select * from finish();
rollback;
