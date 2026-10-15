# Decisiones pendientes e inconsistencias

Relevado el 2026-10-15 a partir de `docs/requerimientos.pdf` (PDF) y `docs/seed_catalogo.sql` (SQL).

**Decisión vigente (2026-10-15, responsable del proyecto):** el SQL es la fuente provisional de productos y precios. Las diferencias con el PDF quedan registradas acá; no se resuelven con datos inventados.

## Inconsistencias entre PDF y SQL

| # | Tema | PDF | SQL | Estado |
|---|------|-----|-----|--------|
| 1 | Volumen del catálogo | 70 productos en 10 categorías | 81 productos en 12 categorías | Se usa el SQL (provisional) |
| 2 | Categorías (RF-01) | Menciona panchos y ensaimadas como categorías | No hay panchos; la ensaimada está dentro de Cafetería. Hay hamburguesas, picadas, papas fritas, pastas, cafetería y tragos de autor | Se usa el SQL (provisional) |
| 3 | Productos sin precio vs RN-01 | RN-01: un producto visible necesita una variante con precio > 0 | 16 productos tienen todas sus variantes con precio `NULL` ("Consultar en barra"): 4 cafés, medialunas, 4 tragos clásicos y 7 de autor | Se contemplan en el modelo y **no se pueden agregar al carrito**. Falta definir si se muestran |
| 4 | Recargo por pizza | RF-62: línea aparte. RN-15: "suma $1.000 a su precio" | — | Falta definir cómo se muestra |
| 5 | Recargo por lluvia | RN-16 dice "al momento del retiro" | — | Parece referirse al envío; falta confirmar |

## Datos faltantes

- **Zonas de envío y costos** (RF-19, RF-63, RN-14): el PDF remite a un "documento técnico" que no está en el repo. Solo se conocen rangos (barrios de $2.500 a $18.000, fábricas de $3.000 a $10.000).
- **Promociones** (RF-10 a RF-12): no hay ninguna cargada.
- **Descripciones:** 36 productos tienen descripción `NULL`.
- **Fotos de productos:** no hay ninguna; el PDF indica que se cargan después del diseño.
- **Horario nocturno:** el turno es de 19 a 00, pero RN-16 habla de un recargo "desde las 00:00 hasta el fin del turno". Falta confirmar si el turno sigue después de medianoche.
- **Recargo nocturno** (RF-65): es F2 y queda fuera del MVP salvo decisión expresa.
- **Dominio** (RNF-19): `heraldopizza.com.ar` todavía no está comprado. No imprimir QR definitivos.
