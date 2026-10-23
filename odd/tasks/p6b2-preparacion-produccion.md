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
| T2 Bundle check reports and asserts the WhatsApp switch (+ CI) | S2, S5 | inline (item 5) | pending | |
| T3 E2E of the enabled link on phone and desktop, WhatsApp intercepted | S2, S5 | inline (item 5) | pending | |
| T4 Read-only deployment verification SQL + deployment procedure | S3, S4 | inline (item 5) | pending | |
| T5 Decisions, README and privacy review | S4 | inline | pending | |

## Log

- L1 (2026-10-23) User's request: «Heraldo Pizza — P6b-2: Preparación final para producción» (sections 1–6), quoted in S1–S7.
- L2 Finding while reading the seeds: `docs/seed_catalogo.sql` is NOT idempotent (plain inserts in one transaction, variants without ids), unlike `supabase/seed_promociones.sql` (`on conflict (codigo) do nothing`). Production loading must be conditional on empty tables.
- L3 Local note: a locked worktree `.claude/worktrees/ajuste-layout-desktop` (branch `feat/layout-desktop`, not part of this task) makes local `eslint` and `vitest` pick up its files; local checks run with `--ignore-pattern '.claude/**'` and `--exclude '.claude/**'`. CI is unaffected (the directory is untracked). Left untouched.
