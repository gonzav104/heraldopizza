# P6b-2 (preparación) — Recorrido comercial listo y camino a producción

Objective: leave the commercial flow (Carta → Carrito → Checkout → Revalidación → Mensaje → WhatsApp) validated, and the way to publish it written and checkable, WITHOUT enabling real WhatsApp, deploying, or touching remote Supabase. Branch: `chore/p6b2-preparacion-produccion` (from `main` at `01e8dd5`). Delivery: work-unit commits; no push, PR, or merge without authorization. Runners: Vitest, Playwright E2E (local Supabase), pgTAP unchanged; Chromium.

## Specs

- S1 Audit: «Revisá el recorrido completo: Carta → Selección de productos → Carrito → Checkout → Revalidación → Mensaje → WhatsApp.» Verify products and variants, promotions, the personalized dozen, updated prices, out-of-stock products, expired or disabled promotions, payment methods, the 8 % credit surcharge on pickup, delivery paid apart, acceptance of price changes, cancellations, network errors and timeout, mobile operation. «No dupliques funciones existentes ni modifiques reglas comerciales.»
- S2 WhatsApp: check the official number `5491170582325`, correct URL construction and message encoding, opening from phones and desktop, that the link exists only after a current verification, that the customer is the one who sends. «Revisá la configuración `VITE_WHATSAPP_ENABLED` y el comportamiento del build.» «No habilites todavía el enlace real en producción.» «No envíes mensajes al número del local durante las pruebas.»
- S3 Supabase: which migrations production needs and in which order; how to check they were applied; how to avoid duplicating promotions; how to verify RLS and permissions; how to check published prices and products against the authorized data; how to recover if an operation fails. «Prepará un procedimiento de despliegue con verificaciones previas y posteriores.» «No ejecutes migraciones, seeds ni modificaciones en Supabase remoto.»
- S4 Documentation: record the approved decisions («Todo cambio de importe puede requerir aceptación, incluso una reducción.» «Editar el carrito invalida la verificación anterior.» «Los cambios de precio no aceptados deben seguir requiriendo aceptación después de revalidar.»); review the privacy notices and the deployment instructions.
- S5 Validation: tests, typecheck, lint, build, E2E; independent verifier and Gentle AI when applicable; commits in Spanish.
- S6 Delivery report: (1) is the commercial flow ready for production, (2) exactly what is missing to enable WhatsApp, (3) what is missing to deploy Supabase, (4) pending risks, blockers versus minor, (5) the recommended publishing procedure.
- S7 Limits: «No hagas push, PR ni merge sin autorización.» «No modifiques `.env.local`, no actives WhatsApp, no despliegues y no accedas a Supabase remoto.» Minimal documentation and test changes only. Stop at the end for the user's review.

## Tasks

| ID | Specs | Route | Status | Commit / evidence |
|---|---|---|---|---|
| T1 Verification tests for promotions and the dozen | S1, S5 | inline | done | tests added against existing behavior (no production change needed): 5 pass |
| T2 Bundle check reports and asserts the WhatsApp switch (+ CI) | S2, S5 | inline (item 5) | done | RED (module missing) → GREEN; verified against real builds absent/false/true |
| T3 E2E of the enabled link on phone and desktop, WhatsApp intercepted | S2, S5 | inline (item 5) | done | E2E 21/21 (12 existing + 9 new: Android, iPhone emulated on Chromium, desktop); zero requests reached WhatsApp |
| T4 Read-only deployment verification SQL + deployment procedure | S3, S4 | inline (item 5) | done | `supabase/verificar_despliegue.sql` (20 checks) proven against 9 kinds of damage rolled back; `api:verify` (GET only); both in CI; `docs/despliegue.md` |
| T5 Decisions, README and privacy review | S4 | inline | pending | |

## Log

- L1 (2026-10-23) User's request: «Heraldo Pizza — P6b-2: Preparación final para producción» (sections 1–6), quoted in S1–S7.
- L2 Finding while reading the seeds: `docs/seed_catalogo.sql` is NOT idempotent (plain inserts in one transaction, variants without ids), unlike `supabase/seed_promociones.sql` (`on conflict (codigo) do nothing`). Production loading must be conditional on empty tables.
- L3 Local note: a locked worktree `.claude/worktrees/ajuste-layout-desktop` (branch `feat/layout-desktop`, not part of this task) makes local `eslint` and `vitest` pick up its files; local checks run with `--ignore-pattern '.claude/**'` and `--exclude '.claude/**'`. CI is unaffected (the directory is untracked). Left untouched.
- L4 Build behavior observed: Vite embeds `VITE_WHATSAPP_ENABLED:`<value>`` (backticks) only when the build environment defines it, in every default-parameter object literal of `import.meta.env`; absent otherwise. The normal local build (which also reads any untracked `.env*` file) has no such definition, so `.env.local` does not turn the link on. The same build embeds the LOCAL Supabase URL and publishable key: a build for production must be made in a clean environment with the production values, never from a developer machine's `.env.local`.
- L5 Limits of what can be verified here: only Chromium is installed, so the iPhone project emulates viewport, user agent, and touch on Chromium and does NOT exercise Safari's own pop-up rules; no real phone and no real WhatsApp app were used. The link is a plain `<a target="_blank" rel="noopener noreferrer">` followed by the browser from the tap, the pattern phones do not block. Real-device opening on Android and iPhone must be checked by a person at activation (P6b-2), with the owner's own number, before announcing it.
- L6 Deployment verification: expected values were computed from the freshly seeded local DB (13/84/110 with 17 null-price variants, 8 promotions, sums 1465000 and 311500, six migrations, md5 fingerprints of policies, grants, functions, triggers and data). Mutation probes inside rolled-back transactions flipped exactly the expected rows (price change, RLS off, anon grant, dropped policy, missing or extra promotion, function turned security definer, anon usage on `privado`, extra migration); a `$ 0` price is refused by the database itself. Nothing was run against a remote project; `api:verify` refuses a remote URL without `--remoto`, refuses secret-looking keys, and only issues GET requests.
