# U3a — Catalog database on Supabase (schema, RLS, seed, tests)

Objective: versioned Supabase schema for the catalog with hardened RLS and local pgTAP tests; no frontend changes and nothing applied to the remote project.
Branch: `feat/u3a-catalogo-supabase` (from `main` at `9dcc1b6`). Delivery: work-unit commits, push and PR only with the user's authorization. Test runner: `supabase test db` (pgTAP) on the local stack; Vitest/ESLint/tsc/build stay green.

## Specs

- S1 Totals: «Verificá los totales reales del seed y resolvé cualquier discrepancia documental.» Real seed: 13 categories, 84 products, 110 variants (84 `insert` statements), 17 variants without price in 16 products. «Apruebo corregir AGENTS.md con los totales reales del seed en un commit documental.»
- S2 Tooling: «Apruebo también utilizar Supabase CLI, migraciones SQL versionadas, RLS y pruebas pgTAP.» CLI as a pinned devDependency; no other dependency.
- S3 Schema (approved design): tables `categorias`, `productos`, `variantes`, `administradores` with Spanish names equal to the seed; new columns `visible`, `sin_stock`, timestamps, `variantes.id`; `precio integer null check (precio is null or precio > 0)`; made-to-order requires its notice; product → category `restrict`, variant → product `cascade`; `unique(producto_id, nombre)`; no photo columns.
- S4 Prices to consult: «Apruebo el diseño de U3a con la opción A para los productos sin precio: deben aparecer como «Consultar en barra», pero no pueden agregarse al carrito ni interpretarse como precio $0.»
- S5 Hardening: «Endurecé el diseño de es_admin(), sus permisos de ejecución y las políticas RLS.» `privado.es_admin()` outside the exposed schemas, `security definer`, `stable`, `search_path = ''`, execute revoked from `public` and `anon`; read policies never call it; write policies require it in `using` and `with check`; `administradores` with RLS and no policies, all privileges revoked from `anon` and `authenticated`.
- S6 Negative tests: «Incluí pruebas que demuestren que usuarios anónimos y autenticados sin rol administrador no pueden modificar datos ni elevar sus privilegios.» Each denied write is paired with a check that the target row is intact.
- S7 Scope of the tests: «No confundas pruebas RLS con pruebas de autenticidad de JWT.» The tests set roles and claims directly in the database; they prove what the policies allow for a given identity, not that Supabase rejects a forged token (that is the API gateway's job and is out of scope here).
- S8 Local only: «Diseñá las pruebas locales para que no requieran credenciales remotas.»
- S9 Separation: «Mantené separadas las migraciones de esquema y la carga inicial de datos.» Migrations hold schema only; the seed loads from `docs/seed_catalogo.sql` through `supabase/config.toml`, on the local stack.
- S10 Remote: «No apliques migraciones ni escribas en el Supabase remoto sin mi autorización.» «No apliques migraciones al Supabase remoto.»
- S11 Delivery: «podés preparar U3a siguiendo ODD, con commits pequeños en español, verificación independiente y revisión nativa para los cambios de seguridad.» «Presentame el resultado y las evidencias antes de autorizar push o merge.»

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S4 | inline | pending | |
| T2 | S2, S8, S9 | inline | pending | |
| T3 | S3, S4, S9 | inline | pending | |
| T4 | S5, S6, S7 | inline | pending | |
| T5 | S8 | inline | pending | |
| T6 | S1–S11 | delegated verifier | pending | |

- T1 Docs: real totals and the approved policy for prices to consult in `AGENTS.md`.
- T2 Supabase CLI (pinned), `supabase init`, seed path to `docs/seed_catalogo.sql`, npm scripts for the local database.
- T3 Catalog schema migration and pgTAP tests for constraints and seed integrity.
- T4 Admin table, `privado.es_admin()`, grants, RLS, and negative/escalation pgTAP tests.
- T5 CI job that starts the local stack and runs `supabase test db`.
- T6 Independent verification of the whole feature; native review of the security commits.

Routes: all inline (one understood change per task, no parallel units, no writer reason).

## Log

- L1 (2026-10-16) User's request: «Apruebo el diseño de U3a con la opción A para los productos sin precio: deben aparecer como «Consultar en barra», pero no pueden agregarse al carrito ni interpretarse como precio $0. Apruebo también utilizar Supabase CLI, migraciones SQL versionadas, RLS y pruebas pgTAP. Antes de comenzar U3a: 1. Cerrá primero el Paso 0. […] 2. Verificá los totales reales del seed y resolvé cualquier discrepancia documental. 3. Endurecé el diseño de es_admin(), sus permisos de ejecución y las políticas RLS. 4. Incluí pruebas que demuestren que usuarios anónimos y autenticados sin rol administrador no pueden modificar datos ni elevar sus privilegios. 5. Diseñá las pruebas locales para que no requieran credenciales remotas. 6. Mantené separadas las migraciones de esquema y la carga inicial de datos. 7. No apliques migraciones ni escribas en el Supabase remoto sin mi autorización. Una vez integrado el Paso 0 y disponible Docker con WSL2, podés preparar U3a siguiendo ODD, con commits pequeños en español, verificación independiente y revisión nativa para los cambios de seguridad. Presentame el resultado y las evidencias antes de autorizar push o merge.»
- L2 (2026-10-16) User: «Para U3a: Apruebo corregir AGENTS.md con los totales reales del seed en un commit documental. Mantené el diseño de seguridad endurecido y las pruebas negativas. No confundas pruebas RLS con pruebas de autenticidad de JWT. No apliques migraciones al Supabase remoto. No comiences la implementación hasta confirmar que Docker funciona en WSL2.»
- L3 Preconditions met: Paso 0 merged into `main` as `9dcc1b6` (PR #15, CI success on the push to main). Docker 29.8.0 reachable from WSL2; `docker run hello-world` works. Supabase CLI pinned to 2.119.0, the newest release older than two weeks (2.121.0 was two days old).
