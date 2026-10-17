-- Visibility on the real seed: hiding a category hides its products and their variants from the public menu,
-- while an administrator still sees everything. Runs on the local stack only; every change is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000a1', 'admin@example.test');
insert into public.administradores (user_id) values ('00000000-0000-4000-8000-0000000000a1');
update public.categorias set visible = false where nombre = 'Pizzas';

set local role anon;
select is((select count(*)::int from public.categorias), 12, 'with Pizzas hidden, anon reads 12 categories');
select is((select count(*)::int from public.productos), 65, 'with Pizzas hidden, anon reads 65 products');
select is((select count(*)::int from public.variantes), 72, 'with Pizzas hidden, anon reads 72 variants');
select is_empty(
  $$select 1 from public.productos p join public.categorias c on c.id = p.categoria_id where c.nombre = 'Pizzas'$$,
  'anon reads no pizza at all'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.categorias), 13, 'the administrator still reads 13 categories');
select is((select count(*)::int from public.productos), 84, 'the administrator still reads 84 products');
select is((select count(*)::int from public.variantes), 110, 'the administrator still reads 110 variants');
select results_eq(
  $$update public.categorias set visible = true where nombre = 'Pizzas' returning visible$$,
  array[true],
  'the administrator shows the category again'
);
reset role;

select * from finish();
rollback;
