-- Promotions schema (P5a): the commercial code, the constraints that keep promotion data valid, and the trigger
-- that keeps the code immutable even for the table owner. Runs on the local stack only (supabase test db); every
-- change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

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
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_unidades) values ('promo-prueba-eleccion', 'X', 1000, 99, 12)$$,
  '23514', null, 'a flavor choice needs both its category and its units'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id, eleccion_unidades)
    select 'promo-prueba-unidades', 'X', 1000, 99, id, 0 from public.categorias where nombre = 'Empanadas'$$,
  '23514', null, 'a flavor choice has a positive number of units'
);
select throws_ok(
  $$insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id, eleccion_unidades)
    values ('promo-prueba-categoria', 'X', 1000, 99, '00000000-0000-4000-8000-0000000000ff', 12)$$,
  '23503', null, 'a flavor choice points at an existing category'
);
select throws_ok(
  $$update public.promociones set codigo = 'promo-prueba-otro' where codigo = 'promo-prueba-base'$$,
  'P0001', null, 'the code never changes, not even for the table owner'
);
insert into public.categorias (id, nombre, orden) values ('00000000-0000-4000-8000-00000000e001', 'Categoría sin productos', 96);
insert into public.promociones (codigo, titulo, precio, orden, eleccion_categoria_id, eleccion_unidades)
  values ('promo-prueba-gustos', 'X', 1000, 99, '00000000-0000-4000-8000-00000000e001', 6);
select throws_ok(
  $$delete from public.categorias where id = '00000000-0000-4000-8000-00000000e001'$$,
  '23503', null, 'a category that a flavor choice uses cannot be deleted'
);

select * from finish();
rollback;
