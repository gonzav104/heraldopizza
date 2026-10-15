-- Carga inicial del catálogo de Heraldo Pizza (fuente: carta en PDF, octubre 2026)
-- Precios en pesos enteros. precio null = 'Consultar en barra' (no se puede agregar al carrito).
begin;

-- Pizzas
insert into categorias (id, nombre, orden, recargo_envio) values ('9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Pizzas', 1, true);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('5ecbca90-722a-5ac5-958b-7c6535c58f0e', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Muzzarella', 'Salsa de tomate, muzzarella, orégano y aceitunas.', false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('5ecbca90-722a-5ac5-958b-7c6535c58f0e', 'Entera', 16000, 1), ('5ecbca90-722a-5ac5-958b-7c6535c58f0e', 'Media', 10500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('067ddc9a-3c1e-5006-8d2e-b599fcede947', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Especial', 'Salsa de tomate, muzzarella, jamón cocido, orégano y aceitunas.', false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('067ddc9a-3c1e-5006-8d2e-b599fcede947', 'Entera', 23600, 1), ('067ddc9a-3c1e-5006-8d2e-b599fcede947', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('80903e3a-1caf-5811-9900-6d34fff30c8f', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Napolitana', 'Salsa de tomate, muzzarella, tomates, pesto, queso sardo, orégano y aceitunas.', false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('80903e3a-1caf-5811-9900-6d34fff30c8f', 'Entera', 23500, 1), ('80903e3a-1caf-5811-9900-6d34fff30c8f', 'Media', 12500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('9c7504d6-24e7-567f-babe-85917910e972', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Rúcula y Crudo', 'Salsa de tomate, muzzarella, jamón crudo, rúcula, parmesano, orégano y aceitunas.', false, null, 4);
insert into variantes (producto_id, nombre, precio, orden) values ('9c7504d6-24e7-567f-babe-85917910e972', 'Entera', 27000, 1), ('9c7504d6-24e7-567f-babe-85917910e972', 'Media', 14000, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('a8b7d780-f80d-58c4-8984-4d5dca7f89b9', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Cantimpalo', 'Salsa de tomate, muzzarella, cantimpalo, ajíes, orégano y aceitunas.', false, null, 5);
insert into variantes (producto_id, nombre, precio, orden) values ('a8b7d780-f80d-58c4-8984-4d5dca7f89b9', 'Entera', 24000, 1), ('a8b7d780-f80d-58c4-8984-4d5dca7f89b9', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('e3991f3a-3d71-5d34-86b6-4b3c1f630aa5', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Roquefort', 'Salsa de tomate, muzzarella, queso roquefort, orégano y aceitunas.', false, null, 6);
insert into variantes (producto_id, nombre, precio, orden) values ('e3991f3a-3d71-5d34-86b6-4b3c1f630aa5', 'Entera', 24000, 1), ('e3991f3a-3d71-5d34-86b6-4b3c1f630aa5', 'Media', 12500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('0613ae0c-e4b7-5f2d-a61d-8f82b93b17b2', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Salchipizza', 'Salsa de tomate, muzzarella, salchichas, cheddar, orégano y aceitunas.', false, null, 7);
insert into variantes (producto_id, nombre, precio, orden) values ('0613ae0c-e4b7-5f2d-a61d-8f82b93b17b2', 'Entera', 25000, 1), ('0613ae0c-e4b7-5f2d-a61d-8f82b93b17b2', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('2e0d9305-bc8c-5b71-9c9b-1ed1fedbe493', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Fugazzeta 4 Quesos', 'Salsa de tomate, muzzarella, cebollas, parmesano, cheddar, roquefort, orégano y aceitunas.', false, null, 8);
insert into variantes (producto_id, nombre, precio, orden) values ('2e0d9305-bc8c-5b71-9c9b-1ed1fedbe493', 'Entera', 29000, 1), ('2e0d9305-bc8c-5b71-9c9b-1ed1fedbe493', 'Media', 14500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('64b678d3-813f-5dec-8c5f-24d148447250', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Napolitana Heraldo', 'Salsa de tomate, muzzarella, jamón cocido, tomates, pesto, queso sardo, orégano y aceitunas.', false, null, 9);
insert into variantes (producto_id, nombre, precio, orden) values ('64b678d3-813f-5dec-8c5f-24d148447250', 'Entera', 29000, 1), ('64b678d3-813f-5dec-8c5f-24d148447250', 'Media', 14500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('7649c11d-d1ea-591c-b8e8-c692d4107313', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', '4 Quesos', 'Salsa de tomate, muzzarella, parmesano, cheddar, roquefort, orégano y aceitunas.', false, null, 10);
insert into variantes (producto_id, nombre, precio, orden) values ('7649c11d-d1ea-591c-b8e8-c692d4107313', 'Entera', 25000, 1), ('7649c11d-d1ea-591c-b8e8-c692d4107313', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('2453c6ac-e034-51dd-b98b-02d384c6f96e', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Palmitos', 'Salsa de tomate, muzzarella, jamón, palmitos, salsa golf, orégano y aceitunas.', false, null, 11);
insert into variantes (producto_id, nombre, precio, orden) values ('2453c6ac-e034-51dd-b98b-02d384c6f96e', 'Entera', 24000, 1), ('2453c6ac-e034-51dd-b98b-02d384c6f96e', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('df9a5792-3f57-55d8-81b2-6d2f7fa3bd7b', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Americana', 'Salsa de tomate, muzzarella, papas fritas, cheddar, huevos fritos, orégano y aceitunas.', false, null, 12);
insert into variantes (producto_id, nombre, precio, orden) values ('df9a5792-3f57-55d8-81b2-6d2f7fa3bd7b', 'Entera', 33000, 1), ('df9a5792-3f57-55d8-81b2-6d2f7fa3bd7b', 'Media', 17000, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('906dde98-b6ca-5736-b837-9150f792b6bf', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Hongos', 'Salsa de tomate, muzzarella, champiñones, verdeo, morrón, orégano y aceitunas.', false, null, 13);
insert into variantes (producto_id, nombre, precio, orden) values ('906dde98-b6ca-5736-b837-9150f792b6bf', 'Entera', 24000, 1), ('906dde98-b6ca-5736-b837-9150f792b6bf', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('b61eabbd-8756-5329-8e45-9ff6f0e457bd', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Fugazzeta', 'Salsa de tomate, muzzarella, cebolla, orégano y aceitunas.', false, null, 14);
insert into variantes (producto_id, nombre, precio, orden) values ('b61eabbd-8756-5329-8e45-9ff6f0e457bd', 'Entera', 25000, 1), ('b61eabbd-8756-5329-8e45-9ff6f0e457bd', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('b928df01-19d8-5b9d-825d-d67caa900ec6', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Ananá y Jamón', 'Salsa de tomate, muzzarella, ananá, jamón, orégano y aceitunas.', false, null, 15);
insert into variantes (producto_id, nombre, precio, orden) values ('b928df01-19d8-5b9d-825d-d67caa900ec6', 'Entera', 25000, 1), ('b928df01-19d8-5b9d-825d-d67caa900ec6', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('2943d324-58bc-5cbd-a2b7-9007b1486785', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Jamón y Morrón', 'Salsa de tomate, muzzarella, jamón, morrones, orégano y aceitunas.', false, null, 16);
insert into variantes (producto_id, nombre, precio, orden) values ('2943d324-58bc-5cbd-a2b7-9007b1486785', 'Entera', 26000, 1), ('2943d324-58bc-5cbd-a2b7-9007b1486785', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('cb876675-e38f-5f11-a2e2-4ded013ad87b', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Humita', 'Salsa de tomate, muzzarella, choclo, jamón, morrones, orégano y aceitunas.', false, null, 17);
insert into variantes (producto_id, nombre, precio, orden) values ('cb876675-e38f-5f11-a2e2-4ded013ad87b', 'Entera', 25000, 1), ('cb876675-e38f-5f11-a2e2-4ded013ad87b', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('f745d007-ea89-53e9-ad9b-c5959137b92e', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Anchoas', 'Salsa de tomate, muzzarella, anchoas, orégano y aceitunas.', false, null, 18);
insert into variantes (producto_id, nombre, precio, orden) values ('f745d007-ea89-53e9-ad9b-c5959137b92e', 'Entera', 25000, 1), ('f745d007-ea89-53e9-ad9b-c5959137b92e', 'Media', 13500, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('990dccf7-20ff-503b-ac5f-3a44f19f9242', '9905ae9a-9374-55b3-b1ae-4435e5d036cf', 'Cheddar y Panceta', 'Salsa de tomate, muzzarella, cheddar, panceta, orégano y aceitunas.', false, null, 19);
insert into variantes (producto_id, nombre, precio, orden) values ('990dccf7-20ff-503b-ac5f-3a44f19f9242', 'Entera', 25000, 1), ('990dccf7-20ff-503b-ac5f-3a44f19f9242', 'Media', 12500, 2);

-- Empanadas
insert into categorias (id, nombre, orden, recargo_envio) values ('e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanadas', 2, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('3e57c43b-6d66-50dd-a6e2-cfb6b0617acb', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de carne picada', null, false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('3e57c43b-6d66-50dd-a6e2-cfb6b0617acb', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('2a115259-a438-515f-9440-93292f8738d3', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de humita', null, false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('2a115259-a438-515f-9440-93292f8738d3', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('f2200563-01fd-55ee-a50c-9fcb5081394f', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de pollo', null, false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('f2200563-01fd-55ee-a50c-9fcb5081394f', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('f968d702-afdb-5874-b1c9-a5dbc27869ca', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de jamón y ananá', null, false, null, 4);
insert into variantes (producto_id, nombre, precio, orden) values ('f968d702-afdb-5874-b1c9-a5dbc27869ca', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('ee4783c2-45bc-5fcf-bc44-92c3241f02d0', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de cebolla y queso', null, false, null, 5);
insert into variantes (producto_id, nombre, precio, orden) values ('ee4783c2-45bc-5fcf-bc44-92c3241f02d0', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('ddb364ae-b725-5405-8122-9977d561fb35', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de roquefort y jamón', null, false, null, 6);
insert into variantes (producto_id, nombre, precio, orden) values ('ddb364ae-b725-5405-8122-9977d561fb35', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('02ef512a-0d02-57f5-a15f-15f455052aaf', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de jamón y queso', null, false, null, 7);
insert into variantes (producto_id, nombre, precio, orden) values ('02ef512a-0d02-57f5-a15f-15f455052aaf', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('92adf46e-c3cd-5f1b-8ebe-a00d297baed5', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de capresse', null, false, null, 8);
insert into variantes (producto_id, nombre, precio, orden) values ('92adf46e-c3cd-5f1b-8ebe-a00d297baed5', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('618e6feb-2abe-58b2-b580-1ada980ec824', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de verdura', null, false, null, 9);
insert into variantes (producto_id, nombre, precio, orden) values ('618e6feb-2abe-58b2-b580-1ada980ec824', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('ada34578-f5f6-5a22-866d-34692907d7a0', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Empanada de salchicha y cheddar', null, false, null, 10);
insert into variantes (producto_id, nombre, precio, orden) values ('ada34578-f5f6-5a22-866d-34692907d7a0', 'Unidad', 3000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('a0049949-6aa1-5dca-a238-644725b2d984', 'e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4', 'Docena surtida', '12 empanadas con gustos surtidos que elige el local (no a elección).', false, null, 11);
insert into variantes (producto_id, nombre, precio, orden) values ('a0049949-6aa1-5dca-a238-644725b2d984', 'Docena', 30000, 1);

-- Hamburguesas
insert into categorias (id, nombre, orden, recargo_envio) values ('8dcc19f4-ba04-5011-ab26-70fde499e583', 'Hamburguesas', 3, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('c4f66321-8cbc-5323-9d7a-7e39e0d69b80', '8dcc19f4-ba04-5011-ab26-70fde499e583', 'Hamburguesa simple', 'Con jamón y queso.', false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('c4f66321-8cbc-5323-9d7a-7e39e0d69b80', 'Unidad', 12500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('2f7e3c05-bde1-5756-835d-87466ed96b58', '8dcc19f4-ba04-5011-ab26-70fde499e583', 'Hamburguesa completa', 'Con jamón, queso, tomate, rúcula y queso reggianito. Incluye papas fritas.', false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('2f7e3c05-bde1-5756-835d-87466ed96b58', 'Unidad', 16500, 1);

-- Milanesas y sándwiches
insert into categorias (id, nombre, orden, recargo_envio) values ('4aa1177e-f76f-5a3b-a44e-4bd5dfa94806', 'Milanesas y sándwiches', 4, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('0e3f60bc-f303-5874-a0b1-81710e58953d', '4aa1177e-f76f-5a3b-a44e-4bd5dfa94806', 'Milanesa al plato', 'Incluye papas fritas. Comen 2, pican 3.', false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('0e3f60bc-f303-5874-a0b1-81710e58953d', 'Napolitana', 34000, 1), ('0e3f60bc-f303-5874-a0b1-81710e58953d', 'Cheddar, panceta y verdeo', 34000, 2), ('0e3f60bc-f303-5874-a0b1-81710e58953d', 'Roquefort y jamón', 34000, 3), ('0e3f60bc-f303-5874-a0b1-81710e58953d', 'Jamón y queso', 34000, 4);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('9a742d53-0850-5a95-b0d4-5622f77413aa', '4aa1177e-f76f-5a3b-a44e-4bd5dfa94806', 'Sándwich de milanesa XXL completo', '45 cm. Jamón, queso, tomate, ajíes, morrones, rúcula y queso reggianito. Comen 2, pican 3.', false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('9a742d53-0850-5a95-b0d4-5622f77413aa', 'Sin papas fritas', 28000, 1), ('9a742d53-0850-5a95-b0d4-5622f77413aa', 'Con papas fritas', 34000, 2);

-- Picadas
insert into categorias (id, nombre, orden, recargo_envio) values ('a6ebfddc-c866-5621-a5d9-c66a3de040e3', 'Picadas', 5, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('7e49cfc3-b571-51ce-9eed-df67414d18e7', 'a6ebfddc-c866-5621-a5d9-c66a3de040e3', 'Tabla de fiambres', 'Jamón crudo, salame, queso sardo, tybo, roquefort, jamón cocido, mortadela, cantimpalo, maníes, aceitunas, pan de pizza y pan casero. Comen 3, pican 4.', false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('7e49cfc3-b571-51ce-9eed-df67414d18e7', 'Tabla', 39000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('d8a55214-fa21-5830-a189-20f3c8427e75', 'a6ebfddc-c866-5621-a5d9-c66a3de040e3', 'Tabla de quesos', 'Roquefort, tybo, sardo, muzzarella, cheddar, aceitunas, maníes, papas pay, ajíes y panes. Comen 2, pican 3.', false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('d8a55214-fa21-5830-a189-20f3c8427e75', 'Tabla', 30000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('df59a8d6-7e9c-58e6-bfa4-2ec4cee8c0ac', 'a6ebfddc-c866-5621-a5d9-c66a3de040e3', 'Picada Heraldo', 'Amplia variedad de fiambres, quesos, aceitunas y panes caseros. Comen 3, pican 4.', false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('df59a8d6-7e9c-58e6-bfa4-2ec4cee8c0ac', 'Tabla', 40000, 1);

-- Papas fritas
insert into categorias (id, nombre, orden, recargo_envio) values ('c4136260-60b6-56ce-b366-d8f1ad699f55', 'Papas fritas', 6, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('91612e06-4dff-575d-b895-5f7c2b5cb693', 'c4136260-60b6-56ce-b366-d8f1ad699f55', 'Papas clásicas', null, false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('91612e06-4dff-575d-b895-5f7c2b5cb693', 'Porción', 10900, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('79d25cc9-f0c5-5c81-8787-0cbbf3e8a720', 'c4136260-60b6-56ce-b366-d8f1ad699f55', 'Papas con cheddar', null, false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('79d25cc9-f0c5-5c81-8787-0cbbf3e8a720', 'Porción', 12500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('32ddce80-e3f0-5b10-93b1-dc3f6edcfce7', 'c4136260-60b6-56ce-b366-d8f1ad699f55', 'Papas con cheddar, panceta y verdeo', null, false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('32ddce80-e3f0-5b10-93b1-dc3f6edcfce7', 'Porción', 12500, 1);

-- Pastas
insert into categorias (id, nombre, orden, recargo_envio) values ('3504ed22-1d58-54af-a88d-02f15d2030b0', 'Pastas', 7, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('ffa3a4fa-3f4b-5cd6-b3a7-4cb710e9dc38', '3504ed22-1d58-54af-a88d-02f15d2030b0', 'Ravioles con salsa boloñesa', null, false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('ffa3a4fa-3f4b-5cd6-b3a7-4cb710e9dc38', 'Porción', 18000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('cc93f21b-bce1-5231-900a-e10b868fbd1d', '3504ed22-1d58-54af-a88d-02f15d2030b0', 'Ravioles parisienne', 'Crema, pollo, jamón y champiñones.', false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('cc93f21b-bce1-5231-900a-e10b868fbd1d', 'Porción', 18000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('0cb069ea-52f8-502d-bfeb-f8c84c6b291d', '3504ed22-1d58-54af-a88d-02f15d2030b0', 'Ravioles al verdeo', 'Salsa de crema de verdeo, suave y sabrosa.', false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('0cb069ea-52f8-502d-bfeb-f8c84c6b291d', 'Porción', 18000, 1);

-- Licuados
insert into categorias (id, nombre, orden, recargo_envio) values ('e4c1bf3b-6e13-5b0b-b29e-8b487baa0367', 'Licuados', 8, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('64ed035e-5fa5-599f-98d7-7ab80a780101', 'e4c1bf3b-6e13-5b0b-b29e-8b487baa0367', 'Licuado de banana', '500 cc, con leche o con agua (indicarlo en la aclaración).', false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('64ed035e-5fa5-599f-98d7-7ab80a780101', '500 cc', 7500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('0348fbb0-9437-5c9e-b99d-138286abf55c', 'e4c1bf3b-6e13-5b0b-b29e-8b487baa0367', 'Licuado de frutilla', '500 cc, con leche o con agua (indicarlo en la aclaración).', false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('0348fbb0-9437-5c9e-b99d-138286abf55c', '500 cc', 7500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('4620d606-cc74-55dc-a334-04fff160240d', 'e4c1bf3b-6e13-5b0b-b29e-8b487baa0367', 'Licuado de durazno', '500 cc, con leche o con agua (indicarlo en la aclaración).', false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('4620d606-cc74-55dc-a334-04fff160240d', '500 cc', 7500, 1);

-- Cafetería
insert into categorias (id, nombre, orden, recargo_envio) values ('433bf308-97f2-5e0c-ba6b-c50725d28756', 'Cafetería', 9, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('fbfef5c5-29fc-517a-b305-0ce356b92b14', '433bf308-97f2-5e0c-ba6b-c50725d28756', 'Café jarrito', null, false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('fbfef5c5-29fc-517a-b305-0ce356b92b14', 'Unidad', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('f83d2eac-a3a0-545e-a41f-d699720cb890', '433bf308-97f2-5e0c-ba6b-c50725d28756', 'Café cortado', null, false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('f83d2eac-a3a0-545e-a41f-d699720cb890', 'Unidad', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('1400ec0d-100a-50b5-acdd-3ecf2504eb4d', '433bf308-97f2-5e0c-ba6b-c50725d28756', 'Café lágrima', null, false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('1400ec0d-100a-50b5-acdd-3ecf2504eb4d', 'Unidad', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('a2e8ffe9-68ec-5282-baee-8aade8ee3dd3', '433bf308-97f2-5e0c-ba6b-c50725d28756', 'Café chico', null, false, null, 4);
insert into variantes (producto_id, nombre, precio, orden) values ('a2e8ffe9-68ec-5282-baee-8aade8ee3dd3', 'Unidad', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('181f267a-90f3-5db9-bd1d-7730cb1041bd', '433bf308-97f2-5e0c-ba6b-c50725d28756', 'Medialunas', null, false, null, 5);
insert into variantes (producto_id, nombre, precio, orden) values ('181f267a-90f3-5db9-bd1d-7730cb1041bd', 'Unidad', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('1c5c2c20-2320-5c13-88da-072dce38a2a6', '433bf308-97f2-5e0c-ba6b-c50725d28756', 'Tostado de pan de pizza XXL', null, false, null, 6);
insert into variantes (producto_id, nombre, precio, orden) values ('1c5c2c20-2320-5c13-88da-072dce38a2a6', 'Unidad', 15000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('f3d8ce06-27aa-584d-b932-92289a17c6c8', '433bf308-97f2-5e0c-ba6b-c50725d28756', 'Ensaimada', null, true, 'Por encargo: pedir con 1 o 2 días de anticipación.', 7);
insert into variantes (producto_id, nombre, precio, orden) values ('f3d8ce06-27aa-584d-b932-92289a17c6c8', 'Mediana', 25000, 1), ('f3d8ce06-27aa-584d-b932-92289a17c6c8', 'Grande', 35000, 2);

-- Bebidas
insert into categorias (id, nombre, orden, recargo_envio) values ('ec10f034-087b-5419-990c-e426b4a3cce4', 'Bebidas', 10, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('31de0469-5342-565c-be0d-03783e632194', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Coca-Cola 1,75 L', null, false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('31de0469-5342-565c-be0d-03783e632194', 'Unidad', 9500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('ad246dd8-7505-52da-85dc-22509762e89e', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Sprite 1,75 L', null, false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('ad246dd8-7505-52da-85dc-22509762e89e', 'Unidad', 9500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('c9ab60fc-c1a3-5f12-90f0-eba435fc247e', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Coca-Cola Zero', null, false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('c9ab60fc-c1a3-5f12-90f0-eba435fc247e', 'Unidad', 9500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('e853a1ba-93a7-5d46-b4c7-d0ff0e197b06', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Crush 2,25 L', null, false, null, 4);
insert into variantes (producto_id, nombre, precio, orden) values ('e853a1ba-93a7-5d46-b4c7-d0ff0e197b06', 'Unidad', 6000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('dc10cfa8-0645-57ed-ac90-5a774dc44dd3', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Coca-Cola 500 ml', null, false, null, 5);
insert into variantes (producto_id, nombre, precio, orden) values ('dc10cfa8-0645-57ed-ac90-5a774dc44dd3', 'Unidad', 3500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('999ad57d-3bc3-564d-8a8b-056ef4e356a5', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Sprite 500 ml', null, false, null, 6);
insert into variantes (producto_id, nombre, precio, orden) values ('999ad57d-3bc3-564d-8a8b-056ef4e356a5', 'Unidad', 3500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('e0d9bd2e-8532-583e-a717-6aa17410f54b', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Fanta 500 ml', null, false, null, 7);
insert into variantes (producto_id, nombre, precio, orden) values ('e0d9bd2e-8532-583e-a717-6aa17410f54b', 'Unidad', 3500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('fd22d16d-bb6b-5ea3-916f-b412a2ea176e', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Aquarius 1,5 L', null, false, null, 8);
insert into variantes (producto_id, nombre, precio, orden) values ('fd22d16d-bb6b-5ea3-916f-b412a2ea176e', 'Unidad', 9500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('72cf82cb-7024-59f1-af1b-34e334e2e1ec', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Aquarius 500 ml', null, false, null, 9);
insert into variantes (producto_id, nombre, precio, orden) values ('72cf82cb-7024-59f1-af1b-34e334e2e1ec', 'Unidad', 3500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('b3f9dfe2-1752-559b-a019-bfaedb5aed33', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Agua mineral 1,5 L', null, false, null, 10);
insert into variantes (producto_id, nombre, precio, orden) values ('b3f9dfe2-1752-559b-a019-bfaedb5aed33', 'Unidad', 8500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('90dff7ec-e5be-5148-9a3c-6a89972a6c06', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Agua mineral', null, false, null, 11);
insert into variantes (producto_id, nombre, precio, orden) values ('90dff7ec-e5be-5148-9a3c-6a89972a6c06', 'Unidad', 3500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('11365bab-d463-5a62-afbc-f5f8681f800f', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Agua con gas', null, false, null, 12);
insert into variantes (producto_id, nombre, precio, orden) values ('11365bab-d463-5a62-afbc-f5f8681f800f', 'Unidad', 3500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('5d85acc9-d3ab-5cab-bb12-eb12187610eb', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Cerveza Pampa (lata)', null, false, null, 13);
insert into variantes (producto_id, nombre, precio, orden) values ('5d85acc9-d3ab-5cab-bb12-eb12187610eb', 'Unidad', 7000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('e15e4b9a-877c-52bb-a8d9-a73ef3b880bb', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Cerveza Heineken 1 L', null, false, null, 14);
insert into variantes (producto_id, nombre, precio, orden) values ('e15e4b9a-877c-52bb-a8d9-a73ef3b880bb', 'Unidad', 12500, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('df5d5db2-00a7-55b7-bfc7-4be69c5a29ae', 'ec10f034-087b-5419-990c-e426b4a3cce4', 'Porrón Estrella Galicia', null, false, null, 15);
insert into variantes (producto_id, nombre, precio, orden) values ('df5d5db2-00a7-55b7-bfc7-4be69c5a29ae', 'Unidad', 7500, 1);

-- Tragos clásicos
insert into categorias (id, nombre, orden, recargo_envio) values ('82afe4ba-fb2c-5e01-84e6-14047d225d44', 'Tragos clásicos', 11, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('bbf40171-e29f-5eea-a28b-fb43c8506d3f', '82afe4ba-fb2c-5e01-84e6-14047d225d44', 'Gancia', 'Aperitivo suave con notas dulces y cítricas.', false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('bbf40171-e29f-5eea-a28b-fb43c8506d3f', 'Vaso', 7000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('0db726f0-1be8-5e42-b8ad-68b22fef2b90', '82afe4ba-fb2c-5e01-84e6-14047d225d44', 'Fernet', 'Licor amargo de hierbas, intenso y clásico.', false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('0db726f0-1be8-5e42-b8ad-68b22fef2b90', 'Vaso', 7000, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('7ef6a613-46b2-567c-b118-c95bc27dada2', '82afe4ba-fb2c-5e01-84e6-14047d225d44', 'Gin tonic', 'Gin premium combinado con tónica refrescante.', false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('7ef6a613-46b2-567c-b118-c95bc27dada2', 'Vaso', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('081d99cf-6f92-51be-b823-99564857cf72', '82afe4ba-fb2c-5e01-84e6-14047d225d44', 'Vodka con speed', 'Vodka suave con bebida energizante fría.', false, null, 4);
insert into variantes (producto_id, nombre, precio, orden) values ('081d99cf-6f92-51be-b823-99564857cf72', 'Vaso', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('4ecd3d2d-afb8-57c3-889b-43fea0674af1', '82afe4ba-fb2c-5e01-84e6-14047d225d44', 'Campari con naranja', 'Campari amargo equilibrado con jugo de naranja.', false, null, 5);
insert into variantes (producto_id, nombre, precio, orden) values ('4ecd3d2d-afb8-57c3-889b-43fea0674af1', 'Vaso', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('9b2db960-b321-5977-aee9-5a325263c78f', '82afe4ba-fb2c-5e01-84e6-14047d225d44', 'Aperol spritz', 'Aperol con espumante y soda refrescante.', false, null, 6);
insert into variantes (producto_id, nombre, precio, orden) values ('9b2db960-b321-5977-aee9-5a325263c78f', 'Copa', null, 1);

-- Tragos de autor
insert into categorias (id, nombre, orden, recargo_envio) values ('f32b57aa-bda4-5781-9f6e-747f2f0bf95d', 'Tragos de autor', 12, false);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('1fd26969-cb9a-52df-90e4-9f4d9243d7ce', 'f32b57aa-bda4-5781-9f6e-747f2f0bf95d', 'Caipirinha', 'Cachaça con lima fresca, azúcar y hielo.', false, null, 1);
insert into variantes (producto_id, nombre, precio, orden) values ('1fd26969-cb9a-52df-90e4-9f4d9243d7ce', 'Vaso', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('dc53707c-36c2-5809-87f0-353cf8634219', 'f32b57aa-bda4-5781-9f6e-747f2f0bf95d', 'Caipiroska', 'Vodka mezclado con lima fresca y azúcar.', false, null, 2);
insert into variantes (producto_id, nombre, precio, orden) values ('dc53707c-36c2-5809-87f0-353cf8634219', 'Vaso', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('48b2619f-b935-51d2-bb6f-bd9f1761e76e', 'f32b57aa-bda4-5781-9f6e-747f2f0bf95d', 'Gin tonic de cítricos', 'Gin con tónica y cítricos naturales.', false, null, 3);
insert into variantes (producto_id, nombre, precio, orden) values ('48b2619f-b935-51d2-bb6f-bd9f1761e76e', 'Vaso', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('98395355-464b-5add-988c-ee09181fb7a1', 'f32b57aa-bda4-5781-9f6e-747f2f0bf95d', 'Gin tonic del bosque', 'Gin con frutos rojos y notas herbales.', false, null, 4);
insert into variantes (producto_id, nombre, precio, orden) values ('98395355-464b-5add-988c-ee09181fb7a1', 'Vaso', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('f62539b8-d875-5419-8a98-1891af9ebb15', 'f32b57aa-bda4-5781-9f6e-747f2f0bf95d', 'Negroni', 'Gin, vermut rosso y Campari balanceados.', false, null, 5);
insert into variantes (producto_id, nombre, precio, orden) values ('f62539b8-d875-5419-8a98-1891af9ebb15', 'Vaso', null, 1);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('7f3e3793-ec34-56de-8993-30b5a6abf068', 'f32b57aa-bda4-5781-9f6e-747f2f0bf95d', 'Daiquiri', 'Ron blanco con frutilla o durazno y limón.', false, null, 6);
insert into variantes (producto_id, nombre, precio, orden) values ('7f3e3793-ec34-56de-8993-30b5a6abf068', 'Frutilla', null, 1), ('7f3e3793-ec34-56de-8993-30b5a6abf068', 'Durazno', null, 2);
insert into productos (id, categoria_id, nombre, descripcion, solo_por_encargo, aviso_encargo, orden) values ('4c896196-6ab2-51bc-999c-ccc89ef86254', 'f32b57aa-bda4-5781-9f6e-747f2f0bf95d', 'Gancia batido', 'Gancia batido con cítricos y hielo.', false, null, 7);
insert into variantes (producto_id, nombre, precio, orden) values ('4c896196-6ab2-51bc-999c-ccc89ef86254', 'Vaso', null, 1);

commit;
