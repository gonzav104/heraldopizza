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
| T1 | S1, S2, S4, S5, S7 | inline | pending | |
| T2 | S3, S6 | inline | pending | |
| T3 | S8, S9 | inline | pending | |
| T4 | S1–S10 | inline checks + browser on the local stack | pending | |

- T1 Domain port `CatalogRepository`, pure mapper, `SupabaseCatalogRepository` (the only `fetch`), `.env.example`.
- T2 App loads through the repository: loading, error with «Reintentar», empty menu; `FixtureCatalogRepository` for tests and `#sistema`.
- T3 Privacy notice text and the guard that allows the network only in the approved adapter.
- T4 Checks, browser verification against the local stack, docs.

Routes: inline (one understood change, no parallel units).

## Log

- L1 (2026-10-17) User's request: «Aprobado U3b con estos ajustes: - usar fetch directo a Supabase Data API; - no instalar @supabase/supabase-js en la carta pública; - encapsular fetch únicamente en SupabaseCatalogRepository; - mantener FixtureCatalogRepository solo para tests y #sistema, nunca como fallback; - una sola lectura agregada, sin N+1; - no usar select=*; - usar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY; - credentials: "omit"; - si Supabase falla: error + Reintentar, sin fixture silencioso; - mantener mapper puro y null como null; - actualizar privacy-claims.test.ts para permitir red solo en el adaptador aprobado; - actualizar el aviso de privacidad a: “La carta y sus precios se descargan desde nuestra base de datos alojada en Supabase. Al consultar la carta no enviamos a esa base de datos el contenido de tu pedido ni los datos que ingreses para armarlo. El pedido permanece en tu dispositivo hasta que decidís enviarlo por WhatsApp.” Mantener también: “No utilizamos cookies ni herramientas de análisis.” No tocar Supabase remoto. No mergear sin autorización. Seguí el workflow Gentle/ODD del repo y reportame resultados al terminar.»
- L2 Probe on the local stack: one GET to `/rest/v1/categorias` with embedded `productos(variantes)` and `order` per level returns 13 categories, 84 products, and 110 variants, already ordered; the `apikey` header alone is enough; CORS allows the dev origin.
