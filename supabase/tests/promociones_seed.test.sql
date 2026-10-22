-- The eight original promotions loaded by supabase/seed_promociones.sql (P5a): exact codes, texts, prices, and the
-- dozen's flavor choice, with no validity limits, because the owner gave none. Local stack only; nothing changes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select results_eq(
  $$select codigo, titulo, descripcion, precio, orden, visible from public.promociones
    where codigo in ('promo-muzza-6-empanadas', 'promo-especial-muzzarella', 'promo-especial-coca-6-jyq',
      'promo-docena-surtida', 'promo-docena-eleccion', 'promo-muzza-especial-6-jyq', 'promo-tres-muzzarella',
      'promo-napolitana-especial')
    order by orden$$,
  $$values
    ('promo-muzza-6-empanadas', 'Muzza + 6 empanadas surtidas', 'No son a elección.', 32000, 1, true),
    ('promo-especial-muzzarella', 'Especial + Pizza Muzzarella', null::text, 35000, 2, true),
    ('promo-especial-coca-6-jyq', 'Especial + Coca-Cola 1,75 + 6 empanadas de JyQ', null, 42500, 3, true),
    ('promo-docena-surtida', 'Docena de empanadas surtidas', null, 30000, 4, true),
    ('promo-docena-eleccion', 'Docena de empanadas a elección', null, 36000, 5, true),
    ('promo-muzza-especial-6-jyq', 'Muzza + Especial + 6 empanadas de JyQ', null, 52000, 6, true),
    ('promo-tres-muzzarella', 'Tres pizzas Muzzarella', null, 42000, 7, true),
    ('promo-napolitana-especial', 'Pizza Napolitana + Pizza Especial', null, 42000, 8, true)$$,
  'the eight original promotions keep their codes, titles, descriptions, prices, and order'
);

select is(
  (select count(*)::int from public.promociones
    where codigo like 'promo-%' and (vigente_desde is not null or vigente_hasta is not null or dias_semana is not null)
      and codigo in ('promo-muzza-6-empanadas', 'promo-especial-muzzarella', 'promo-especial-coca-6-jyq',
        'promo-docena-surtida', 'promo-docena-eleccion', 'promo-muzza-especial-6-jyq', 'promo-tres-muzzarella',
        'promo-napolitana-especial')),
  0,
  'no validity is invented: no dates and no weekdays'
);

select results_eq(
  $$select p.codigo, c.nombre, p.eleccion_unidades from public.promociones p
    join public.categorias c on c.id = p.eleccion_categoria_id order by p.codigo$$,
  $$values ('promo-docena-eleccion', 'Empanadas', 12)$$,
  'only the dozen to choose has a flavor choice: 12 units among the empanadas'
);

set local role anon;
select is(
  (select count(*)::int from public.promociones where codigo like 'promo-%' and codigo not like 'promo-prueba-%'),
  8,
  'the public menu reads the eight promotions'
);
reset role;

select * from finish();
rollback;
