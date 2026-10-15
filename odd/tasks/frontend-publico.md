# Frontend público — Heraldo Pizza

- **Engram mirror:** `odd/frontend-publico/tasks` (project `heraldopizza`)
- **Branch:** `feat/u0-base-tecnica`
- **Approved order:** U0 → U2 → U1 → U3 → (U4–U11, see plan)
- **Authorized now:** U0 only (2026-10-15). Commits and push require explicit user approval.

## Objective

Public digital menu (mobile-first SPA). This document tracks the work units; business rules live in `AGENTS.md` and the requirements PDF.

## U0 — Technical base

**Problem:** the repository is the default Vite scaffold: non-strict TS, `lang="en"`, demo assets, Windows `Zone.Identifier` files, and unoptimized images (logo 1.3 MB, venue photo 2.2 MB) that would break RNF-18.

**Scope:** strict TS, Tailwind CSS v4, `@/` alias, Vitest + `npm test`, HTML language/metadata, Vite demo cleanup, `Zone.Identifier` cleanup, WebP logo and venue photo, pending-decisions doc. No UI, domain, or data work from other units.

**Constraints:** no Supabase, no invented business data, Spanish commit messages, no commit without approval.

### Tasks

- [x] U0-T1 Strict TypeScript + `@/` alias (tsconfig paths + Vite `resolve.alias`) — route: inline (mechanical config)
- [x] U0-T2 Tailwind CSS v4 via `@tailwindcss/vite` — route: inline
- [x] U0-T3 Vitest (jsdom) + Testing Library + `npm test` + smoke test — route: inline
- [x] U0-T4 `index.html` lang/metadata; remove Vite demo files; minimal placeholder `App` — route: inline
- [x] U0-T5 Remove `*:Zone.Identifier` files (Windows download metadata) and ignore them in Git — route: inline
- [x] U0-T6 WebP logo (with transparency) and venue photo; favicons from the logo — route: inline (temporary sharp outside the repo)
- [x] U0-T7 Document PDF ↔ SQL inconsistencies in `docs/decisiones-pendientes.md` — route: inline
- [x] U0-T8 Verification: lint, build, test, diff review

**Route note:** every U0 task is mechanical, already-understood configuration and needs no design research, so it runs inline. No writer was delegated.

### Acceptance criteria

- `npm run lint`, `npm run build` and `npm test` pass.
- `import … from '@/…'` resolves in TS, Vite, and Vitest.
- No Vite demo assets remain referenced or shipped.
- The WebP images keep their transparency (logo) and content (venue photo).

### Verification evidence

Observed 2026-10-15 on `feat/u0-base-tecnica` (uncommitted working tree):

- `npm run lint` → 0 problems.
- `npm test` → 1 file, 1 test passed (Vitest 5.0.4, jsdom; imports `@/App`, so the alias resolves in Vitest).
- `npm run build` → `tsc -b` clean under `strict`; Vite 8.3.4 build OK. JS 219.86 kB (68.75 kB gzip), CSS 5.32 kB (Tailwind utilities present in output).
- Images (sharp 0.34.5, run from a temp dir outside the repo): logo 1.3 MB PNG → 62 KB WebP 512 px with alpha; venue photo 2.2 MB PNG → 167 KB WebP (same 1402×1122) + 67 KB 800 px variant; favicon 48 px and apple-touch-icon 180 px. Visually checked.
- Diff reviewed: only U0 files changed.

Resolved 2026-10-15: the original PNGs were moved to a backup folder outside the repository (`../heraldopizza-originales/images/`); only the WebP versions remain in `public/`. The PDF was renamed to `docs/requerimientos.pdf`, the path that `CLAUDE.md`/`AGENTS.md` expect. `.mcp.json` is local-only (ignored in Git).

TDD exception: U0 is configuration only. The smoke test proves the test runner and the alias work, so there was no meaningful RED step.

### Commits

Approved by the user on 2026-10-15, split into two commits:

- `3c75ff7` docs: incorporar documentación y reglas del proyecto
- `chore: configurar base técnica del frontend` (this commit; the hash is in `git log`)

RDD is on by default. The review slice is `e96e705..HEAD`, covering both commits.

## Later units (not authorized)

U2 design system → U1 domain + mock catalog → U3 menu → U4 store info → U5 cart → U6 half-and-half + empanadas → U7 order pricing → U8 checkout + WhatsApp → U9 QR mode → U10 promotions → U11 quality.
