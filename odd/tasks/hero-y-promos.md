# Visual iteration — stronger hero and a Promotions section

Objective: the header shows the real venue as the protagonist (black corrugated sheet, pine, warm light) without the brand covering the best of the photo, and a commercial, scannable Promotions section is designed with the owner's real promos as prototype data only.
Branch: `feat/hero-y-promos` (from `main` at `af7a82b`). Delivery: work-unit commits; push, PR, and merge only with the user's authorization. Test runner: Vitest; browser checks with Playwright.

## Specs

- S1 Hero (approved): «La imagen actual no resalta lo suficiente el local. Quiero que el hero muestre mejor la identidad de Heraldo Pizza: chapas negras, madera cálida, ambiente gastronómico, local real. Ajustar encuadre, tratamiento visual, overlay y jerarquía para que el local sea protagonista. El logo, textos y CTAs no deben tapar la parte más atractiva de la imagen.» Approved approach: «reencuadre de la misma foto para destacar chapa negra, pino/madera y barra, evitando techo con fluorescentes y autos.»
- S2 Promotions: «Agregar una sección visual y atractiva de “Promociones” o “Promos destacadas”. Debe sentirse comercial, llamativa y fácil de escanear. [...] Pensar formato mobile-first, idealmente con cards destacadas o carrusel horizontal.»
- S3 Data policy, verbatim: «No usemos placeholders. [...] usar las promos reales únicamente como fixture/datos de prototipo y desarrollo; mostrarlas en desarrollo y #sistema para validar diseño, responsive e interacción; en producción pública, si todavía no existe una fuente real de promociones, no renderizar la sección; no inventar promos ni precios.» For U9: «crear la fuente de datos real; cargar estas promociones; conectar el componente existente; permitir desde admin crear, editar, activar/desactivar y eliminar promociones; la UI de Promociones no debería necesitar rediseñarse.»
- S4 The eight promos, verbatim: «1. Muzza + 6 empanadas surtidas — $32.000 Aclaración: no son a elección. 2. Especial + Pizza Muzzarella — $35.000 3. Especial + Coca-Cola 1,75 + 6 empanadas de JyQ — $42.500 4. Docena de empanadas surtidas — $30.000 5. Docena de empanadas a elección — $36.000 6. Muzza + Especial + 6 empanadas de JyQ — $52.000 7. Tres pizzas Muzzarella — $42.000 8. Pizza Napolitana + Pizza Especial — $42.000»
- S5 Scope: «No quiero rehacer toda la estructura. La base del prototipo está bien.» Keep the Heraldo look: «chapa negra, madera, rojo Heraldo, luz cálida, estilo gastronómico moderno y atractivo».

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S5 | inline | done | `60d12a5` |
| T2 | S2, S3, S4, S5 | inline | done | this commit |
| T3 | S1–S5 | browser checks + review | pending | |

## Log

- L1 (2026-10-17) User's request: «El prototipo va bien en estructura general, pero quiero una nueva iteración visual con dos cambios importantes: 1. Mejorar el encabezado / hero [...] 2. Agregar una sección de promociones [...] Importante: No quiero rehacer toda la estructura. [...] Mantener la estética de Heraldo: chapa negra, madera, rojo Heraldo, luz cálida, estilo gastronómico moderno y atractivo.» Then the data policy (S3) and the eight promos (S4).
- L2 Decision for S3: the promo fixture loads only in development (`import.meta.env.DEV`), in the menu and in `#sistema`, through a lazy import, so a production build carries neither the section nor the promo data until U9 provides a real source. Interpretation of «mostrarlas en desarrollo y #sistema» reported to the user.
- L3 Baseline at 390 px (`../heraldopizza-capturas/hero-promos/antes/`): the logo covers the center of the photo (tables and door), the ceiling with fluorescent tubes and the street cars dominate, and «Info» sits on the photo.
- L4 T1: three capture rounds (`v1`–`v3`) at 360/390/768/1280. Mobile crop zooms toward the tables and pine wall; street darkened by the top gradient; Info shares the address row, hours on its own line. Header 316/351 px at 360/390 (before 266/293); desktop unchanged from v1 (460 px), accepted as the venue photo's room.
- L5 T2: RED observed (missing module), then GREEN. `Promotion.activeFrom/activeTo` nullable (validity not given, not invented). Cards split the title on « + », price on a pine board, one swipeable row at every width (a desktop grid of 8 pushed the menu ~1,300 px down). Checks: typecheck, lint, 291 Vitest, build, `check:bundle` (now fails if a prototype promo id reaches `dist`; mutation-tested), E2E 5/5, impeccable detect `[]`. Browser: 8 equal-height cards, no page overflow at 360–1280, «Sumar» adds one promo line. pgTAP not rerun: no SQL changed.
