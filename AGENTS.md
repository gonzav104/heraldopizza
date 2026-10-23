# AGENTS.md — Heraldo Pizza

Guía compartida para asistentes de desarrollo que trabajen en este repositorio. Aplica a todo el proyecto, salvo que un `AGENTS.md` más específico indique lo contrario. **No reemplaza los requerimientos del negocio.**

## 1. Objetivo y alcance

Heraldo Pizza es una **carta digital web, mobile-first y de una sola página (SPA)** para un local gastronómico de Campana, Buenos Aires, Argentina.

- **Público:** navegar el menú por categorías, consultar productos y promociones, armar un carrito y abrir WhatsApp con el pedido redactado.
- **QR:** el código QR solo abre la carta pública (la misma que ve cualquier cliente). No existe un modo QR especial.
- **Administrador:** existe en `/admin` (U1, `src/features/admin`) con acceso autenticado, dos secciones («Carta | Promociones») y, sobre Supabase, edición de precios, disponibilidad y datos de productos (U1) y administración de promociones (P5b: alta, edición, activación, vigencia, días y orden). Está pendiente completar la gestión de categorías, altas/bajas, variantes, ajustes porcentuales, horarios, zonas de envío y configuración, sin editar código; las imágenes están fuera del MVP.
- **Sin pagos online ni sistema de comandas:** WhatsApp es el canal de contacto; abrir el enlace no prueba que el cliente haya enviado el mensaje ni que el local lo haya aceptado.

**Orden de implementación acordado:** (1) base técnica; (2) diseño y carta pública con datos locales; (3) carrito, lógica comercial, checkout y WhatsApp; (4) Supabase y panel administrador. U1 (experiencia del administrador) ya está integrada en `main`; la **prioridad actual** es completar carrito, lógica comercial, checkout y WhatsApp, sin bloquearlo con administración restante. El orden de desarrollo no cambia las prioridades MVP/F2 del documento funcional.

## 2. Fuentes de verdad y decisiones pendientes

Cuando estén incorporados al repositorio, consultar antes de implementar:

1. `docs/requerimientos.pdf`: alcance, identificadores RF/RNF/RN, prioridades y criterios de aceptación. Es la autoridad sobre reglas de negocio.
2. `docs/seed_catalogo.sql`: catálogo inicial, nombres, descripciones, variantes, importes y orden. Es la autoridad sobre los datos de productos, **no** sobre el esquema definitivo de la base.
3. Decisiones explícitas del responsable del proyecto, documentadas y fechadas: tienen precedencia sobre propuestas técnicas y deben reflejarse en la documentación pertinente.

**No inventar** precios, imágenes, promociones, historia del dueño, zonas de reparto, horarios nuevos ni contenido comercial. Para datos faltantes, usar un estado vacío o un placeholder claramente señalado como tal.

**Inconsistencias conocidas que no deben resolverse a ciegas:** el PDF menciona 70 productos en 10 categorías en su cierre, pero el SQL contiene 84 productos en 13 categorías, con 110 variantes (81 productos en 12 categorías hasta que se agregó Postres, el 2026-10-15). Hay 17 variantes con precio `NULL` (`Consultar en barra`), en 16 productos de cafetería y tragos, mientras que RN-01 exige una variante con precio positivo para publicar un producto.

**Política decidida (2026-10-16, opción A):** un producto sin ninguna variante con precio se muestra como «Consultar en barra», pero no se puede agregar al carrito; si un producto combina variantes con y sin precio, solo se pueden pedir las que tienen precio. Nunca convertir un `NULL` en `$0` ni habilitar su compra.

No ejecutar el seed SQL directamente: primero verificar esquema, claves, restricciones, migraciones, permisos e idempotencia. Desde U3a, el seed se carga solo en el stack local de Supabase, después de las migraciones (`supabase db reset`); nunca en un proyecto remoto sin autorización expresa. `docs/` puede no existir todavía; solicitar los archivos si faltan, en lugar de recrearlos de memoria.

## 3. Stack y estado real

**Ya instalado y en uso:** React 19, TypeScript, Vite 8, ESLint, npm, Tailwind CSS v4, Lucide React, Zustand, Vitest, Testing Library, Playwright (E2E) y `@supabase/supabase-js`. Supabase (PostgreSQL con RLS y Auth, migraciones y pruebas en `supabase/`) se usa en el stack local. `package.json` es la referencia para versiones y scripts efectivos.

**Planificadas o sin usar, no presuponer instaladas:** shadcn/ui, React Router, React Hook Form y Zod (no figuran en `package.json`). Supabase Storage no se usa: las imágenes están fuera del MVP.

- Preferir TypeScript estricto; evitar `any` sin justificación documentada.
- Mantener componentes accesibles y reutilizables; separar presentación, estado, casos de uso, adaptadores de datos y cálculos.
- No crear backend Express, Spring Boot ni microservicios por iniciativa propia.
- No introducir bibliotecas o estructuras de carpetas nuevas sin una necesidad concreta.
- Usar `npm` y respetar `package-lock.json`. No mezclar gestores de paquetes.
- Consultar documentación vigente antes de usar APIs desconocidas o que hayan cambiado.

Distribución de `src/`: las carpetas existen, pero los comentarios describen su responsabilidad prevista y no que todo esté terminado (por ejemplo, el carrito se conserva al recargar, RF-17, y se reconcilia con la carta cargada, P2, y se verifica contra una carta recién consultada antes del mensaje, P6a, pero el enlace real de WhatsApp sigue apagado). `types/` no existe (los tipos del dominio están en `domain/`) y el resto de las carpetas se crea a medida que se necesita:

```text
src/
  app/                 # arranque, providers, rutas
  components/ui/       # componentes base
  features/catalog/    # carta y variantes
  features/cart/       # carrito y su persistencia versionada en el navegador (RF-17)
  features/checkout/   # costos, datos del cliente, WhatsApp
  data/                # catálogo mock y adaptadores a Supabase
  domain/              # modelos del catálogo
  features/admin/      # administrador (/admin)
  lib/                 # utilidades puras y formato monetario
```

Crear carpetas **a medida que se necesiten**, no todo por adelantado. El módulo administrador ya existe y comparte modelos sin acoplarse al frontend público.

## 4. Reglas de negocio que no se pueden romper

Mantener las reglas completas del PDF como autoridad. Estas son las que más fácilmente generan regresiones:

- **Importes:** pesos argentinos enteros (`ARS`), sin decimales; mostrar precios con formato local. El total es **orientativo** y lo confirma el local por WhatsApp. Centralizar las operaciones monetarias en funciones puras, con pruebas.
- **Variantes:** cada variante tiene su propio precio. Las pizzas muestran **entera y media** en una misma fila. Una pizza mitad y mitad cuesta la **suma de los precios de dos medias**. Los precios son los mismos para retiro y envío.
- **Empanadas:** por unidad y gusto. La **docena surtida** (gustos definidos por el local) es un producto aparte y no se interpreta como 12 gustos a elección. La **docena de empanadas a elección** debe permitir seleccionar gustos y cantidades por gusto hasta completar exactamente **12 unidades**; no se puede agregar al carrito incompleta ni excedida.
- **Disponibilidad:** sin stock implica visible, pero no comprable. Por encargo implica aviso de anticipación visible y presente en el mensaje. Una variante sin precio válido no se puede agregar.
- **Promociones:** las ocho promociones originales ya están definidas y verificadas; **no reconstruirlas ni pedir de nuevo los datos**. Desde P5a se leen de la tabla `promociones` de Supabase (seed separado `supabase/seed_promociones.sql`, idempotente) con su código comercial (`codigo`, p. ej. `promo-docena-eleccion`) como `Promotion.id`: ese código no cambia nunca porque lo guardan los carritos. La base solo muestra al público las visibles y vigentes (hora de Argentina); nunca se borran, se desactivan. `src/data/prototype-promotions.ts` queda solo como fixture de tests y de `#sistema`. La única promoción configurable admitida es la de 12 empanadas a elección (la base solo acepta 12 unidades de la categoría Empanadas), y su composición no cambia después de crearla. Se administran desde `/admin` (P5b): se crean desactivadas, el orden se cambia con `mover_promocion()` (atómico) y nunca se borran. Son combos cerrados con precio propio, visibles solo cuando están activas y coinciden fecha y día de semana (vigencia no suministrada: no inventarla). No permitir cambiar sus componentes, salvo la selección de gustos de la docena a elección descrita arriba.
- **Carrito:** conservar al recargar, permitir cantidades, aclaración por ítem, edición y eliminación. No vaciar el carrito automáticamente al abrir WhatsApp (RF-21 es F2).
- **Pedido:** nombre y apellido (al menos dos palabras), retiro/delivery, dirección **solo obligatoria para delivery** (completa, en el mensaje), medio de pago y nota general opcional. **No se pide zona ni barrio.**
- **Envío (decisión del dueño, 2026-10-22):** **no hay recargo por pizza** ni en los precios ni en el total. El cliente paga la **motito aparte**, con tarifa según el destino: el checkout no la calcula ni pide zona, y el total orientativo no la incluye. La lista oficial de tarifas (barrios/localidades y fábricas, `src/data/delivery-rates.ts`) se consulta desde el botón «Consultar tarifas de reparto» de la sección «Tarifas de la motito», solo con envío; si el destino no figura, se consulta al local, que confirma el precio final. No hay monto mínimo de pedido.
- **Lluvia y después de las 00:00:** solo con envío se muestran dos **aclaraciones** literales del dueño («Lluvia: puede aplicarse un adicional de $1.000 si llueve al momento del retiro» y «Después de las 00:00: puede aplicarse un adicional de $1.000 hasta finalizar el turno»). No se suman al pedido, al total ni al mensaje.
- **Pagos:** delivery = efectivo o transferencia. Retiro = efectivo, transferencia, débito o crédito; crédito lleva **8 % de recargo**. No habilitar crédito ni débito en delivery. El 8 % se calcula solo sobre los productos, redondeado al peso entero más cercano.
- **Recargo nocturno:** solo la aclaración de arriba; su automatización (RF-65) sigue en F2.
- **QR:** enlace a la carta pública, sin modo especial, sesión temporal, marca de origen, vencimiento ni aviso al mozo. Reemplaza RF-51 y RN-09 (decisión del responsable, 2026-10-18); RF-50 conserva el acceso por QR. No bloquear carrito ni checkout según el origen de la visita.
- **WhatsApp:** codificar correctamente el texto con productos, variantes, cantidades, observaciones, modalidad, dirección completa si es envío, aclaración de que el reparto se paga aparte, pago, recargo por crédito y total orientativo. No generar pagos, pedidos o confirmaciones ficticias en la base.

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
- Para el panel administrador: autenticación del administrador, sin registro público; escrituras protegidas por RLS y validaciones reales del lado servidor/base, no por ocultar botones.
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
- Para UI: comprobar interacciones en móvil y escritorio mediante Playwright cuando esté disponible; verificar navegación, teclado y estados relevantes.
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
