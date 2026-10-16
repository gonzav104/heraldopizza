# Frontend público — Heraldo Pizza

- **Engram mirror:** `odd/frontend-publico/tasks` (project `heraldopizza`)
- **Branch:** `feat/u0-base-tecnica` (merged into `main`, PR #1); U2 on `feat/u2-sistema-diseno`
- **Approved order:** U0 → U2 → U1 → U3 → (U4–U11, see plan)
- **Authorized now:** U2 (2026-10-15). U0 is done. Commits and push require explicit user approval.

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

## U2 — Order-first digital menu (design + navigable prototype)

**Objective (user brief, 2026-10-15, fourth version):** replace the flyers sent over WhatsApp with an interactive, modern digital menu. Customers explore products, pick variants, build the order, and send it by WhatsApp with every detail filled in. The catalog and ease of ordering are the stars. No institutional landing page, no traditional price list. Identity: black corrugated sheet, pine, and the logo colors. Designed for future product photos, but it must look good without them.

**Scope decision (user, 2026-10-15):** "Navigable prototype". U2 designs and prototypes the whole path (menu → options → cart → order details → WhatsApp message preview) with local, non-persistent state. Pricing rules, persistence, delivery zones, and the final message are implemented with tests in U5–U8. No Supabase, no admin.

**Constraints:** catalog data only from `docs/seed_catalogo.sql` (temporary fixture); no invented zones, costs, promotions, or story. The prototype never opens WhatsApp to the real store number (that would let testers send fake orders); it shows the message preview instead. Mobile-first from 360 px, 44 px touch targets, WCAG AA, `prefers-reduced-motion`.

**History (superseded, kept in Engram `odd/frontend-publico/tasks`):** (1) chapa-and-pine price list, judged "too simple"; (2) richer cards with procedural pizza illustrations; (3) landing-style web experience with typographic posters, judged an institutional landing. Lessons: ordering must lead and the first screen must show products, not a hero; real pine textures from the venue photo work; display titles need `clamp()` and `min-w-0` at 360 px.

### Tasks

- [x] U2-O1 Design direction and implementation spec (research-informed) — route: inline (parent owns product and design decisions); research delegated to one read-only worker. Evidence: research report (NN/g, Baymard, Pedix sources) and the spec "El mostrador" (menu on black sheet, order on the pine counter), handed to the writer as a job file outside the repo.
- [x] U2-O2 Implementation: store header, category navigation, menu sections and rows, product sheet, half-and-half builder, empanada steppers, prototype cart (Zustand, no persistence), cart bar and sheet (desktop side panel), checkout prototype, message preview, store info sheet, `#sistema`, tests — route: delegated writer (2+ non-trivial files). Evidence: the writer returned `done`, with the new structure `src/app`, `src/features/{catalog,cart,checkout,store-info}`, and `src/components/ui`. It added `zustand@^5.0.15` and deleted the superseded experience/menu code.
- [x] U2-O3 Writer verification: `npm run lint`, `npm test`, `npm run build` — route: writer, with a parent spot check. Evidence: the writer reported lint 0, 70/70 tests, and a build at 96.00 kB JS gzip / 8.21 kB CSS gzip. The pure logic went RED → GREEN, though the RED came from missing modules rather than failing assertions. The parent spot check re-ran `npm test` (70/70) and found no `wa.me` link in the UI.
- [x] U2-O4 Browser verification at 360, 390, 768, and 1280 px plus the full ordering path — route: parent (visual judgment), temporary Playwright + Chromium. Evidence: no overflow at any width and no console errors. The full path passed at 360 and 1280: quick add ×2, half-and-half, empanada stepper, product sheet with a note, cart, empty-submit errors, delivery form with only "Otra zona", message preview, and Back closing the sheet. The message was checked by hand: 4 pizzas counted for the surcharge, total $ 105.500. The send button is disabled. Findings: the row opener is only 23 px tall, the half-and-half selection is lost while scrolling, and an unused `whatsappChatUrl` remains.
- [x] U2-O5 `impeccable` critique and polish; fixes applied — route: delegated writer for multi-file fixes. Evidence: detector run once with no findings. With reduced motion, no animations run; every image has alt; tab order is Info, Categorías, then the categories. Fix batch (writer): the whole name and description block opens the sheet (≥ 44 px), a sticky half-and-half selection summary, and `whatsappChatUrl` removed. Confirmation round: full path passes at 360 and 1280, no controls under 44 px, no overflow at 360/390/768/1280, no console errors, lint 0, 72/72 tests.
- [ ] U2-O6 Report to the user; no commit until authorized (report delivered 2026-10-15; waiting for the user's evaluation)

### Acceptance criteria

- The first screen on a 360 px phone shows the brand, category navigation, and the first products, not a hero.
- Pizzas show whole and half prices on the same row (RF-60). Adding takes one tap from the list, and the sheet allows variant, quantity, and note (RF-13, RF-14).
- Half-and-half: choose two flavors, price = sum of both halves (RF-56, RN-10).
- Empanadas: per-flavor quantity; the assorted dozen is a separate product (RF-61).
- Out-of-stock: visible, not addable (RF-05). Made-to-order: notice visible (RF-06). No price: "Consultar en barra", not addable (RN-01).
- The cart is always reachable, with item subtotals and the total (RF-15, RF-16).
- The checkout prototype has: name, pickup/delivery, address only for delivery, zone (the real zone list is missing, so only "Otra zona (a consultar)"), payment options by mode (RN-11), general note, and a WhatsApp message preview (RF-18, RF-19, RF-20, RF-57).
- No horizontal overflow from 360 px, no console errors, reduced motion respected.

### U2 iteration 5 — owner decisions and mobile refinement (2026-10-15)

**Reason:** the user approved "El mostrador" and brought decisions from the owner. Order pizzas whole from the list; half pizzas and half-and-half go through one configurator, "Armá tu pizza" (first half required, second optional, no repeated flavor). No product photos in this version: each category gets a representative graphic. New category, Postres, with real prices. Info simplified to address, hours, contact, and Instagram. Official Instagram icon. Compact footer. Full mobile-first review. Still no Supabase, admin, or real WhatsApp sending. U2 keeps its provisional calculations.

- [x] U2-P1 Data: add Postres to `docs/seed_catalogo.sql` (not executed) and regenerate the fixture; record the owner's decisions and the changes against the original requirements in `docs/decisiones-pendientes.md` — route: inline (scripted, mechanical data edit, plus parent-owned decision log). Evidence: SQL has 13 categories, with Postres at order 8 and Licuados through Tragos de autor shifted to 9–13. The fixture was regenerated (13/84, script assert). `docs/decisiones-pendientes.md` gains a table of owner decisions D1–D8 with the affected requirements. As expected, only the old 12-category test fails until P2.
- [x] U2-P2 UI refinement: "Armá tu pizza" configurator, whole-only quick add, photo slots removed, category graphics, Postres in navigation, cart labels for half and half-and-half, info sheet simplified, Instagram icon, footer, mobile review (header height, spacing, safe area, one-handed use, add/remove feedback) — route: delegated writer (2+ non-trivial files)
- [x] U2-P3 Writer verification (lint, test, build) plus a parent spot check. Evidence: the writer reported lint 0, 104/104 tests, and a build at 101.52 kB JS gzip / 8.42 kB CSS gzip. RED came from 22 failing assertions (not missing imports), then GREEN. The parent spot check re-ran `npm test` (104/104) and found no `wa.me` in the UI.
- [x] U2-P4 Browser verification at 360, 390, 768, and 1280 px: one half, two different halves, duplicate prevention, live price updates, cart display and removal, scrolling to the footer — route: parent. Evidence: every scenario passes at 360 and 1280. One half gives "Media pizza" at $ 10.500 with the duplicate disabled. Two halves give $ 10.500 + $ 14.500 = $ 25.000. Clearing the 1st promotes the 2nd, and swapping gives $ 28.000. Cart labels are Entera, Media pizza, and Mitad y mitad (Especial + Napolitana Heraldo); removing a line takes it from 3 to 2. Message total $ 38.500, checked by hand. The footer clears the bottom bar; the category bar starts at 207 px. No overflow at 4 widths, no console errors. Findings sent to P5: the bar label truncates at 360, the price line repeats the mode, a dashed outline shows on filled halves, slot names truncate, slot clear buttons are 40 px, and Instagram has a duplicate icon.
- [x] U2-P5 `impeccable` detector and polish batch — route: delegated writer for fixes. Evidence: detector run once with no findings; a11y fine (reduced motion, alt, tab order). Batch applied: the bar label reads "Pedido" below 400 px, the price line shows only the math (the mode is announced via sr-only), the dashed outline appears only on empty halves, slot names wrap to 2 lines, clear buttons are 44 px, and Instagram has a single glyph. The writer's RED for the price line came from 5 failing assertions. Confirmation round: every scenario passes at 360 and 1280, no controls under 44 px (builder included), no overflow at 4 widths, no console errors, lint 0, 104/104 tests, build 101.66 kB JS gzip / 8.45 kB CSS gzip.
- [ ] U2-P6 Report to the user; no commit until authorized (report delivered 2026-10-15; waiting for evaluation)

### U2 iteration 6 — UI/UX and responsive review (2026-10-16)

Branch `feat/u2-sistema-diseno` (uncommitted). Test runner: Vitest (`npm test`). Scope: UI/UX, responsive, and visual quality only. The catalog logic, the configurator, and the cart stay as approved. No Supabase, admin, or U5–U8 work. No commit or push without the user's authorization.

**Specs** (the user's exact strings, 2026-10-16)

- S1 Header: «Ubicá el logo más arriba, con suficiente espacio.» «Buscá una presentación más atractiva y centrada para «Heraldo Pizza».» «Dale mayor presencia a la fotografía real del local, cuidando el recorte y el encuadre.» «Quiero un encabezado con personalidad y jerarquía visual, pero que no ocupe innecesariamente toda la pantalla ni esconda el catálogo.» Keep chapas, madera, and the logo colors.
- S2 Categories: «Conservá una única navegación de categorías, preferentemente la horizontal superior.» «Eliminá el acceso duplicado de la barra inferior.» «Reservá la barra inferior para el pedido cuando corresponda.» Review the empty cart and the footer.
- S3 Footer: «Rediseñalo por completo manteniendo la identidad gráfica del sitio.» Logo and name, essential contact, Instagram with its icon and real link, no repeated information. «Verificá que la barra fija del carrito no lo tape y que se pueda llegar correctamente hasta el final de la página.»
- S4 Order panel and checkout: review panel width and height, margins, hierarchy, payment methods («no deben verse comprimidos»), touch targets, summary, buttons, inner scroll, background scroll lock, mobile keyboard, and safe areas. «Los controles deben adaptarse al espacio disponible, sin depender de anchos fijos problemáticos.»
- S5 «Cambiar el campo «Nombre» por «Nombre y apellido», tanto en la etiqueta como en la experiencia del formulario.»
- S6 Responsive audit of every component at 320, 360, 375, 390, 430, 440, 768, 1024, 1280, and 1440 px. «No basta con verificar que no haya overflow horizontal.» Review proportions, real type sizes, spacing, alignment, sticky navigation, modals, forms, cart bar, footer, and states, using real CSS sizes and screenshots at adequate resolution.
- S7 Verification: Playwright over the menu and the full order flow at those sizes. Screenshots of: header and first screen, catalog and navigation, pizza configurator, cart, «Tus datos», footer. Review them and fix problems before closing. Run lint, tests, and build.

**Tasks** (route: all inline. Reason: the units share files such as `Storefront.tsx`, `CartBar.tsx`, and `Sheet.tsx`, and the work is a sequential visual iteration, so no Writer reason applies.)

- [x] T1 Root-cause diagnosis from real captures at ten widths (S6)
- [x] T2 Centered header with a taller photo (S1)
- [x] T3 Single category navigation, and a bottom bar that exists only for the order and rests after the footer (S2, S3)
- [x] T4 Footer redesign (S3)
- [x] T5 Order sheet and checkout: payment grid, density, total on the primary button, «Nombre y apellido» (S4, S5)
- [x] T6 Sheets: safe areas (`viewport-fit=cover`), mobile keyboard (`visualViewport`), scrollbar gutter, scroll lock (S4)
- [x] T7 Responsive pass over the remaining components (S6)
- [x] T8 Tests, Playwright flow at ten widths, screenshots reviewed, `impeccable` detector, lint, build (S7) — evidence in L3

**Log**

- L1 2026-10-16, the user asked for a major UI/UX and responsive review of U2 "El mostrador" (the full text is in the session; its exact strings are in S1–S7).
- L3 Evidence (2026-10-16, uncommitted). RED first: 9 failing assertions (name and surname rule, name label, single category entry, no order bar when empty, total on the primary button, keyboard inset). Then GREEN. Final: lint 0, 123/123 tests, build 102.21 kB JS gzip / 9.25 kB CSS gzip. The audit at 10 widths (320, 360, 375, 390, 430, 440, 768, 1024, 1280, 1440; 2× captures on phones) ran the full flow with no failed step: no overflow, no control under 44 px, no console error, the order bar never covers the footer, every sheet fits the viewport, payment cells are 136–228 px wide (before: 92–110 px). The impeccable detector reports nothing. The keyboard inset was verified with a simulated `visualViewport` (sheet bottom 504 px for a 340 px keyboard on 844 px); it was not tried on a real iOS or Android keyboard. Scroll lock on desktop with a classic scrollbar: the page no longer shifts (the compensation is 15 px of padding).
- L4 Decisions: "Nombre y apellido" is validated as at least two words (my reading of S5, because the label alone would let a single word through). One test timeout raised to 15 s (the full menu renders 84 products in jsdom; the slowest test took 4.1 s against a 5 s default). Screenshots are kept outside the repo in `../heraldopizza-capturas/u2-iteracion-6/` (antes/despues). Risk: none (presentation, one validation rule the user asked for, and test config).
- L2 Diagnosis (T1, measured at 10 widths, 2× captures on phones): (1) the header is a desktop "profile row" squeezed onto phones: 88 px of photo at brightness 0.62, and logo, name, and Info share one row, so the name wraps to two lines; (2) two category entries (top grid button and bottom «Categorías»); (3) the fixed bar always reserves 80 px under the footer, even with an empty order; (4) the payment grid switches to 4 columns by viewport width (≥ 420 px) but lives in a modal capped at 512 px, so each option is 92–110 px, «Transferencia» touches the edges, and «+8 %» wraps; (5) the footer is a left-aligned list that repeats the header; (6) the viewport meta lacks `viewport-fit=cover`, so `env(safe-area-inset-*)` is 0 on iOS, nothing handles the keyboard, and `overflow:hidden` on `html` shifts the page on desktop.

### U2 iteration 7 — commercial and legal basics, PedidosYa (2026-10-16)

Branch `feat/u2-sistema-diseno` (uncommitted). Test runner: Vitest (`npm test`). Scope: information and copy in the existing components. No cart, pricing, or order logic changes. No commit or push without the user's authorization. Route: inline (one understood change across files that share state; no Writer reason).

**Specs** (the user's exact strings, 2026-10-16)

- S1 PedidosYa: «Incorporá el logo oficial de PedidosYa y el enlace directo a Heraldo Pizza en dos lugares: Footer. Sección de información del local.» URL: `https://www.pedidosya.com.ar/restaurantes/campana/heraldo-pizza-ef6d3a30-7cd3-4842-924a-ecc9b7fdf69b-menu`. «WhatsApp debe seguir siendo el canal principal. No agregues PedidosYa al encabezado, carrito ni checkout.» «Centralizá la URL y respetá la identidad visual de ambas marcas.»
- S2 Privacy: «Incorporá un enlace «Privacidad» en el footer, que abra un contenido breve, claro y accesible.» It explains: what data the customer gives when preparing an order; that it is used to build the WhatsApp message; that the customer decides whether to send it; that on sending, «los datos son recibidos por Heraldo Pizza y tratados también mediante WhatsApp»; how to contact the store about their data. «Antes de redactar afirmaciones sobre almacenamiento, cookies, analítica o terceros, verificá el comportamiento real de la aplicación y sus servicios. No afirmes que no se almacenan datos si no está comprobado.» «No copies políticas genéricas ni inventes datos legales del negocio.»
- S3 Confirmation: «Al continuar, se abrirá WhatsApp con tu pedido preparado. El pedido no queda confirmado automáticamente: Heraldo Pizza verificará la disponibilidad y coordinará los detalles.» Brief and visible near the main WhatsApp button; adjust it if the real behavior needs precision; «No agregues una pantalla adicional de aceptación ni interrumpas innecesariamente el flujo.»
- S4 Commercial information in the store info section, from real data only: business name and location; opening hours; WhatsApp contact; pickup and/or delivery; accepted payment methods; extra costs and delivery conditions; «aclaración de que los pedidos se coordinan y confirman por WhatsApp». «No inventes información faltante. Identificá los datos que debemos solicitar al dueño.»
- S5 Design: keep the black sheet, wood, and logo colors; mobile-first; reuse the existing components; no long legal text, intrusive modals, or unnecessary checkboxes; keyboard accessible; WhatsApp primary, PedidosYa secondary; no changes to cart logic, price calculations, or orders; tests; lint, tests, build.

**Tasks**

- [x] T1 Explore and verify what the app really does with data: code scan, then a browser run of the full flow recording cookies, storage, and requests (S2)
- [x] T2 Tests first for S1–S4, observed RED
- [x] T3 One PedidosYa URL in `store-info.ts` and one link component with a single logo seam (S1)
- [x] T4 Privacy sheet, footer link, and a test that ties the privacy claims to the code (S2)
- [x] T5 Confirmation notice next to the WhatsApp button (S3)
- [x] T6 Store info sheet: modalities, payments, delivery costs and conditions, coordination by WhatsApp, PedidosYa (S4)
- [x] T7 Docs: owner decisions and the list of data to request in `docs/decisiones-pendientes.md`; `#sistema` specimens
- [x] T8 lint, tests, build, detector, browser check at 320–1440 px (S5)

**Log**

- L5 2026-10-16, the user approved iteration 6 («Quedo espectacular») and asked for the commercial and legal basics (S1–S5 above).
- L6 Findings before writing. (a) `src/` has no storage, cookie, network, or analytics API, and `index.html` loads no external script (fonts are self-hosted). (b) The repo has no PedidosYa asset; Simple Icons (16.35.0) has no PedidosYa glyph; the official restaurant page answered 403 to automated fetch and no public brand kit exists, so the official logo file has to come from the owner or PedidosYa. The link ships working, with one seam where the file goes; no imitation is drawn. (c) The «Info» sheet was reduced on purpose in D7 (owner decision); S4 reopens delivery and payment facts there, so a new decision (D9) records that it supersedes that part of D7. (d) The button said «Enviar por WhatsApp», but the real behavior is to open WhatsApp with the message ready; the customer sends it there. The label becomes «Continuar en WhatsApp» to match the notice's «Al continuar».

### U2 commits (authorized by the user on 2026-10-16; not pushed)

Branch `feat/u2-sistema-diseno`, `c8c9763..` (the merge of U0). Thirteen work-unit commits, layered by dependency so each one compiles and passes on its own: the cart, catalog, and checkout features import each other, but there is no file-level cycle. Integration tests that render the whole page can only live with the commit that wires it.

| Commit | Unit | Authored lines | Tests at that commit |
|--------|------|---------------:|---------------------:|
| `6ebf470` | dependencies, viewport, test setup, pine texture (**risk item 5**) | 26 | 1 |
| `8d65e34` | catalog model, `formatArs`, local data with Postres | 127 | 2 |
| `86b98ba` | design tokens, textures, base components | 888 | 11 |
| `418180e` | catalog presentation by data shape, category marks | 326 | 27 |
| `4986503` | order lines, store, live price resolution | 772 | 63 |
| `4006764` | «Armá tu pizza» logic | 220 | 75 |
| `88d1377` | checkout rules and the WhatsApp message | 416 | 92 |
| `8990f85` | header, categories, rows, product and builder sheets | 1232 | 92 |
| `6143f72` | order bar, panel, three-step order sheet, checkout form | 711 | 92 |
| `335ff16` | store info, footer with PedidosYa, privacy notice | 294 | 99 |
| `fd301cc` | `#sistema` reference view | 301 | 99 |
| `7eda7f5` | Storefront, App, and the integration tests | 822 | 143 |
| `288cffb` | decisions D1–D13, owner data, this document | 173 | 143 |

Lines exclude `package-lock.json` and the generated `src/data/prototype-catalog.ts` (1,563 lines). Three commits are over the 400-line planning heuristic (888, 1,232, 772): each is one cohesive unit of components, and splitting them further would leave pieces that do not stand alone.

- L9 Verification (2026-10-16): every commit was checked in its own worktree with `tsc -b --force`, ESLint, and Vitest: all 13 pass (table above). My first run silently skipped the tests (the script used `rg`, which does not exist inside non-interactive scripts here); it was rerun with `grep` and the output columns were read.
- L10 The only commit that names a high-risk item is `6ebf470` (dependencies, item 5), and it sits alone. Independent verifier: PASS (`npm ci` without drift, 0 vulnerabilities, MIT/ISC/OFL licenses, no install scripts, no third-party requests, exactly three new lockfile packages; the parent re-ran the lockfile and audit checks). Native review (risk lens) on that commit alone: the user granted consent, the result was APPROVED with no findings, and the authority was acknowledged and burned. The other commits are medium or passive and are not due for review under the current contract.
- L11 Delivery strategy: **not chosen yet**. The branch is about 6,300 authored lines, so a single PR would be over the 400-line budget. Before opening PRs the user chooses `stacked-to-main` or `feature-branch-chain`, and the slices above become the PRs. Push and PR creation are the user's decision.

## Later units (not authorized)

U1 domain + mock catalog → U3 menu → U4 store info → U5 cart → U6 half-and-half + empanadas → U7 order pricing → U8 checkout + WhatsApp → U9 QR mode → U10 promotions → U11 quality.
- L7 Evidence (2026-10-16, uncommitted). RED first: 12 failing assertions on the new tests (the negative guards and the claims test already passed because today's code tells the truth). GREEN: lint 0, 143/143 tests, build 103.99 kB JS gzip / 9.29 kB CSS gzip. Real behavior, recorded in a browser over the full order flow with test data: 66 to 70 requests, all to the same origin and all GET; no cookies, localStorage, sessionStorage, IndexedDB, caches, or service workers; what was typed appears in no URL and no storage. `privacy-claims.test.ts` ties those claims to the code and fails when a feature starts using any of them. Browser audit at 10 widths (320 to 1440 px): no failed step, no overflow, no control under 44 px, no console error, every sheet fits. PedidosYa appears only in the footer and the info sheet. The notice sits right above the button, in the sheet footer, 14 px, with `aria-describedby`. Footer keyboard order: directions, Instagram, PedidosYa, Privacidad; Enter opens the notice and Esc returns focus to the button. The impeccable detector reports nothing.
- L8 Decisions: the official PedidosYa logo is NOT included (not obtainable from an official source; see L6); the link shows the name as text and `src/data/brand-assets.ts` is the one place to add the file. «Nombre y apellido» and the button label are recorded in the decisions doc (D12, D13). Zone prices, rain, and night surcharges are not published. Data to ask the owner and the date to revisit the notice: `docs/decisiones-pendientes.md` (D9 to D13, the lists below it). Screenshots: `../heraldopizza-capturas/u2-iteracion-7/`. Risk: none (copy, information, and one link component; no pricing or order logic changed). The 12 legal and commercial gaps are listed for the owner; none was filled in.
