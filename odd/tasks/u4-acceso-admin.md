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
| T1 | S2, S3 | inline | done | `784ee46` |
| T2 | S5, S6, S7 | inline | done | `9b631ae` |
| T3 | S1, S4, S7 | inline | done | `52912d9`, fixes `c4aac34`, `98b88f5` |
| T4 | S5, S6 | inline | done | `db903c3`, `097eb77`, `33f710d` |
| T5 | S1–S8 | verifier + native review | done | verifier PASS S1–S8; native review approved ×2 |

- T1 Migration `public.soy_administrador()` and pgTAP tests (privileges, results per identity, claims ignored, inventory).
- T2 supabase-js (pinned), `AdminAuth` port, Supabase adapter, admin client config.
- T3 `/admin` lazy route: restoring state, login, panel shell, no-access, sign out.
- T4 Build check (initial chunk without supabase-js) in CI, local-only script to create a test admin, docs.
- T5 Independent verification and native review per commit.

Routes: inline (one feature, sequential units; no writer reason).

## Log

- L1 (2026-10-17) User's request: «Aprobado el diseño técnico de U4 con la opción recomendada `soy_administrador()`. Implementá según lo propuesto, con estas condiciones: - `soy_administrador()`: - SECURITY DEFINER - STABLE - search_path vacío - referencias totalmente calificadas - sin parámetros de usuario - basada exclusivamente en auth.uid() - EXECUTE solo para authenticated, no anon/PUBLIC - RLS continúa siendo la autoridad real de autorización. La función solo sirve para decidir la experiencia de la interfaz. - Manejar explícitamente el estado inicial de restauración de sesión para evitar flashes del login o del panel. - Mantener supabase-js exclusivamente en el chunk lazy de /admin. La carta pública no debe incorporarlo a su bundle inicial. - Ninguna service_role/secret/admin key puede llegar al frontend. La creación del usuario de prueba local queda exclusivamente en scripts/tests de desarrollo. - Mantener fuera de U4: - recuperación de contraseña; - CRUD de catálogo; - Supabase remoto. Seguí el workflow ODD/Gentle vigente, las pruebas propuestas y los gates de revisión correspondientes. No push/PR/merge sin pasar primero por las etapas previstas del workflow. Reportame los resultados al cerrar la implementación local.»
- L2 T1 (`784ee46`): pgTAP RED (16/16, missing function) → GREEN. `service_role` also held EXECUTE by Supabase's default privileges; it was revoked too, so only `authenticated` executes it besides the owner, pinned by a test. Mutations caught: EXECUTE for anon, no pinned search_path, trusting `app_metadata`. Suite 103 pgTAP.
- L3 T2 (`9b631ae`): supabase-js 2.117.2 pinned (newest release older than two weeks); `AdminAuth` port and adapter, 11 tests RED → GREEN.
- L4 T3 (`52912d9`): admin screens, 11 tests RED → GREEN, including restoring and checking states with neither login nor panel shown; route tests (lazy `/admin`, public paths, no link to `/admin`), a mutation without the route fails them. Build: initial chunk 106.7 kB gzip with no supabase-js; `AdminRoute` lazy chunk 58 kB gzip.
- L5 Incident, found by the new bundle check: the user's `.env.local` had the local stack's publishable key with its `SECRET_KEY` pasted right after it in `VITE_SUPABASE_PUBLISHABLE_KEY`, so Vite inlined a secret key into the public bundle. Local-stack key only; `dist/` is ignored and nothing was committed or deployed. The file cannot be read or edited from this session (permissions), so the user must fix it. Defense added: `client-env-guard.ts` makes `vite`, `vite build`, and Vitest refuse to start when a `VITE_` variable holds `sb_secret_`, `service_role`, or a service_role JWT (named, never printed); `npm run check:bundle` in CI fails when the initial chunk carries supabase-js or any dist file holds a secret marker (mutation: a static import of the panel fails it).
- L6 Incident from U3a: `[auth.email] enable_signup = false` in `supabase/config.toml` disabled the email provider on the local stack (`email_provider_disabled`), so nobody could sign in. Public sign-up stays closed by `[auth] enable_signup = false`; checked over HTTP: sign-up → `signup_disabled`, password login → token issued. Also fixed: `AdminRoute` created two Supabase clients under StrictMode; the client is now created once per module load.
- L7 Browser on the local stack (Playwright, 390 px; screenshots in `../heraldopizza-capturas/u4/`): `/` loads no admin code and stores nothing; `/admin` shows «Cargando…» then the form; wrong password → «Email o contraseña incorrectos.»; right password → panel, session saved; reload → panel without the form ever showing; «Cerrar sesión» clears storage; an account without role → «Esta cuenta no tiene acceso al panel.», signed out, nothing stored; anon `POST /rpc/soy_administrador` → 401 `42501`. `npm run db:admin-local` is idempotent and refuses a non-local API.
- L8 Checks in a clean copy (the user's current `.env.local` is rightly refused by the guard): typecheck, lint, 207 Vitest tests, build, bundle check; pgTAP 103.
- L9 Independent verifier: PASS on S1–S8, no blockers. Advisories: a server-rejected saved token left the owner on «No pudimos verificar tu cuenta» with no way out; `check:bundle` missed a base64 service_role JWT.
- L10 Native review of `7314416..db903c3` (four lenses, consented): approved and acknowledged. Its real defects were fixed in one batch (`98b88f5`, `33f710d`): only `invalid_credentials` is reported as wrong credentials (others, such as the L6 incident, become «No pudimos iniciar sesión. Probá de nuevo en un momento.» and are logged); `signIn` never rejects and the button never sticks; the panel shows the email of the server session; a failed sign-out is reported instead of faked; the check-failed screen offers «Cerrar sesión»; a failed panel chunk shows «No pudimos cargar el panel.» with «Reintentar»; shared `StatusScreen`; `check:bundle` decodes JWTs; `db:check-auth` in CI fails if sign-up reopens or password sign-in is switched off (mutation: provider off → failed); the local admin script lowercases the email.
- L11 Native review of `7314416..33f710d` (four lenses, consented): approved and acknowledged. Non-blocking follow-ups, recorded instead of another correction loop: the `signOutFailed` flag can go stale across phases; a failed session restore falls back to the login without a message; a failed sign-out after «sin acceso» is swallowed (the panel stays closed because the role is checked again); the «no configurado» screen does not use `StatusScreen` and has no rendered test; duplicated local-stack and JWT helpers in the scripts.
- L12 Final checks: 217 Vitest tests, typecheck, lint, build, `check:bundle` (clean copy), pgTAP 103, `db:check-auth`. Browser on the local stack after the fixes: same results as L7, plus a failed panel chunk shows the error with «Reintentar». The user's `.env.local` still holds the secret key pasted after the publishable one, and the guard still refuses it; checks run with the publishable key from the process env.

