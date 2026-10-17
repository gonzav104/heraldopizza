# U5 — Catalog management in /admin

Objective: the administrator edits the existing catalog from `/admin` (names, descriptions, made-to-order, stock, visibility, prices); changes persist in local Supabase and the public menu shows them on reload.
Branch: `feat/u5-gestion-catalogo` (from `main` at `b0d995c`). Delivery: work-unit commits; push, PR, and merge only after the workflow gates and with the user's authorization. Test runners: Vitest, pgTAP, Playwright (`@playwright/test` 1.63.0, E2E in CI).

## Specs

- S1 Scope (approved design): edit the existing catalog only; no creation, deletion, or reordering. Out: «altas/bajas; reordenamiento; imágenes; carrito/WhatsApp; rediseño; Supabase remoto.»
- S2 Editable fields: `categorias.nombre`, `categorias.visible`; `productos.nombre`, `descripcion`, `sin_stock`, `visible`, `solo_por_encargo`, `aviso_encargo`; `variantes.precio`. Read-only: ids, `orden`, `recargo_envio`, `categoria_id`, variant `nombre` (pricing depends on «Entera»/«Media»), `producto_id`, timestamps.
- S3 Prices: whole pesos; «16000» or «16.000» accepted; decimals, 0, negatives, and text rejected; `null` only through an explicit «Consultar en barra»; an empty field is never saved; never 0. Pizza «Entera»/«Media» saved together.
- S4 «El control de concurrencia de precios debe proteger realmente las variantes modificadas y renovar el token/timestamp correspondiente dentro de la misma transacción.»
- S5 «actualizar_precios_producto() debe validar explícitamente: que todas las variantes pertenecen al producto recibido; que no haya IDs duplicados; que todos los precios sean válidos; que cualquier error produzca rollback completo. No depender de RLS para validar pertenencia producto-variante.»
- S6 «Editar nombre de categoría/producto no debe regenerar slug, UUID ni otros identificadores técnicos.»
- S7 «Validar nombres vacíos/solo espacios y mantener las reglas actuales de null/vacío para descripción y aviso de encargo.»
- S8 RLS unchanged and authoritative; the RPC is `SECURITY INVOKER`; a write that touches 0 rows is never reported as success. Single-row updates carry `actualizado_en` as an optimistic lock and return the updated row.
- S9 UI: per-row states (unchanged, modified, saving, saved, error with retry), conflict and validation messages, «Oculta N productos» when hiding a category; the panel shows the row returned by the server; the public menu shows changes on reload.
- S10 Tests: unit (parser/validators, mapping, adapter, UI), pgTAP (RPC and per-role updates, inventory), browser at 360 and 1280 px, and a committed Playwright E2E in CI: admin changes a value → Supabase persists it → the public menu shows it.
- S11 «Seguí ODD/Gentle, verificador independiente y gates de revisión. Reportame la implementación local antes de push/PR.»

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S4, S5, S8 | inline | pending | |
| T2 | S2, S3, S6, S7, S8 | inline | pending | |
| T3 | S3, S9 | inline | pending | |
| T4 | S2, S6, S7, S9 | inline | pending | |
| T5 | S10 | inline | pending | |
| T6 | S1–S11 | verifier + native review | pending | |

- T1 Migration `public.actualizar_precios_producto()` with pgTAP.
- T2 `AdminCatalogRepository` port, Supabase adapter, pure price parser and validators.
- T3 Panel listing, inline prices, «Sin stock» and «Visible» toggles.
- T4 Product data editor (name, description, made-to-order with notice) and category name.
- T5 Playwright E2E and its CI step.
- T6 Independent verification and native review.

Routes: inline (one feature, sequential units; no writer reason).

## Log

- L1 (2026-10-17) User's request: «Aprobado el diseño de U5 y aprobada la opción recomendada: E2E con Playwright commiteado y ejecutándose en CI. Implementá según el diseño, con estas condiciones adicionales: - El control de concurrencia de precios debe proteger realmente las variantes modificadas y renovar el token/timestamp correspondiente dentro de la misma transacción. - actualizar_precios_producto() debe validar explícitamente: - que todas las variantes pertenecen al producto recibido; - que no haya IDs duplicados; - que todos los precios sean válidos; - que cualquier error produzca rollback completo. No depender de RLS para validar pertenencia producto-variante. - Editar nombre de categoría/producto no debe regenerar slug, UUID ni otros identificadores técnicos. - Validar nombres vacíos/solo espacios y mantener las reglas actuales de null/vacío para descripción y aviso de encargo. El resto del alcance queda aprobado tal como fue propuesto. No ampliar U5 con: - altas/bajas; - reordenamiento; - imágenes; - carrito/WhatsApp; - rediseño; - Supabase remoto. Seguí ODD/Gentle, verificador independiente y gates de revisión. Reportame la implementación local antes de push/PR.»
- L2 Design facts checked: prices live only in variants (no base price); `line-pricing.ts` treats a variant named «Media» as a half pizza, so variant names stay read-only; the public menu already renders out-of-stock products as not orderable. `@playwright/test` pinned to 1.63.0, the newest release older than two weeks.
