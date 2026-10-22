-- The eight original promotions of Heraldo Pizza (P5a), as the owner gave them (2026-10-17): titles, prices, and the one
-- clarification, verbatim. Their codes are the ones the prototype used, so carts saved before P5a keep working.
-- Validity was not given: no dates and no weekdays (always active). Only the dozen to choose has a flavor choice: 12
-- units among the empanadas (Empanadas category of docs/seed_catalogo.sql, which loads first).
--
-- Internal ids are fixed (uuid5 of each code in this repository's namespace) so the rows are the same everywhere.
-- Idempotent and safe to run again: it only adds the codes that are missing and never overwrites what the
-- administrator changed afterwards (prices, texts, state). Loads on the local stack after the catalog seed.
insert into public.promociones (id, codigo, titulo, descripcion, precio, orden, eleccion_categoria_id, eleccion_unidades)
values
  ('192a495e-20d3-5aef-aece-5e4807f8f685', 'promo-muzza-6-empanadas', 'Muzza + 6 empanadas surtidas', 'No son a elección.', 32000, 1, null, null),
  ('302e9cf7-14f1-5512-b938-5780c6252655', 'promo-especial-muzzarella', 'Especial + Pizza Muzzarella', null, 35000, 2, null, null),
  ('ac096e15-ad6e-5466-9740-474a2afe824b', 'promo-especial-coca-6-jyq', 'Especial + Coca-Cola 1,75 + 6 empanadas de JyQ', null, 42500, 3, null, null),
  ('b7a0766d-7ff7-54bd-84b2-5efa64030207', 'promo-docena-surtida', 'Docena de empanadas surtidas', null, 30000, 4, null, null),
  ('1f1b44db-aa99-5d04-a068-a2b182ede13c', 'promo-docena-eleccion', 'Docena de empanadas a elección', null, 36000, 5, 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 12),
  ('a79d39b3-a8a5-5777-b464-0cda7b339788', 'promo-muzza-especial-6-jyq', 'Muzza + Especial + 6 empanadas de JyQ', null, 52000, 6, null, null),
  ('e5060c36-764f-5591-8256-d8225be1e24c', 'promo-tres-muzzarella', 'Tres pizzas Muzzarella', null, 42000, 7, null, null),
  ('3155a51c-78aa-5a05-aa35-3e870f466de3', 'promo-napolitana-especial', 'Pizza Napolitana + Pizza Especial', null, 42000, 8, null, null)
on conflict (codigo) do nothing;
