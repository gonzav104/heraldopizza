# U1 — Admin catalog workspace
Objective: implement the approved admin UX proposal while preserving existing backend contracts. Branch: `feat/u1-admin-ux`; base: `b99d8a4`.
Delivery: `feature-branch-chain` approved (2026-10-18), no publication/merge authorized; forecast 1,000–1,600 authored changed lines including tests/styles/docs. Runner: Vitest, ESLint, TypeScript, Vite, local pgTAP/auth and browser checks.

## Specs

- S1 — Approved visual direction: «Superficie clara, fondo gris cálido, tarjetas blancas y texto grafito.» «Acentos moderados en rojo Heraldo.» «Identidad independiente de la carta pública.» «Quiero un administrador moderno y profesional, no simplemente una lista de formularios con nuevos colores.» Acceptance: distinct scoped admin styling, desktop and mobile browser screenshots; preserve public menu styling.
- S2 — Navigation and editing: «Navegación por categorías, búsqueda y filtros.» «Edición rápida de precios y disponibilidad.» «Panel de detalle para modificar otros atributos.» «Diseño responsive, especialmente cómodo desde celulares.» Acceptance: category/name/visibility/stock/encargo/consult-price/pending filters; existing variant prices and existing product/category fields only; no horizontal overflow from 360 px.
- S3 — Drafts and contracts: «Protegé los cambios pendientes al buscar, filtrar, navegar, guardar o cerrar paneles.» «Los guardados inmediatos deben respetar los contratos existentes y no provocar pérdida de otros borradores.» «Conservá autenticación, permisos, RLS, RPC, validaciones y control de concurrencia.» Acceptance: preserve drafts across navigation and immediate saves; explicit granular save/discard; reload/exit protection; accurate feedback for success/error/conflict; exact concurrency tokens and atomic per-product price RPC remain unchanged. Risk: item 4 (UI async save ordering/draft preservation); verifier required after own checks.
- S4 — Scope: «No modifiques el esquema de base de datos ni las reglas comerciales.» «No implementes altas/bajas, promociones, checkout o nuevas funcionalidades comerciales durante U1.» «La administración de imágenes queda fuera del MVP.» «No accedas a Supabase remoto.»
- S5 — Evidence: «Ejecutá los checks pertinentes.» «Verificá visualmente la interfaz en navegador real, tanto en escritorio como en móvil.» «Presentá capturas del administrador y sus principales estados.» «Comprobá búsqueda, filtros, edición de precios, disponibilidad, protección de borradores y errores.» «Verificá que los contratos existentes y los permisos sigan funcionando.» «Reportá cualquier limitación que no hayas podido comprobar.» «El objetivo de cambiar un precio en menos de 30 segundos debe validarse mediante una prueba de uso real; no lo declares cumplido únicamente por pasar tests automatizados.»
- S6 — Roadmap: «No vuelvas a solicitar los datos ni reconstruyas funcionalidades existentes.» «No incluyas trabajo sobre promociones dentro de U1.» «Abrir el menú → seleccionar productos → configurar variantes → agregar al carrito → completar el pedido → enviarlo mediante WhatsApp.» «El QR sigue siendo exclusivamente un código imprimible que abre la URL pública del menú.» Acceptance: record existing promotion evidence and remaining integration; commercial flow and required settings follow U1 before nonblocking admin completeness.
- S7 — Delivery: «Creá una rama específica y seguí las instrucciones del repositorio y Gentle/ODD.» «Usá Conventional Commits con descripciones en español.» «No hagas merge a main sin mi aprobación.» No push/PR/merge authorized.

## Tasks

- T1 | S3–S5 | delegated, catalog unit | verified, commit pending | Protect drafts, granular save feedback and reload/exit; focused RED/GREEN + existing contract tests; commit pending.
- T2 | S1–S4 | delegated, catalog unit | verified, commit pending | Category navigation, search/filters and focused editing with tests; commit pending.
- T3 | S1–S5 | delegated, shell unit | verified, commit pending | Scoped visual workspace, responsive layout and auth presentation preserving behavior; commit pending.
- T4 | S3–S5 | delegated verification | technical checks passed | Full relevant checks, browser screenshots/interactions and independent verification of async/draft invariants; commit pending.
- T5 | S6–S7 | inline | documented, delivery pending | Reconcile roadmap/docs and deliver evidence, limitations and real usability trial status; commit pending.

## Log

- L1 — User authorization, verbatim:

> # Heraldo Pizza — Aprobación de U1
>
> Apruebo la propuesta de **U1 — Rediseño UX/UI del administrador de Heraldo Pizza**, con las siguientes correcciones y condiciones.
>
> ## 1. Propuesta aprobada
>
> Me parece adecuada la dirección visual:
>
> - Superficie clara, fondo gris cálido, tarjetas blancas y texto grafito.
> - Acentos moderados en rojo Heraldo.
> - Identidad independiente de la carta pública.
> - Navegación por categorías, búsqueda y filtros.
> - Edición rápida de precios y disponibilidad.
> - Panel de detalle para modificar otros atributos.
> - Diseño responsive, especialmente cómodo desde celulares.
> - Protección de borradores y feedback claro.
>
> Tenés libertad para perfeccionar la composición y las interacciones durante la implementación.
>
> Quiero un administrador moderno y profesional, no simplemente una lista de formularios con nuevos colores.
>
> ## 2. Corregir el roadmap de promociones
>
> Las promociones reales de Heraldo Pizza ya fueron proporcionadas y se trabajó en su implementación.
>
> Tu roadmap sigue clasificándolas como completamente pendientes.
>
> No vuelvas a solicitar los datos ni reconstruyas funcionalidades existentes.
>
> Revisá la evidencia disponible en el repositorio, historial, seeds y componentes relacionados para distinguir qué está efectivamente implementado y si queda alguna integración pendiente.
>
> Si encontrás una discrepancia, documentala para resolverla posteriormente.
>
> **No incluyas trabajo sobre promociones dentro de U1.**
>
> ## 3. Prioridad posterior a U1
>
> El objetivo comercial principal es que el cliente pueda:
>
> Abrir el menú → seleccionar productos → configurar variantes → agregar al carrito → completar el pedido → enviarlo mediante WhatsApp.
>
> Por eso, después de U1 debemos priorizar el cierre de ese recorrido, incluida la configuración operativa necesaria.
>
> Las funcionalidades administrativas restantes pueden organizarse en unidades posteriores sin bloquear innecesariamente la recepción de pedidos.
>
> El QR sigue siendo exclusivamente un código imprimible que abre la URL pública del menú.
>
> ## 4. Reglas de implementación
>
> - Reutilizá el administrador actual.
> - Conservá autenticación, permisos, RLS, RPC, validaciones y control de concurrencia.
> - Protegé los cambios pendientes al buscar, filtrar, navegar, guardar o cerrar paneles.
> - Los guardados inmediatos deben respetar los contratos existentes y no provocar pérdida de otros borradores.
> - No modifiques el esquema de base de datos ni las reglas comerciales.
> - No implementes altas/bajas, promociones, checkout o nuevas funcionalidades comerciales durante U1.
> - La administración de imágenes queda fuera del MVP.
> - No accedas a Supabase remoto.
>
> ## 5. Autorización
>
> Queda autorizada la implementación de U1.
>
> Creá una rama específica y seguí las instrucciones del repositorio y Gentle/ODD.
>
> Trabajá de manera incremental y eficiente, sin sobreingeniería ni revisiones redundantes.
>
> Usá Conventional Commits con descripciones en español.
>
> ## 6. Validación y entrega
>
> Antes de considerar U1 terminada:
>
> - Ejecutá los checks pertinentes.
> - Verificá visualmente la interfaz en navegador real, tanto en escritorio como en móvil.
> - Presentá capturas del administrador y sus principales estados.
> - Comprobá búsqueda, filtros, edición de precios, disponibilidad, protección de borradores y errores.
> - Verificá que los contratos existentes y los permisos sigan funcionando.
> - Reportá cualquier limitación que no hayas podido comprobar.
>
> El objetivo de cambiar un precio en menos de 30 segundos debe validarse mediante una prueba de uso real; no lo declares cumplido únicamente por pasar tests automatizados.
>
> **No hagas merge a main sin mi aprobación.**
>
> Al finalizar, presentame los cambios realizados, resultados de pruebas, capturas visuales y cualquier decisión pendiente.

- L2 — Promotions evidence: `1922f02` introduced the owner's eight real promotions as development fixtures; `src/data/prototype-promotions.ts` retains titles/prices/clarification; `dev-promotions.ts` loads them only under DEV; `supabase-catalog-repository.ts:65` returns `promotions: []`. `odd/tasks/hero-y-promos.md` records existing card/cart/bundle/browser verification. Correct classification: data and presentation implemented, production source/admin/validity integration pending. Preserve these components and data, no promotions changes in U1. Follow-up discrepancy: supplied “Docena de empanadas a elección” versus the general closed-combo rule must be reconciled before production integration, without inventing or deleting supplied data.
- L3 — Baseline accepted: main `b99d8a4`, 316 Vitest and 138 local pgTAP passing; lint/types/build/bundle/auth passing. No redundant rerun before first targeted RED. Read implementation/contracts/tests; no writer trigger, so implement inline. Full independent verification required at end for item 4. Native RDD effective on (default), candidate consent remains separate.
- L4 — Forecast exceeds the approximately 400-line delivery threshold. Proposed feature-branch-chain keeps the integrated redesign off main while allowing coherent review slices. Strategy selection required before first work-unit commit by installed chained-pr/ODD rules; no PR creation implied.
- L5 — User approval verbatim: «si aprobado». Feature-branch-chain selected. Writer trigger now holds: two independent multi-file units (catalog workspace and admin shell/access presentation) launched together with disjoint edit surfaces. Catalog owns optional `onWorkChange({dirty,saving})`; shell consumes it for exit protection. Parent owns git, docs, integration and browser checks. Model assignment `gpt-6.1-luna` is unavailable in the exposed runtime; workers inherit the active model rather than requesting an unavailable override.
- L6 — User continuation verbatim: «segui» (twice). Workers initially hit runtime usage limits; catalog resumed and completed, shell partial handoff verified by parent. Catalog RED: 3 new failures before implementation; GREEN: 31 tests. Parent shell seam: 20 tests pass. Parent search regression RED: 1 failure, then 51 focused tests pass after filtering empty category sections without unmounting drafts. Scoped CSS and admin TSX normalized before review.
- L7 — Visual readback found too much space taken by expanded price forms and mobile filters. Prices now use compact summaries with retained inline editors; mobile filters collapse behind a labeled toggle with active count. Browser Chromium at 1440, 390 and 360 px: search/category draft retention, close/reopen, stock save preserving data/price drafts, granular discard, price save/validation, conflict, cancelled reload/signout, combined filters, modal keyboard focus, disabled in-flight controls and retry all passed with no page errors/overflow. Captures: `/tmp/heraldopizza-u1-capturas/01` through `09` PNGs. Browser uses in-memory fixture (source catalog), not a live database round-trip; local database proof is separate.
- L8 — Local permissions proof: 138 pgTAP tests/6 files PASS; db:check-auth PASS; no reset/start/remote. Full frontend suite: 330/34 PASS; lint/types/build/bundle PASS before final layout/search adjustment; final rerun in progress. Risk assessment with item 4: high, review due. Independent verifier runs after own focused checks in fresh scratch.
- L9 — Actual authored size exceeds forecast (about 2,250 lines including expanded readable CSS and tests). One cohesive slicing pass: tracking/roadmap; catalog draft/navigation behavior plus its tests/styles; shell/access styling and exit protection plus tests. The latter two exceed 400 lines, so any future PR needs a justified size exception or a separate agreed slicing plan. No PR is being created now; no source compression or unrelated formatting is used to meet a line target.

- L10 — Independent verification reproduced one candidate-caused retry-snapshot defect in both directions: price retry reverted acknowledged stock/token; status retry reverted acknowledged prices. Both original probes failed candidate and passed b99d8a4. Correction merges only the response scope into current state, preserving original request tokens. Committed regression preparation: RED 2 failed; GREEN 53 focused. Independent scoped recheck: original probes plus regressions, 4 passed.
- L11 — Final technical evidence: 332 tests/35 files PASS; lint, typecheck, build and bundle PASS; Chromium 8 grouped interaction checks PASS with no page errors at desktop/mobile sizes. Local pgTAP 138/6 and auth PASS. No remote Supabase, schema, service, RPC or RLS changes. Browser persistence/errors are simulated, not a live end-to-end database round-trip. Physical-device/Safari testing and owner-timed under-30-second usability trial are unverified; no timing claim. Native review and work-unit commits remain pending.
