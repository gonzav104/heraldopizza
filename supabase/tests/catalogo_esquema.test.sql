-- Catalog schema: constraints and the integrity of the seed loaded from docs/seed_catalogo.sql.
-- Runs on the local stack only (supabase test db); every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- The seed, exactly as docs/seed_catalogo.sql defines it.
select is((select count(*)::int from public.categorias), 13, 'the seed loads 13 categories');
select is((select count(*)::int from public.productos), 84, 'the seed loads 84 products');
select is((select count(*)::int from public.variantes), 110, 'the seed loads 110 variants');
select is((select count(*)::int from public.variantes where precio is null), 17, '17 variants have no published price');
select is(
  (select count(distinct producto_id)::int from public.variantes where precio is null),
  16,
  'the variants without price belong to 16 products'
);
select is(
  (select count(*)::int from public.productos p
    where exists (select 1 from public.variantes v where v.producto_id = p.id and v.precio is null)
      and exists (select 1 from public.variantes v where v.producto_id = p.id and v.precio is not null)),
  0,
  'no product mixes priced and unpriced variants'
);
select is((select count(*)::int from public.variantes where precio = 0), 0, 'no NULL price was turned into 0');
select is(
  (select count(*)::int from public.productos where not visible or sin_stock),
  0,
  'every seeded product starts visible and in stock'
);
select is(
  (select count(*)::int from public.productos where solo_por_encargo and aviso_encargo is not null),
  1,
  'the made-to-order product keeps its notice'
);
select col_type_is('public', 'variantes', 'precio', 'integer', 'prices are whole pesos');

-- Constraints.
select throws_ok(
  $$insert into public.variantes (producto_id, nombre, precio, orden)
    select id, 'Prueba cero', 0, 99 from public.productos limit 1$$,
  '23514', null, 'a price of 0 is rejected'
);
select throws_ok(
  $$insert into public.variantes (producto_id, nombre, precio, orden)
    select id, 'Prueba negativa', -100, 99 from public.productos limit 1$$,
  '23514', null, 'a negative price is rejected'
);
select lives_ok(
  $$insert into public.variantes (producto_id, nombre, precio, orden)
    select id, 'Prueba sin precio', null, 99 from public.productos limit 1$$,
  'a variant without price is allowed (shown as "Consultar en barra")'
);
select throws_ok(
  $$insert into public.variantes (producto_id, nombre, precio, orden)
    select producto_id, nombre, 1000, 99 from public.variantes limit 1$$,
  '23505', null, 'two variants of one product cannot share a name'
);
select throws_ok(
  $$insert into public.productos (categoria_id, nombre, solo_por_encargo, aviso_encargo, orden)
    select id, 'Encargo sin aviso', true, null, 99 from public.categorias limit 1$$,
  '23514', null, 'a made-to-order product needs its notice'
);
select throws_ok(
  $$insert into public.productos (categoria_id, nombre, solo_por_encargo, aviso_encargo, orden)
    select id, 'Encargo con aviso vacío', true, '   ', 99 from public.categorias limit 1$$,
  '23514', null, 'a blank notice does not count'
);
select throws_ok(
  $$insert into public.categorias (nombre, orden) values ('   ', 99)$$,
  '23514', null, 'a category needs a name'
);
select throws_ok(
  $$insert into public.categorias (nombre, orden) values ('Pizzas', 99)$$,
  '23505', null, 'category names are unique'
);
select throws_ok(
  $$delete from public.categorias where nombre = 'Pizzas'$$,
  '23503', null, 'a category with products cannot be deleted'
);

-- Deleting a product removes its variants.
create temporary table prueba_borrado as
  select p.id from public.productos p join public.categorias c on c.id = p.categoria_id
  where c.nombre = 'Pizzas' order by p.orden limit 1;
-- Precondition: without it the cascade check below would pass on a product that never had variants.
select ok(
  (select count(*) from public.variantes where producto_id = (select id from prueba_borrado)) > 0,
  'the product chosen for the cascade test has variants before the delete'
);
delete from public.productos where id = (select id from prueba_borrado);
select is(
  (select count(*)::int from public.variantes where producto_id = (select id from prueba_borrado)),
  0,
  'deleting a product deletes its variants'
);

-- actualizado_en follows every update: the trigger overwrites even an explicit value.
update public.categorias set actualizado_en = '2000-01-01' where nombre = 'Bebidas';
select ok(
  (select actualizado_en > '2000-01-01' from public.categorias where nombre = 'Bebidas'),
  'an update sets actualizado_en to the time of the change, whatever the caller writes'
);

-- The helper schema is not one the API exposes, and nobody but its owner can use it yet.
select ok(
  not has_schema_privilege('anon', 'privado', 'usage'),
  'anon has no access to the privado schema'
);

select * from finish();
rollback;
