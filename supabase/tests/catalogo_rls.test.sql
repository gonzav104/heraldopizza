-- Row level security of the catalog: what each identity may read and write.
--
-- Scope: these tests set the database role and the JWT claims directly, the way PostgREST does after it has
-- verified a token. They prove what the grants and policies allow for a given identity. They do NOT test that
-- Supabase rejects a forged or expired token: that check happens in the API gateway, before the database.
-- Runs on the local stack only (supabase test db), with fictitious users; every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'cliente@example.test');
insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000a1');

-- Fixtures: one hidden category, one hidden product in a visible category, and one product to attack.
insert into public.categorias (id, nombre, orden, visible) values
  ('00000000-0000-4000-8000-00000000c001', 'Categoría oculta de prueba', 90, false);
insert into public.productos (id, categoria_id, nombre, orden) values
  ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-00000000c001', 'En categoría oculta', 1);
insert into public.productos (id, categoria_id, nombre, orden, visible)
  select '00000000-0000-4000-8000-00000000c003', id, 'Producto oculto de prueba', 90, false
  from public.categorias where nombre = 'Pizzas';
insert into public.variantes (producto_id, nombre, precio, orden) values
  ('00000000-0000-4000-8000-00000000c002', 'Única', 1000, 1),
  ('00000000-0000-4000-8000-00000000c003', 'Única', 2000, 1);
insert into public.productos (id, categoria_id, nombre, orden)
  select '00000000-0000-4000-8000-00000000c004', id, 'Blanco de ataque', 91 from public.categorias where nombre = 'Pizzas';
insert into public.variantes (id, producto_id, nombre, precio, orden) values
  ('00000000-0000-4000-8000-00000000c005', '00000000-0000-4000-8000-00000000c004', 'Única', 5000, 1);

-- ---------------------------------------------------------------------------------------------------------------
-- Anonymous visitor: reads only what is visible, writes nothing.
set local role anon;
select is((select count(*)::int from public.categorias), 13, 'anon reads the 13 visible categories, not the hidden one');
select is((select count(*)::int from public.productos), 85, 'anon reads visible products in visible categories only');
select is(
  (select count(*)::int from public.variantes where producto_id in
    ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-00000000c003')),
  0,
  'anon reads no variant of a hidden product or of a product in a hidden category'
);
select is(
  (select count(*)::int from public.variantes where precio is null),
  17,
  'anon still reads the 17 unpriced variants ("Consultar en barra")'
);
select throws_ok($$insert into public.categorias (nombre, orden) values ('Intrusa', 1)$$, '42501', null, 'anon cannot insert categories');
select throws_ok($$update public.productos set nombre = 'x'$$, '42501', null, 'anon cannot update products');
select throws_ok($$update public.variantes set precio = 1$$, '42501', null, 'anon cannot update prices');
select throws_ok($$delete from public.variantes$$, '42501', null, 'anon cannot delete variants');
select throws_ok($$delete from public.productos$$, '42501', null, 'anon cannot delete products');
select throws_ok($$select * from public.administradores$$, '42501', null, 'anon cannot read administradores');
select throws_ok(
  $$insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000b2')$$,
  '42501', null, 'anon cannot add an administrator'
);
select throws_ok($$select privado.es_admin()$$, '42501', null, 'anon cannot call es_admin()');
reset role;
select is(
  (select precio from public.variantes where id = '00000000-0000-4000-8000-00000000c005'),
  5000,
  'the denied anon writes left the target price intact'
);

-- ---------------------------------------------------------------------------------------------------------------
-- Signed-in user who is not an administrator: same reads as anon, no writes, no way up.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select is(privado.es_admin(), false, 'es_admin() is false for a user who is not in administradores');
select is((select count(*)::int from public.categorias), 13, 'a non-admin reads only visible categories');
select is((select count(*)::int from public.productos), 85, 'a non-admin reads only visible products');
select throws_ok(
  $$insert into public.categorias (nombre, orden) values ('Intrusa', 1)$$,
  '42501', null, 'a non-admin cannot insert categories'
);
select throws_ok(
  $$insert into public.variantes (producto_id, nombre, precio, orden)
    values ('00000000-0000-4000-8000-00000000c004', 'Intrusa', 1, 2)$$,
  '42501', null, 'a non-admin cannot insert variants'
);
select is_empty(
  $$update public.variantes set precio = 1 where id = '00000000-0000-4000-8000-00000000c005' returning id$$,
  'a non-admin updates no price'
);
select is_empty(
  $$update public.productos set visible = true where id = '00000000-0000-4000-8000-00000000c003' returning id$$,
  'a non-admin cannot reveal a hidden product'
);
select is_empty(
  $$delete from public.productos where id = '00000000-0000-4000-8000-00000000c004' returning id$$,
  'a non-admin deletes no product'
);
select is_empty($$delete from public.categorias returning id$$, 'a non-admin deletes no category');
select throws_ok($$select * from public.administradores$$, '42501', null, 'a non-admin cannot read administradores');
select throws_ok(
  $$insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000b2')$$,
  '42501', null, 'a non-admin cannot make themselves an administrator'
);
select throws_ok(
  $$update public.administradores set user_id = '00000000-0000-4000-8000-0000000000b2'$$,
  '42501', null, 'a non-admin cannot take over an administrator row'
);
select throws_ok(
  $$delete from public.administradores$$,
  '42501', null, 'a non-admin cannot remove administrators'
);

-- Claims are not trusted: role names or metadata inside the claims grant nothing, because es_admin() looks only at
-- the administradores table. (Whether such a token would even pass the gateway is outside these tests.)
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"service_role","app_metadata":{"role":"admin"},"user_metadata":{"es_admin":true}}',
  true
);
select is(privado.es_admin(), false, 'admin-looking claims do not make es_admin() true');
select is_empty(
  $$update public.variantes set precio = 1 where id = '00000000-0000-4000-8000-00000000c005' returning id$$,
  'admin-looking claims do not allow price changes'
);
reset role;
select is(
  (select precio from public.variantes where id = '00000000-0000-4000-8000-00000000c005'),
  5000,
  'the denied non-admin writes left the target price intact'
);
select is(
  (select visible from public.productos where id = '00000000-0000-4000-8000-00000000c003'),
  false,
  'the hidden product is still hidden'
);
select is((select count(*)::int from public.administradores), 1, 'administradores still holds only the real administrator');
select ok(
  exists (select 1 from public.productos where id = '00000000-0000-4000-8000-00000000c004'),
  'the target product still exists'
);

-- ---------------------------------------------------------------------------------------------------------------
-- Administrator: reads everything and manages the catalog.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is(privado.es_admin(), true, 'es_admin() is true for a user in administradores');
select is((select count(*)::int from public.categorias), 14, 'the administrator also reads the hidden category');
select is((select count(*)::int from public.productos), 87, 'the administrator also reads hidden products');
select results_eq(
  $$update public.variantes set precio = 5500 where id = '00000000-0000-4000-8000-00000000c005' returning precio$$,
  array[5500],
  'the administrator changes a price'
);
select lives_ok(
  $$insert into public.categorias (nombre, orden) values ('Nueva de prueba', 50)$$,
  'the administrator creates a category'
);
select results_eq(
  $$delete from public.productos where id = '00000000-0000-4000-8000-00000000c004' returning nombre$$,
  array['Blanco de ataque'],
  'the administrator deletes a product'
);
select throws_ok(
  $$insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000b2')$$,
  '42501', null, 'not even an administrator can add administrators through the API'
);

-- Rights follow the table, not the session: once removed from administradores, the same user can no longer write.
reset role;
delete from public.administradores where user_id = '00000000-0000-4000-8000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.categorias (nombre, orden) values ('Después de la baja', 51)$$,
  '42501', null, 'a removed administrator can no longer write'
);
reset role;

select * from finish();
rollback;
