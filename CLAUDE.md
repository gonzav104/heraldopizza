# CLAUDE.md — Heraldo Pizza

<!-- Importación deliberada: AGENTS.md es la guía común y evita duplicar reglas. -->
@AGENTS.md

## Contexto para Claude Code

Estás trabajando en **Heraldo Pizza** (`gonzav104/heraldopizza`), una carta digital SPA mobile-first para una pizzería de Campana (Argentina). El frontend público y el administrador de U1 ya están integrados con Supabase local; el trabajo actual completa el recorrido comercial, y la administración restante queda para después.

El repositorio comenzó con **React 19 + TypeScript + Vite 8 + ESLint + npm**. Antes de presuponer instalaciones o rutas, comprobá `package.json` y el árbol real del proyecto.

### Prioridades para esta fase

1. Preparar la base técnica con cambios acotados y comprobables.
2. Construir una carta pública visualmente distintiva, basada en **chapa negra, madera y la identidad real del local**; diseño accesible y responsive.
3. **Prioridad actual** (U1 ya integrada en `main`): completar carrito, reglas de precios, lógica comercial, checkout y WhatsApp. El QR solo abre la carta pública; no hay modo QR especial.
4. La administración restante (categorías, altas/bajas, variantes, ajustes porcentuales) sigue después y no debe bloquear ese recorrido; conservar modelos y componentes reutilizables.

**No crear una API propia ni ampliar el administrador o la base de datos fuera de la unidad autorizada** (el administrador de U1 y el esquema local de Supabase ya existen). Para prototipos que aún no tienen fuente real, usar un adaptador mock tipado y reemplazable; el trabajo productivo reutiliza o extiende los adaptadores de Supabase existentes (`src/data/supabase-catalog-repository.ts`). No desarrollar todas las fases en una sola solicitud.

### Fuentes obligatorias

- `docs/requerimientos.pdf` — cuando se incorpore: consultar los identificadores de requerimientos y distinguir **MVP** de **F2**.
- `docs/seed_catalogo.sql` — cuando se incorpore: extraer los datos del catálogo sin alterarlos; **no ejecutar SQL** hasta tener un esquema aprobado.
- `AGENTS.md` — reglas compartidas y convenciones de desarrollo, diseño, seguridad, negocio, pruebas y Git.

Si no encontrás alguno de estos archivos, **avisá**; no simules haberlo leído. Hay diferencias documentadas entre el resumen del PDF y el SQL: plantearlas antes de cambiar datos.

### MCP y skills disponibles: uso intencional

- **Context7:** consultar documentación actualizada de React, Vite, Tailwind, shadcn/ui o Supabase cuando una decisión técnica lo necesite; no llamarlo en cada paso trivial.
- **Engram:** recuperar decisiones previas relevantes y persistir hitos/decisiones importantes según su procedimiento real; no guardar secretos ni duplicar notas rutinarias.
- **Playwright MCP:** inspeccionar la app en ejecución (`npm run dev`), probar flujos y revisar tamaños móviles, si está conectado. No afirmar que se probó visualmente si no se abrió el navegador.
- **Supabase MCP:** usar solo cuando toque trabajar con datos; respetar el alcance al proyecto autorizado y `read_only=true` hasta recibir permiso expreso de escritura.
- **`frontend-design`:** utilizar en trabajo de diseño o construcción visual, no para tareas puramente de configuración.
- **`impeccable`:** utilizar para auditorías y refinamientos visuales concretos después de tener una interfaz funcional.
- **Gentle AI — ODD (Organic Driven Development):** usar la metodología ODD que provee la instalación global vigente como flujo de trabajo predeterminado. **No reemplazarla por SDD ni duplicar su protocolo en los archivos del proyecto.** Respetar la configuración efectiva del entorno, sus criterios de autorización, exploración, tareas, verificación, memoria y entrega.
- **Trabajo pequeño vs. sustancial:** para cambios pequeños y claros, proceder con verificaciones proporcionales, sin documentos artificiales. Para trabajos sustanciales y autorizados, seguir la persistencia y el seguimiento de tareas que determine ODD (en versiones compatibles, `odd/tasks/<feature-name>.md` y su espejo en Engram). No inventar artefactos ni declarar sincronización sin verificarla.
- **SDD como alternativa explícita:** las familias `gentle-sdd-*` y `sdd-*` están instaladas, pero no se invocan automáticamente ni se mezclan con ODD. Elegir SDD solo cuando se solicite expresamente o se apruebe una propuesta que justifique sus entregables formales; consultar las definiciones locales antes de utilizarlo.
- Otros plugins/skills pueden estar disponibles; invocarlos solo por una necesidad verificable, no por estar instalados.

### Cómo trabajar conmigo

- Hablá **en español** y evitá explicaciones innecesariamente extensas.
- Proponé un plan corto antes de tareas grandes; para cambios pequeños, ejecutá y verificá directamente.
- **No inventes requisitos, productos, precios, promociones, imágenes ni historias sobre el negocio.** Preguntá solo cuando falte una decisión esencial.
- Entregá cambios acotados, con criterios de aceptación y pruebas. Preferí soluciones simples y sólidas frente a sobreingeniería.
- **No pedir confirmación de rutina para cada paso ya autorizado:** aplicar los límites y verificaciones de ODD, conservando las confirmaciones requeridas para decisiones comerciales, acciones de riesgo y operaciones externas.
- Antes de modificar, leé el código existente y conservá el trabajo ajeno. Pedí autorización para operaciones destructivas, escrituras de Supabase, despliegues y cambios de configuración global.
- Al terminar, indicá cambios realizados, verificaciones ejecutadas, bloqueos y siguiente paso.

### Commits: español obligatorio

Todos los commits **deben tener su descripción en español**. Los tipos Conventional Commits se mantienen en su forma estándar si se usan:

```text
chore: preparar estructura inicial del frontend
docs: agregar documentación para agentes
feat: implementar la selección de variantes
fix: corregir el total del carrito en pedidos con envío
```

No realizar commits genéricos (`update`, `changes`, `fix stuff`) ni incluir archivos ajenos al trabajo. Antes de un commit, revisar cambios y ejecutar los chequeos aplicables. Si ODD indica cerrar una unidad de trabajo con un commit en una rama de funcionalidad, **el mensaje también va en español**. Push, PR, merge y despliegue son decisiones separadas.

### Comandos actualmente confirmados

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

La suite de tests automatizados (Vitest + Testing Library) ya existe y corre con `npm test`; la integración continua ejecuta las mismas verificaciones en cada PR.
