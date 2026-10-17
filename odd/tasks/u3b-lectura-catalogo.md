# U3b — Public menu reads the catalog from Supabase

Objective: the public menu loads its catalog from the Supabase Data API through one repository, with loading and error states; the privacy notice and its guard follow the change.
Branch: `feat/u3b-lectura-catalogo` (from `main` at `347ad05`). Delivery: work-unit commits; push, PR, and merge only with the user's authorization. Test runner: Vitest (`npm test`); pgTAP unchanged.

## Specs

- S1 «usar fetch directo a Supabase Data API;» «no instalar @supabase/supabase-js en la carta pública;»
- S2 «encapsular fetch únicamente en SupabaseCatalogRepository;»
- S3 «mantener FixtureCatalogRepository solo para tests y #sistema, nunca como fallback;»
- S4 «una sola lectura agregada, sin N+1;» «no usar select=*;»
- S5 «usar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY;» «credentials: "omit";»
- S6 «si Supabase falla: error + Reintentar, sin fixture silencioso;»
- S7 «mantener mapper puro y null como null;»
- S8 «actualizar privacy-claims.test.ts para permitir red solo en el adaptador aprobado;»
- S9 Privacy notice text, verbatim: «La carta y sus precios se descargan desde nuestra base de datos alojada en Supabase. Al consultar la carta no enviamos a esa base de datos el contenido de tu pedido ni los datos que ingreses para armarlo. El pedido permanece en tu dispositivo hasta que decidís enviarlo por WhatsApp.» and «No utilizamos cookies ni herramientas de análisis.»
- S10 «No tocar Supabase remoto.» «No mergear sin autorización.»

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S2, S4, S5, S7 | inline | done | `9d7b69b` (guard fixes `174d6c8`) |
| T2 | S3, S6 | inline | done | next commit |
| T3 | S8, S9 | inline | done | `9d7b69b` (guard), next commit (notice) |
| T4 | S1–S10 | inline checks + browser on the local stack | done | L5, L6 |

- T1 Domain port `CatalogRepository`, pure mapper, `SupabaseCatalogRepository` (the only `fetch`), `.env.example`.
- T2 App loads through the repository: loading, error with «Reintentar», empty menu; `FixtureCatalogRepository` for tests and `#sistema`.
- T3 Privacy notice text and the guard that allows the network only in the approved adapter.
- T4 Checks, browser verification against the local stack, docs.

Routes: inline (one understood change, no parallel units).

## Log

- L1 (2026-10-17) User's request: «Aprobado U3b con estos ajustes: - usar fetch directo a Supabase Data API; - no instalar @supabase/supabase-js en la carta pública; - encapsular fetch únicamente en SupabaseCatalogRepository; - mantener FixtureCatalogRepository solo para tests y #sistema, nunca como fallback; - una sola lectura agregada, sin N+1; - no usar select=*; - usar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY; - credentials: "omit"; - si Supabase falla: error + Reintentar, sin fixture silencioso; - mantener mapper puro y null como null; - actualizar privacy-claims.test.ts para permitir red solo en el adaptador aprobado; - actualizar el aviso de privacidad a: “La carta y sus precios se descargan desde nuestra base de datos alojada en Supabase. Al consultar la carta no enviamos a esa base de datos el contenido de tu pedido ni los datos que ingreses para armarlo. El pedido permanece en tu dispositivo hasta que decidís enviarlo por WhatsApp.” Mantener también: “No utilizamos cookies ni herramientas de análisis.” No tocar Supabase remoto. No mergear sin autorización. Seguí el workflow Gentle/ODD del repo y reportame resultados al terminar.»
- L2 Probe on the local stack: one GET to `/rest/v1/categorias` with embedded `productos(variantes)` and `order` per level returns 13 categories, 84 products, and 110 variants, already ordered; the `apikey` header alone is enough; CORS allows the dev origin.
- L3 Two pre-existing holes in the privacy guard, found while U3b introduced its first `fetch`, fixed in their own commit `174d6c8`: the network regex ended in `\b` after `fetch(`, so `fetch('/url')` with a literal URL was never detected; and Vitest 5's `fsModuleCache` reused a stale transform of the guard whose `import.meta.glob` missed new files (false green locally, CI unaffected). Mutations now caught: `fetch('/x')`, `fetch("/x")`, a template literal, `window.fetch(u)`, `new XMLHttpRequest()`, `navigator.sendBeacon`, and `credentials: 'include'` in the adapter.
- L4 T1 (`9d7b69b`): RED (missing modules) → GREEN, 22 tests for the mapper and the repository. T2/T3: App tests RED → GREEN (loading, error with «Reintentar» and no fixture data, missing settings without network, empty menu); privacy notice tests RED → GREEN with the user's text verbatim. Full app suite 171 tests; typecheck, lint, build pass; bundle 105.66 kB gzip (was 103.99).
- L5 Parity: the live local catalog, read through `SupabaseCatalogRepository`, maps exactly to the seed fixture (categories and products equal, variant ids aside), with the 17 unpriced variants as null.
- L6 Browser on the local stack (Playwright, 390 px; screenshots in `../heraldopizza-capturas/u3b/`): the menu shows 13 sections and 16 «Consultar en barra»; the only cross-origin request is `GET /rest/v1/categorias` with the named select, no cookie and no Authorization header; with the API refused, the alert shows, no product is rendered, and «Reintentar» recovers; the loading state is announced; storage and cookies stay empty. In development StrictMode issues the request twice (the first is aborted); a production build issues exactly one, and it contains no secret key and no remote project URL.
- L7 Not done: `.env.example` could not be written (the session's permissions deny `.env*` files); the README documents both variables instead. The `#sistema` view still imports the fixture directly, so the fixture stays in the production bundle; lazy-loading that view is a follow-up.

- L8 Independent verifier: PASS on S1–S10, no blockers (advisories: the guard is textual and misses obfuscated calls such as `globalThis['fe'+'tch']`, which the repository unit test covers at runtime; the guard does not check headers; the fixture ships with `#sistema`; `.env.example` is missing).
- L9 Native review (consented, reliability lens): approved and acknowledged. Real finding fixed here: `descripcion` accepts an empty string in the database, and the mapper rejected it, so one cleared description would have taken the whole menu down; empty or blank optional text now maps to null (RED → GREEN, and failing again with the fix reverted). False positive: a made-to-order product without notice is already impossible (`productos_encargo_con_aviso`). Also applied: `vi.unstubAllGlobals()` in `afterEach`. Not done: an explicit test of the abort path on unmount.
- L10 (2026-10-17) Supersedes the `.env.example` notes in L7 and L8: the user created `.env.example` by hand and set `.env.local`; it was added in `7b550e7`. Checked without printing values: `.env.example` holds the two variable names with placeholder values (no `sb_secret`, JWT, or real project URL); `.env.local` stays ignored and out of the index; the app references only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; with `.env.local` the menu loads from the local stack (13 sections, 16 «Consultar en barra», one GET without Authorization or cookies). Native review of the updated candidate approved and acknowledged; its remaining suggestions (abort-path test, malformed-JSON branch test) stay as non-blocking follow-ups.
