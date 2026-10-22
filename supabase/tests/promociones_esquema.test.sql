-- Promotions schema (P5a): the commercial code, the constraints that keep promotion data valid, and the trigger
-- that keeps the code immutable even for the table owner. Runs on the local stack only (supabase test db); every
-- change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select has_table('public', 'promociones', 'promociones exists');
select col_is_pk('public', 'promociones', 'id', 'id is the primary key');
select col_type_is('public', 'promociones', 'id', 'uuid', 'id is a uuid');
select col_not_null('public', 'promociones', 'codigo', 'codigo is required');
select col_type_is('public', 'promociones', 'dias_semana', 'smallint[]', 'dias_semana is a smallint array');
select hasnt_column('public', 'promociones', 'imagen_url', 'P5a stores no image');

-- A promotion with only the required data gets a generated commercial code, never derived from its title.
insert into public.promociones (titulo, precio, orden) values ('Promo sin código', 1000, 99);
select matches(
  (select codigo from public.promociones where titulo = 'Promo sin código'),
  '^promo-[0-9a-f]{32}$',
  'a new promotion gets a generated promo- code'
);

insert into public.promociones (codigo, titulo, precio, orden) values ('promo-prueba-base', 'Base', 1000, 99);

select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden) values ('promo-prueba-base', 'Otra', 1000, 99)$$,
  '23505', null, 'codigo is unique'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden) values ('Promo Mayúscula', 'X', 1000, 99)$$,
  '23514', null, 'codigo must look like promo-lower-case-words'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden) values ('promo-prueba-titulo', '   ', 1000, 99)$$,
  '23514', null, 'the title cannot be blank'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, descripcion, precio, orden) values ('promo-prueba-desc', 'X', ' ', 1000, 99)$$,
  '23514', null, 'a description, when present, cannot be blank'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden) values ('promo-prueba-precio', 'X', 0, 99)$$,
  '23514', null, 'the price is a positive whole number'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, orden) values ('promo-prueba-sin-precio', 'X', 99)$$,
  '23502', null, 'the price is never missing'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, vigente_desde, vigente_hasta)
    values ('promo-prueba-fechas', 'X', 1000, 99, '2026-12-31', '2026-01-01')$$,
  '23514', null, 'validity cannot end before it starts'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, dias_semana) values ('promo-prueba-dias-vacios', 'X', 1000, 99, '{}')$$,
  '23514', null, 'an empty weekday list is rejected (null means every day)'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, dias_semana) values ('promo-prueba-dia-7', 'X', 1000, 99, '{1,7}')$$,
  '23514', null, 'weekdays go from 0 (Sunday) to 6 (Saturday)'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, dias_semana) values ('promo-prueba-dias-repetidos', 'X', 1000, 99, '{2,2}')$$,
  '23514', null, 'weekdays cannot repeat'
);
-- The only configurator the menu has is the dozen of empanadas to choose: 12 units among the flavors of the
-- Empanadas category (its stable id from the authorized catalog, never looked up by name). Closed combos have neither.
select lives_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden) values ('promo-prueba-cerrada', 'X', 1000, 99)$$,
  'a closed combo has no flavor choice'
);
select lives_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id, eleccion_unidades)
    values ('promo-prueba-docena', 'X', 1000, 99, 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 12)$$,
  'a combo with 12 empanadas to choose is accepted'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_unidades) values ('promo-prueba-eleccion', 'X', 1000, 99, 12)$$,
  '23514', null, 'a flavor choice needs its category'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id) values ('promo-prueba-eleccion', 'X', 1000, 99, 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4')$$,
  '23514', null, 'a flavor choice needs its units'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id, eleccion_unidades)
    values ('promo-prueba-seis', 'X', 1000, 99, 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 6)$$,
  '23514', null, 'a flavor choice of 6 units is rejected'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id, eleccion_unidades)
    values ('promo-prueba-once', 'X', 1000, 99, 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 11)$$,
  '23514', null, 'a flavor choice of 11 units is rejected'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id, eleccion_unidades)
    values ('promo-prueba-trece', 'X', 1000, 99, 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 13)$$,
  '23514', null, 'a flavor choice of 13 units is rejected'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id, eleccion_unidades)
    values ('promo-prueba-pizzas', 'X', 1000, 99, '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 12)$$,
  '23514', null, 'a flavor choice from another category (Pizzas) is rejected'
);
select throws_ok(
  $$update public.promociones set codigo = 'promo-prueba-otro' where codigo = 'promo-prueba-base'$$,
  'P0001', null, 'the code never changes, not even for the table owner'
);
select is(
  (select confdeltype from pg_constraint
    where conrelid = 'public.promociones'::regclass and contype = 'f' and confrelid = 'public.categorias'::regclass),
  'r',
  'the category of a flavor choice cannot be deleted while a promotion uses it'
);

select * from finish();
rollback;
