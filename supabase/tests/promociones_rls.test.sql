-- Row level security and privileges of promotions (P5a): who reads which promotions, and who may change what.
--
-- The public sees only visible promotions within their validity, evaluated in PostgreSQL with Argentina's clock, and
-- never a promotion whose flavor category is hidden. Administrators read and change every promotion, except its
-- code; nobody deletes one. Validity is written inline in the policy, so the public roles get nothing on privado.
-- Same scope as catalogo_rls: roles and JWT claims are set directly. Local stack only; every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'cliente@example.test');
insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000a1');

-- Argentina's date and weekday right now, the same clock the policy uses.
create temporary table ar on commit drop as
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date as hoy,
         extract(dow from now() at time zone 'America/Argentina/Buenos_Aires')::smallint as dia;
grant select on ar to anon, authenticated;

insert into public.categorias (id, nombre, orden, visible) values
  ('00000000-0000-4000-8000-00000000d001', 'Categoría de gustos oculta', 95, false);

insert into public.promociones (codigo, titulo, precio, orden, visible, vigente_desde, vigente_hasta, dias_semana, eleccion_categoria_id, eleccion_unidades)
select codigo, 'Prueba', 1000, 99, visible, desde, hasta, dias, categoria, unidades
from ar, lateral (values
  ('promo-prueba-siempre', true, null::date, null::date, null::smallint[], null::uuid, null::int),
  ('promo-prueba-oculta', false, null, null, null, null, null),
  ('promo-prueba-vigente', true, ar.hoy - 1, ar.hoy + 1, null, null, null),
  ('promo-prueba-hoy', true, ar.hoy, ar.hoy, null, null, null),
  ('promo-prueba-vencida', true, null, ar.hoy - 1, null, null, null),
  ('promo-prueba-futura', true, ar.hoy + 1, null, null, null, null),
  ('promo-prueba-dia-de-hoy', true, null, null, array[ar.dia], null, null),
  ('promo-prueba-otro-dia', true, null, null, array[((ar.dia + 1) % 7)::smallint], null, null),
  ('promo-prueba-gustos-ocultos', true, null, null, null, '00000000-0000-4000-8000-00000000d001'::uuid, 12),
  ('promo-prueba-gustos-visibles', true, null, null, null, (select id from public.categorias where nombre = 'Empanadas'), 12)
) as f(codigo, visible, desde, hasta, dias, categoria, unidades);

-- ---------------------------------------------------------------------------------------------------------------
-- Anonymous visitor.
set local role anon;
select results_eq(
  $$select codigo from public.promociones where codigo like 'promo-prueba-%' order by codigo$$,
  array['promo-prueba-dia-de-hoy', 'promo-prueba-gustos-visibles', 'promo-prueba-hoy', 'promo-prueba-siempre', 'promo-prueba-vigente'],
  'anon reads only visible promotions within their dates and weekdays, with a visible flavor category'
);
select throws_ok($$insert into public.promociones (titulo, precio, orden) values ('Intrusa', 1, 1)$$, '42501', null, 'anon cannot add promotions');
select throws_ok($$update public.promociones set precio = 1$$, '42501', null, 'anon cannot change prices');
select throws_ok($$delete from public.promociones$$, '42501', null, 'anon cannot delete promotions');
select throws_ok($$select privado.es_admin()$$, '42501', null, 'anon still cannot call anything in privado');
reset role;

-- ---------------------------------------------------------------------------------------------------------------
-- Signed-in customer who is not an administrator.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.promociones where codigo like 'promo-prueba-%'),
  5,
  'a non-admin reads exactly what anon reads'
);
select throws_ok(
  $$insert into public.promociones (titulo, precio, orden) values ('Intrusa', 1, 1)$$,
  '42501', null, 'a non-admin cannot add promotions'
);
update public.promociones set precio = 1 where codigo = 'promo-prueba-siempre';
update public.promociones set visible = true where codigo = 'promo-prueba-oculta';
reset role;
select is((select precio from public.promociones where codigo = 'promo-prueba-siempre'), 1000, 'a non-admin update changes no price');
select is((select visible from public.promociones where codigo = 'promo-prueba-oculta'), false, 'a non-admin cannot switch a promotion on');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$delete from public.promociones$$, '42501', null, 'a non-admin cannot delete promotions');
reset role;

-- ---------------------------------------------------------------------------------------------------------------
-- Administrator.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.promociones where codigo like 'promo-prueba-%'),
  10,
  'the administrator reads every promotion, active or not'
);
select lives_ok(
  $$update public.promociones set titulo = 'Título nuevo', descripcion = 'Descripción', precio = 2500, visible = false,
      orden = 1, vigente_desde = null, vigente_hasta = null, dias_semana = '{1,2}'
    where codigo = 'promo-prueba-siempre'$$,
  'the administrator changes title, description, price, state, order, and validity'
);
select is(
  (select precio from public.promociones where codigo = 'promo-prueba-siempre'),
  2500,
  'the administrator''s price change is saved'
);
select throws_ok(
  $$update public.promociones set codigo = 'promo-prueba-robada' where codigo = 'promo-prueba-oculta'$$,
  '42501', null, 'the administrator cannot change a code'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden) values ('promo-prueba-elegida', 'X', 1000, 1)$$,
  '42501', null, 'the administrator cannot choose a code'
);
select lives_ok(
  $$insert into public.promociones (titulo, precio, orden) values ('Promo del administrador', 1500, 50)$$,
  'the administrator adds a promotion without a code'
);
select matches(
  (select codigo from public.promociones where titulo = 'Promo del administrador'),
  '^promo-[0-9a-f]{32}$',
  'its code is generated'
);
select throws_ok($$delete from public.promociones$$, '42501', null, 'not even the administrator deletes promotions');
reset role;

-- ---------------------------------------------------------------------------------------------------------------
-- What the public roles hold.
select is(has_schema_privilege('anon', 'privado', 'USAGE'), false, 'anon holds no usage on privado');
select is(has_table_privilege('anon', 'public.promociones', 'SELECT'), true, 'anon may select promotions');
select is(has_table_privilege('anon', 'public.promociones', 'INSERT, UPDATE, DELETE'), false, 'anon holds no write privilege');
select is(has_table_privilege('authenticated', 'public.promociones', 'DELETE'), false, 'authenticated holds no delete privilege');
select is(has_column_privilege('authenticated', 'public.promociones', 'codigo', 'UPDATE'), false, 'authenticated cannot update codigo');
select is(has_column_privilege('authenticated', 'public.promociones', 'codigo', 'INSERT'), false, 'authenticated cannot insert codigo');
select is(has_column_privilege('authenticated', 'public.promociones', 'id', 'UPDATE'), false, 'authenticated cannot update id');
select ok(
  (select qual from pg_policies where tablename = 'promociones' and policyname like '%lectura pública%')
    like '%America/Argentina/Buenos_Aires%',
  'the public read policy evaluates validity with Argentina''s clock'
);

select * from finish();
rollback;
