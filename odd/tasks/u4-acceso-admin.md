# U4 — Administrator access (login, session, admin check)

Objective: `/admin` lets the owner sign in with email and password, keeps the session on the device, and shows the panel shell only to administrators; the public menu stays free of supabase-js.
Branch: `feat/u4-acceso-admin` (from `main` at `7314416`). Delivery: work-unit commits; push, PR, and merge only after the workflow gates and with the user's authorization. Test runners: Vitest (`npm test`) and pgTAP (`npm run db:test`).

## Specs

- S1 RF-27 login with email and password on a separate route (`/admin`); RF-28 no public sign-up; RF-29 sign out, and the session stays on the device until then. Out of scope: «recuperación de contraseña; CRUD de catálogo; Supabase remoto.»
- S2 `soy_administrador()`: «SECURITY DEFINER», «STABLE», «search_path vacío», «referencias totalmente calificadas», «sin parámetros de usuario», «basada exclusivamente en auth.uid()», «EXECUTE solo para authenticated, no anon/PUBLIC».
- S3 «RLS continúa siendo la autoridad real de autorización. La función solo sirve para decidir la experiencia de la interfaz.»
- S4 «Manejar explícitamente el estado inicial de restauración de sesión para evitar flashes del login o del panel.»
- S5 «Mantener supabase-js exclusivamente en el chunk lazy de /admin. La carta pública no debe incorporarlo a su bundle inicial.»
- S6 «Ninguna service_role/secret/admin key puede llegar al frontend. La creación del usuario de prueba local queda exclusivamente en scripts/tests de desarrollo.»
- S7 Approved design: no router in U4 (path switch with `React.lazy`); supabase-js pinned to 2.117.2; `AdminAuth` port with a thin Supabase adapter; generic credentials error («Email o contraseña incorrectos»); account without role sees «Esta cuenta no tiene acceso al panel» and is signed out; no link to `/admin` from the public menu; build check that the initial chunk has no supabase-js.
- S8 «Seguí el workflow ODD/Gentle vigente, las pruebas propuestas y los gates de revisión correspondientes. No push/PR/merge sin pasar primero por las etapas previstas del workflow.»

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S2, S3 | inline | pending | |
| T2 | S5, S6, S7 | inline | pending | |
| T3 | S1, S4, S7 | inline | pending | |
| T4 | S5, S6 | inline | pending | |
| T5 | S1–S8 | verifier + native review | pending | |

- T1 Migration `public.soy_administrador()` and pgTAP tests (privileges, results per identity, claims ignored, inventory).
- T2 supabase-js (pinned), `AdminAuth` port, Supabase adapter, admin client config.
- T3 `/admin` lazy route: restoring state, login, panel shell, no-access, sign out.
- T4 Build check (initial chunk without supabase-js) in CI, local-only script to create a test admin, docs.
- T5 Independent verification and native review per commit.

Routes: inline (one feature, sequential units; no writer reason).

## Log

- L1 (2026-10-17) User's request: «Aprobado el diseño técnico de U4 con la opción recomendada `soy_administrador()`. Implementá según lo propuesto, con estas condiciones: - `soy_administrador()`: - SECURITY DEFINER - STABLE - search_path vacío - referencias totalmente calificadas - sin parámetros de usuario - basada exclusivamente en auth.uid() - EXECUTE solo para authenticated, no anon/PUBLIC - RLS continúa siendo la autoridad real de autorización. La función solo sirve para decidir la experiencia de la interfaz. - Manejar explícitamente el estado inicial de restauración de sesión para evitar flashes del login o del panel. - Mantener supabase-js exclusivamente en el chunk lazy de /admin. La carta pública no debe incorporarlo a su bundle inicial. - Ninguna service_role/secret/admin key puede llegar al frontend. La creación del usuario de prueba local queda exclusivamente en scripts/tests de desarrollo. - Mantener fuera de U4: - recuperación de contraseña; - CRUD de catálogo; - Supabase remoto. Seguí el workflow ODD/Gentle vigente, las pruebas propuestas y los gates de revisión correspondientes. No push/PR/merge sin pasar primero por las etapas previstas del workflow. Reportame los resultados al cerrar la implementación local.»
