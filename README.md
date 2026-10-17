# Heraldo Pizza — Carta digital

Carta digital mobile-first (SPA) de Heraldo Pizza, Campana, Buenos Aires.

Stack actual: React 19, TypeScript (estricto), Vite 8, Tailwind CSS v4, Vitest.

## Comandos

```bash
npm install
npm run dev        # servidor de desarrollo
npm run typecheck  # chequeo de tipos (tsc -b)
npm run lint       # ESLint
npm test           # Vitest (una ejecución)
npm run build      # chequeo de tipos + build de producción
```

## Verificaciones

Antes de abrir un PR, ejecutá las mismas verificaciones que la integración continua, en este orden:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run check:bundle
```

La integración continua (`.github/workflows/ci.yml`) las ejecuta con Node 24 en cada pull request y en cada push a `main`, y marca el resultado en el PR. Un segundo job, `Database migrations and RLS tests`, levanta el stack local de Supabase en el runner y corre `npm run db:test`. Por sí sola, la integración continua no impide integrar un PR con verificaciones fallidas: para bloquearlo hay que configurar en GitHub una regla de protección de `main` que exija los checks `Typecheck, lint, test, and build` y `Database migrations and RLS tests`.

## Base de datos local (Supabase)

El esquema vive en `supabase/migrations/` (SQL versionado) y los datos iniciales en `docs/seed_catalogo.sql`, separados del esquema. Todo se prueba contra un stack local de Supabase, sin credenciales remotas. Requiere Docker; en WSL2, con la integración de Docker Desktop activada.

```bash
npm run db:start  # levanta el stack local (aplica migraciones y seed)
npm run db:reset  # recrea la base local desde las migraciones y vuelve a cargar el seed
npm run db:test   # pruebas pgTAP de supabase/tests/ (restricciones, seed y RLS)
npm run db:admin-local  # crea o reinicia un administrador de prueba en el stack local
npm run db:check-auth   # comprueba que el registro siga cerrado y el login con contraseña habilitado
npm run db:stop   # detiene el stack
```

Las migraciones no se aplican a ningún proyecto remoto sin autorización expresa.

## Variables de entorno

Los archivos `.env` y `.env.*` están excluidos de Git porque pueden contener secretos. Solo se versiona `.env.example`, con nombres de variables y valores ficticios.

La carta lee el catálogo desde la Data API de Supabase y necesita dos variables, ambas públicas por diseño:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto (en local, `API_URL` de `npx supabase status -o env`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (en local, `PUBLISHABLE_KEY` del mismo comando) |

Para desarrollo, levantá el stack local (`npm run db:start`) y poné esos dos valores en `.env.local`. Nunca uses una clave secreta (`sb_secret_…`) ni `service_role` en la carta. Si faltan las variables o Supabase no responde, la carta muestra un error con «Reintentar»: no usa datos de prueba en su lugar.

Vite copia en el bundle del navegador todas las variables `VITE_`. Por eso `vite`, `vite build` y las pruebas **se niegan a arrancar** si alguna contiene una clave secreta, `service_role` o un JWT de `service_role`, y `npm run check:bundle` revisa después del build que ningún archivo de `dist/` la contenga.

## Panel de administración (`/admin`)

`/admin` pide email y contraseña (Supabase Auth) y muestra el panel solo a las cuentas que figuran en `administradores`; `public.soy_administrador()` le dice a la interfaz si mostrarse, pero quien autoriza cada lectura y escritura es RLS. El panel se carga en diferido: la carta pública no incluye `supabase-js` en su bundle inicial, y `npm run check:bundle` lo verifica.

No hay registro público. Para probar en local, con el stack levantado, `npm run db:admin-local` crea o reinicia `admin@heraldo.local` (o el email de `ADMIN_EMAIL`) con una contraseña aleatoria que muestra una sola vez (o la de `ADMIN_PASSWORD`). El script lee la clave secreta del stack local en el momento, no la guarda ni la imprime, y se niega a correr contra una API que no sea local. En un proyecto real, la cuenta del dueño y su fila en `administradores` se crean a mano desde el panel de Supabase, y el registro se desactiva ahí.

## Documentación

- `AGENTS.md`: reglas de negocio, diseño y convenciones.
- `docs/decisiones-pendientes.md`: inconsistencias y datos faltantes por resolver.
- `odd/tasks/`: seguimiento de unidades de trabajo.

Las importaciones internas usan el alias `@/` → `src/`.
