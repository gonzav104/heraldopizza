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
| T1 | S4, S5, S8 | inline | done | `fb3bacc` |
| T2 | S2, S3, S6, S7, S8 | inline | done | `5818b19` |
| T3 | S3, S9 | inline | done | `f1596f2` (with T4), fix `cd260f2` |
| T4 | S2, S6, S7, S9 | inline | done | `f1596f2` (same component as T3) |
| T5 | S10 | inline | done | `8cc4c51` |
| T6 | S1–S11 | verifier + native review | done | verifier PASS except one S9 blocker, fixed in `c3db86c`; native review approved |

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
- L3 T1 (`fb3bacc`): pgTAP RED (function missing) → GREEN, 34 tests: privileges (authenticated only, security invoker, empty search_path), every validation (empty, not a list, missing keys, 0, negative, decimal, text, out of range, duplicates) with nothing changed, explicit ownership (another product's variant together with a valid one, unknown id), optimistic lock (all stale and one stale of two roll back both), explicit null, renewed tokens returned. Mutations caught: no token check (tests 27–30), no ownership filter (20, 22–23, 26).
- L4 T2 (`5818b19`): validators 26 tests (implementation written before the run, so RED was shown by mutation: no notice rule → 2 fail, no thousands dot → 3 fail); adapter 16 tests RED → GREEN (only editable columns, guarded by id and token, zero rows = conflict, error-code mapping, tokens kept as returned text).
- L5 T3/T4 (`f1596f2`): one component, so one commit; 16 editor tests RED → GREEN. Probe on the real local stack: a saved price persists, the token round-trips with microseconds through PostgREST, three consecutive saves on the same row do not conflict.
- L6 Defect found by the E2E and fixed in `cd260f2`: toggles only showed the saved state, so a tap did not visibly change them until the database answered; they now show the requested state while saving and the saved row afterwards (old state plus error if the save failed). Unit test RED → GREEN.
- L7 T5 (`8cc4c51`): Playwright 1.63.0, 5 scenarios on the local stack, all passing: price saved → persisted (Data API) → public menu shows «$ 18.750»; out of stock → public button disabled; hidden → gone from the menu and back; rename keeps the id; two tabs → second save refused as a conflict, price unchanged. Each run resets the local database; non-local APIs are refused. CI installs Chromium and runs it in the database job.
- L8 Browser at 360 and 1280 px (screenshots in `../heraldopizza-capturas/u5/`): no horizontal overflow; every control at least 44 px tall.
- L9 Checks: 276 Vitest tests, typecheck, lint, build (initial chunk 107.0 kB gzip; AdminRoute 62.0 kB gzip), `check:bundle`, 137 pgTAP, `db:check-auth`, 5 E2E.
- L10 Independent verifier: PASS on S1–S8 and S10 (26 malformed RPC payloads raised and left the variants unchanged; ownership refused even as postgres with RLS bypassed; a concurrent second caller waited on the lock and got HP409; anon and a real non-admin changed nothing over HTTP). One S9 blocker: no «modified» state, and a stale «Guardado» stayed visible while new values were typed. Fixed in one batch: `c3db86c` («Cambios sin guardar», «Nombre sin guardar», feedback cleared on edit; 2 tests RED → GREEN). Advisories applied: `d902b60` saves a whole price written with a decimal point (16000.0) as that integer instead of failing with 22P02 (pgTAP now 35 cases in this file, 138 in total; real decimals stay rejected); `f4968d0` resets the local database after the E2E run.
- L11 Native review of `b0d995c..f4968d0` (four lenses, consented): approved and acknowledged. Non-blocking follow-ups, recorded instead of another correction loop: a pending category-name edit is overwritten when «Visible» is toggled before saving it; CI does not upload Playwright traces/report on failure; the E2E project is named «mobile» but uses a desktop device at 390 px; the product column list is duplicated in the adapter; load failures are typed as save errors; the toggle's visible text is cut from its accessible label at the colon; `createSupabaseAdminAuth` has no caller now; the RPC's price checks rely on evaluation order before casting (a string price could surface as a non-HP422 error; the panel never sends one).
- L12 Final checks: 278 Vitest tests, typecheck, lint, build, `check:bundle`, 138 pgTAP (also right after an E2E run), 5 E2E, `db:check-auth`.

- L13 (2026-10-17) User: «Corregí antes de publicar el bug del nombre de categoría. [...] Quiero que el draft permanezca estable hasta que ocurra una de estas cosas: el usuario guarda correctamente; recarga explícitamente los datos; abandona/cancela la edición según el comportamiento definido. [...] Mantené el cambio acotado a este problema.» Fixed in `139a997`: only a saved name replaces the category-name draft; an explicit «Recargar catálogo» discards it (there is no separate cancel for the category name). RED: the visibility-save test failed before the fix; the other-row and reload tests guard the defined behavior. Checks: 281 Vitest tests, typecheck, lint, build, `check:bundle`, 138 pgTAP, 5 E2E. Native review (four lenses, consented): approved and acknowledged, nothing on the fix itself; it repeated the known follow-ups and added two: «Reintentar» after a lost response reuses the old token and ends in a conflict; a non-admin reaching the RPC gets HP404 rather than HP403.
