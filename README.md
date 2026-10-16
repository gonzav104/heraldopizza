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
```

La integración continua (`.github/workflows/ci.yml`) las ejecuta con Node 24 en cada pull request y en cada push a `main`. Un PR no se integra si alguna falla.

## Variables de entorno

Los archivos `.env` y `.env.*` están excluidos de Git porque pueden contener secretos. Solo se versiona `.env.example`, con nombres de variables y valores ficticios.

## Documentación

- `AGENTS.md`: reglas de negocio, diseño y convenciones.
- `docs/decisiones-pendientes.md`: inconsistencias y datos faltantes por resolver.
- `odd/tasks/`: seguimiento de unidades de trabajo.

Las importaciones internas usan el alias `@/` → `src/`.
