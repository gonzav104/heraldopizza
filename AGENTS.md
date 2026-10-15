# AGENTS.md — Heraldo Pizza

Guía compartida para asistentes de desarrollo que trabajen en este repositorio. Aplica a todo el proyecto, salvo que un `AGENTS.md` más específico indique lo contrario. **No reemplaza los requerimientos del negocio.**

## 1. Objetivo y alcance

Heraldo Pizza es una **carta digital web, mobile-first y de una sola página (SPA)** para un local gastronómico de Campana, Buenos Aires, Argentina.

- **Público:** navegar el menú por categorías, consultar productos y promociones, armar un carrito y abrir WhatsApp con el pedido redactado.
- **En el salón:** el QR abre un **modo consulta**, sin carrito ni pedido online; el cliente pide al mozo.
- **Administrador (etapa posterior):** el dueño gestiona productos, variantes, precios, imágenes, promociones, horarios, zonas de envío y configuración, sin editar código.
- **Sin pagos online ni sistema de comandas:** WhatsApp es el canal de contacto; abrir el enlace no prueba que el cliente haya enviado el mensaje ni que el local lo haya aceptado.

**Orden de implementación acordado:** (1) base técnica; (2) diseño y carta pública con datos locales; (3) carrito, checkout, WhatsApp y modo QR; (4) Supabase y panel administrador. El orden de desarrollo no cambia las prioridades MVP/F2 del documento funcional.

## 2. Fuentes de verdad y decisiones pendientes

Cuando estén incorporados al repositorio, consultar antes de implementar:

1. `docs/requerimientos.pdf`: alcance, identificadores RF/RNF/RN, prioridades y criterios de aceptación. Es la autoridad sobre reglas de negocio.
2. `docs/seed_catalogo.sql`: catálogo inicial, nombres, descripciones, variantes, importes y orden. Es la autoridad sobre los datos de productos, **no** sobre el esquema definitivo de la base.
3. Decisiones explícitas del responsable del proyecto, documentadas y fechadas: tienen precedencia sobre propuestas técnicas y deben reflejarse en la documentación pertinente.

**No inventar** precios, imágenes, promociones, historia del dueño, zonas de reparto, horarios nuevos ni contenido comercial. Para datos faltantes, usar un estado vacío o un placeholder claramente señalado como tal.

**Inconsistencias conocidas que no deben resolverse a ciegas:** el PDF menciona 70 productos en 10 categorías en su cierre, pero el SQL adjunto contiene 81 inserciones de productos en 12 categorías. El SQL contiene variantes con precio `NULL` (`Consultar en barra`), mientras que RN-01 exige una variante con precio positivo para publicar un producto. Consultar antes de definir la política de visibilidad definitiva. Nunca convertir un `NULL` en `$0` ni habilitar su compra.

No ejecutar el seed SQL directamente: primero verificar esquema, claves, restricciones, migraciones, permisos e idempotencia. `docs/` puede no existir todavía; solicitar los archivos si faltan, en lugar de recrearlos de memoria.

## 3. Stack y estado real

**Ya inicializado:** React 19, TypeScript, Vite 8, ESLint y npm (`package.json` es la referencia para versiones y scripts efectivos).

**Tecnologías planificadas, no presuponer instaladas:** Tailwind CSS v4, shadcn/ui, Lucide React, React Router, Zustand, React Hook Form, Zod, Vitest, Testing Library y Playwright. Supabase (PostgreSQL, Auth y Storage) se integra después.

- Preferir TypeScript estricto; evitar `any` sin justificación documentada.
- Mantener componentes accesibles y reutilizables; separar presentación, estado, casos de uso, adaptadores de datos y cálculos.
- No crear backend Express, Spring Boot ni microservicios por iniciativa propia.
- No introducir bibliotecas o estructuras de carpetas nuevas sin una necesidad concreta.
- Usar `npm` y respetar `package-lock.json`. No mezclar gestores de paquetes.
- Consultar documentación vigente antes de usar APIs desconocidas o que hayan cambiado.

La siguiente distribución es una **propuesta**, no una estructura ya implementada:

```text
src/
  app/                 # arranque, providers, rutas
  components/ui/       # componentes base
  features/catalog/    # carta y variantes
  features/cart/       # carrito y persistencia
  features/checkout/   # costos, datos del cliente, WhatsApp
  features/local-mode/ # acceso por QR en modo consulta
  data/                # mocks y futuros adaptadores a Supabase
  lib/                 # utilidades puras y formato monetario
  types/               # tipos compartidos solo cuando correspondan
```

Crear carpetas **a medida que se necesiten**, no todo por adelantado. El módulo administrador se agrega después y comparte modelos sin acoplarse al frontend público.

## 4. Reglas de negocio que no se pueden romper

Mantener las reglas completas del PDF como autoridad. Estas son las que más fácilmente generan regresiones:

- **Importes:** pesos argentinos enteros (`ARS`), sin decimales; mostrar precios con formato local. El total es **orientativo** y lo confirma el local por WhatsApp. Centralizar las operaciones monetarias en funciones puras, con pruebas.
- **Variantes:** cada variante tiene su propio precio. Las pizzas muestran **entera y media** en una misma fila. Una pizza mitad y mitad cuesta la **suma de los precios de dos medias**; cuenta como **una pizza** a efectos del recargo de envío.
- **Empanadas:** por unidad y gusto; la docena surtida (gustos definidos por el local) es un producto aparte. No interpretar la docena surtida como 12 gustos a elección.
- **Disponibilidad:** sin stock implica visible, pero no comprable. Por encargo implica aviso de anticipación visible y presente en el mensaje. Una variante sin precio válido no se puede agregar.
- **Promociones:** combos cerrados con precio propio, visibles solo cuando están activas y coinciden fecha y día de semana. No permitir cambiar sus componentes.
- **Carrito:** conservar al recargar, permitir cantidades, aclaración por ítem, edición y eliminación. No vaciar el carrito automáticamente al abrir WhatsApp (RF-21 es F2).
- **Pedido:** nombre, retiro/delivery, dirección **solo obligatoria para delivery**, zona de envío, medio de pago y nota general. La zona se elige entre barrios/fábricas o `Otra zona (a consultar)`.
- **Envío:** costo según zona; `Otra zona` deja costo a confirmar y el total sin ese costo. No hay monto mínimo de pedido. En delivery se agrega un recargo configurable de **$1.000 por cada pizza** (entera, media o mitad y mitad) y otro fijo por lluvia cuando corresponda.
- **Pagos:** delivery = efectivo o transferencia. Retiro = efectivo, transferencia, débito o crédito; crédito lleva **8 % de recargo**. No habilitar crédito ni débito en delivery. El recargo porcentual no aplica al envío.
- **Recargo nocturno:** el documento establece $1.000 después de las 00:00, acumulable con lluvia, pero **RF-65 clasifica su automatización como F2**. No incluirla en el MVP sin decisión expresa.
- **QR en el salón:** misma carta en modo consulta, sin acciones de carrito o checkout y con aviso `Hacé tu pedido al mozo`. Según RN-09, la marca de origen local vence a las **3 horas**; no hacerla permanente por accidente.
- **WhatsApp:** codificar correctamente el texto con productos, variantes, cantidades, observaciones, modalidad, dirección/zona si corresponde, pago, recargos y total orientativo. No generar pagos, pedidos o confirmaciones ficticias en la base.

**Fuera de alcance:** registro de clientes, pago en línea, historial, fidelización, control de stock por unidades, cocina, seguimiento de pedidos, múltiples sucursales e integración con Fudo.

## 5. Diseño, experiencia y accesibilidad

- **Mobile-first real:** el diseño debe poder usarse desde 360 px, sin desplazamiento horizontal y con controles táctiles de al menos 44 × 44 px.
- Identidad de referencia del local: **chapas negras, madera y el logotipo real de Heraldo Pizza**. Buscar una interfaz distintiva y entretenida, no una plantilla gastronómica genérica; preservar legibilidad y velocidad.
- Diseñar primero el recorrido principal: ver menú → elegir variante → agregar → revisar carrito → abrir WhatsApp. El contenido de promociones y la imagen de portada no deben desplazar de forma excesiva la carta.
- Animaciones sutiles, respetar `prefers-reduced-motion`; no sacrificar rendimiento ni navegación con teclado por efectos decorativos.
- Contraste WCAG 2.1 AA, foco visible, semántica HTML, estados vacíos/error/carga, `alt` correcto, etiquetas para controles y mensajes de error comprensibles.
- Imágenes de productos: WebP, lado mayor máximo 1000 px, objetivo menor de 200 KB, carga diferida fuera del primer pantallazo. Evitar fotografías inventadas de productos reales.
- Objetivos RNF: LCP móvil < 2,5 s, Lighthouse > 90 en rendimiento y accesibilidad, carga inicial ligera (< 1 MB sin contar fotografías). Comprobar, no declarar cumplido sin medición.
- El dominio propio para QR es una decisión de despliegue futura; no imprimir QR definitivos apuntando a un proveedor temporal.

## 6. Seguridad y manejo de datos

- Nunca insertar secretos, contraseñas, tokens, `service_role` o credenciales de administrador en código cliente, mensajes, capturas o commits.
- Variables de entorno locales fuera de Git; `.env.example` puede contener **solo nombres y valores ficticios**. Las claves públicas de Supabase no reemplazan RLS.
- Supabase MCP se ha previsto para **un proyecto concreto y en modo `read_only`**. No modificar ni desactivar esa protección, ejecutar migraciones, borrar datos ni crear políticas sin autorización explícita.
- Para el futuro panel: autenticación del administrador, sin registro público; escrituras protegidas por RLS y validaciones reales del lado servidor/base, no por ocultar botones.
- No conectar herramientas a producción ni ejecutar SQL destructivo automáticamente. Probar operaciones de administración en un entorno de desarrollo.
- El repositorio puede ser público: revisar datos y archivos antes de versionarlos, especialmente documentos con contactos, credenciales o información privada.

## 7. Metodología de trabajo, calidad y verificación

**Metodología predeterminada: ODD (Organic Driven Development), proporcionada por Gentle AI.** Seguir el contrato vigente cargado por la instalación global y no sustituirlo por un flujo SDD obligatorio. Este archivo define reglas de Heraldo Pizza; **no replica ni modifica el protocolo ODD**.

- Distinguir tareas de consulta/diagnóstico (solo lectura) de solicitudes que autorizan modificar el código.
- Para cambios pequeños y suficientemente definidos, usar el recorrido ligero de ODD. Para trabajos sustanciales autorizados, seguir el mecanismo de seguimiento y recuperación de ODD configurado realmente en el entorno, incluido Engram cuando corresponda. No abrir una secuencia SDD por defecto.
- Las skills `gentle-sdd-*` y `sdd-*` son opcionales: usarlas solo por petición expresa o propuesta aceptada y sin mezclar sus artefactos con el seguimiento principal de ODD.
- Los tests y verificaciones deben ajustarse al comportamiento solicitado y a la configuración TDD real. No afirmar RED/GREEN/REFACTOR si no se ejecutaron, ni activar RDD o TDD por suposición.
- Los commits de unidades de trabajo deben mantener **descripción en español** y respetar la estrategia de ramas del flujo efectivo. Push, apertura de PR, merge y despliegue requieren la autorización que corresponda y no se deducen de que una tarea esté implementada.
- Antes de codificar: inspeccionar archivos existentes, explicar brevemente el alcance y identificar los RF/RNF/RN afectados.
- Trabajar en **unidades pequeñas y verificables**. No reescribir partes no relacionadas ni ampliar el alcance sin aprobación.
- Preferir lógica de precios/recargos/fechas/checkout en funciones puras, con tests que cubran casos normales, bordes y combinaciones.
- Para UI: comprobar interacciones en móvil y escritorio mediante Playwright cuando esté disponible; verificar modo QR, navegación, teclado y estados relevantes.
- Revisar los scripts actuales de `package.json`. Inicialmente existen `npm run dev`, `npm run lint` y `npm run build`; **no afirmar que hay `npm test` antes de crearlo**.
- Antes de finalizar una tarea: ejecutar los checks pertinentes, mostrar resultados reales y documentar lo que no pudo comprobarse.
- Si falta un dato comercial importante, pedirlo; no bloquear la construcción visual por contenido todavía no suministrado si puede mostrarse un placeholder explícito.

## 8. Git y mensajes de commit — obligatorio

**Todos los mensajes de commit deben escribirse en español.** Se permiten los prefijos técnicos estándar de Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`), pero **la descripción y el cuerpo van en español**.

Ejemplos válidos:

```text
chore: configurar Tailwind CSS y los alias de importación
docs: documentar las reglas de trabajo de Heraldo Pizza
feat: agregar navegación por categorías
fix: corregir el cálculo del envío para medias pizzas
test: cubrir el cálculo de pizzas mitad y mitad
```

- Hacer commits pequeños y coherentes; inspeccionar `git diff` y `git status` antes de confirmar.
- No incluir `.env`, secretos, `node_modules`, `dist`, capturas temporales ni archivos generados innecesarios.
- No usar `git push --force`, `git reset --hard`, borrar ramas o sobrescribir trabajo ajeno sin autorización específica.
- No publicar, desplegar ni hacer push de cambios por cuenta propia cuando el usuario no lo haya solicitado.

## 9. Cómo reportar cada entrega

Responder **en español**, de forma breve y verificable:

1. Qué se hizo y qué requisitos cubre.
2. Archivos afectados y decisiones relevantes.
3. Qué comandos/pruebas se ejecutaron y sus resultados.
4. Riesgos, bloqueos y siguiente paso recomendado.
5. Si hubo commit, su hash y **mensaje en español**.

Cuando una solución sea una propuesta todavía no aprobada, decirlo explícitamente. No describir prototipos ni mocks como funcionalidades productivas conectadas a Supabase.
