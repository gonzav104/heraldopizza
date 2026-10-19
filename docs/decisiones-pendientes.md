# Decisiones pendientes e inconsistencias

Relevado el 2026-10-15 a partir de `docs/requerimientos.pdf` (PDF) y `docs/seed_catalogo.sql` (SQL).

**Decisión vigente (2026-10-15, responsable del proyecto):** el SQL es la fuente provisional de productos y precios. Las diferencias con el PDF quedan registradas acá; no se resuelven con datos inventados.

## Actualización vigente — 2026-10-18

Estas decisiones posteriores reemplazan las referencias históricas incompatibles de este documento y de las guías iniciales:

- **QR:** enlace a la misma carta pública, sin modo especial, sesiones temporales, vencimiento ni aviso al mozo. Reemplaza RF-51 y RN-09; RF-50 conserva el acceso mediante QR. La impresión espera la URL definitiva.
- **Productos sin precio:** decisión A del 2026-10-16: se muestran como «Consultar en barra», sin compra; en productos mixtos solo se pueden pedir variantes con precio. La pregunta histórica sobre mostrarlos está resuelta.
- **Imágenes:** administración fuera del MVP; no se incorpora a U1.
- **Lluvia:** solo una aclaración informativa sobre un posible recargo del servicio de reparto externo. No hay interruptor administrativo ni recargo automático; no entra en el total ni en los cálculos. Reemplaza el recargo fijo por lluvia de RN-16 y resuelve la duda sobre su redacción («retiro» vs. envío).
- **Docena de empanadas a elección:** debe permitir elegir gustos y cantidades por gusto hasta completar exactamente 12 unidades. La «Docena de empanadas surtidas» (gustos definidos por el local) sigue siendo un producto aparte.
- **Promociones:** las ocho promociones reales suministradas por el dueño ya están en `src/data/prototype-promotions.ts`. El commit `1922f02` y `odd/tasks/hero-y-promos.md` documentan presentación, incorporación al carrito y verificaciones. `dev-promotions.ts` las carga solo en desarrollo; `supabase-catalog-repository.ts` devuelve promociones vacías. Lo pendiente es la integración productiva, no obtener otra vez los datos ni reconstruir la sección. Vigencia no suministrada permanece sin inventar. Ya están definidas y verificadas: no se reconstruyen. La docena a elección sigue la regla de 12 unidades de arriba, que reconcilia la regla general de combos cerrados (sus componentes no se editan, salvo esa selección de gustos).
- **Prioridad después de U1:** completar menú → configuradores existentes → carrito → checkout → WhatsApp, con la configuración operativa necesaria. La administración restante no debe bloquear innecesariamente ese recorrido.

Orden de trabajo actualizado:

1. U1: experiencia del administrador, con contratos existentes y sin nuevas funciones comerciales.
2. Cierre del recorrido comercial: persistencia/reconciliación del carrito (RF-17), configuración operativa necesaria, checkout y enlace WhatsApp real, reutilizando formulario y cálculos. Contemplar zonas, modalidades, pagos y recargo por pizza; la lluvia es solo informativa (ver arriba). El recargo nocturno automático sigue en F2.
3. Integración productiva de las promociones existentes y su administración, vigencia y cobro correcto de envío; asociación avanzada de productos RF-44 sigue en F2.
4. Completar gestión administrativa: categorías (incluido su orden, MVP), altas/bajas y variantes; ajustes porcentuales con vista previa y redondeo (RF-40/41, MVP). Reordenar productos RF-37 sigue en F2.
5. Aceptación integral, rendimiento, accesibilidad, datos del local/horarios e indicador abierto/cerrado RF-24, publicación autorizada y QR definitivo. Las dependencias comerciales necesarias se adelantan al punto 2.

La evidencia de «sin llamadas de red» de D11 describe el prototipo histórico; el catálogo público actual consulta Supabase. La numeración antigua de unidades no define este orden vigente. No se accede a Supabase remoto durante U1.

## Inconsistencias entre PDF y SQL

| # | Tema | PDF | SQL | Estado |
|---|------|-----|-----|--------|
| 1 | Volumen del catálogo | 70 productos en 10 categorías | 81 productos en 12 categorías; 84 en 13 desde que se agregó Postres (ver abajo) | Se usa el SQL (provisional) |
| 2 | Categorías (RF-01) | Menciona panchos y ensaimadas como categorías | No hay panchos; la ensaimada está dentro de Cafetería. Hay hamburguesas, picadas, papas fritas, pastas, cafetería y tragos de autor | Se usa el SQL (provisional) |
| 3 | Productos sin precio vs RN-01 | RN-01: un producto visible necesita una variante con precio > 0 | 16 productos tienen todas sus variantes con precio `NULL` ("Consultar en barra"): 4 cafés, medialunas, 4 tragos clásicos y 7 de autor | Se contemplan en el modelo y **no se pueden agregar al carrito**. Falta definir si se muestran |
| 4 | Recargo por pizza | RF-62: línea aparte. RN-15: "suma $1.000 a su precio" | — | Falta definir cómo se muestra |
| 5 | Recargo por lluvia | RN-16 dice "al momento del retiro" | — | Resuelto (2026-10-18): solo aclaración informativa, sin recargo automático |

## Datos faltantes

- **Zonas de envío y costos** (RF-19, RF-63, RN-14): el PDF remite a un "documento técnico" que no está en el repo. Solo se conocen rangos (barrios de $2.500 a $18.000, fábricas de $3.000 a $10.000).
- **Promociones** (RF-10 a RF-12): histórico; las ocho promociones reales ya están cargadas en `src/data/prototype-promotions.ts` (ver «Actualización vigente»). Falta su vigencia.
- **Descripciones:** 36 productos tienen descripción `NULL`.
- **Fotos de productos:** esta versión no las usa (decisión del dueño, ver abajo).
- **Horario nocturno:** el turno es de 19 a 00, pero RN-16 habla de un recargo "desde las 00:00 hasta el fin del turno". Falta confirmar si el turno sigue después de medianoche.
- **Recargo nocturno** (RF-65): es F2 y queda fuera del MVP salvo decisión expresa.
- **Dominio** (RNF-19): `heraldopizza.com.ar` todavía no está comprado. No imprimir QR definitivos.

## Decisiones del dueño (2026-10-15)

Las trajo el responsable del proyecto después de revisar el prototipo de U2 («El mostrador»). Cambian o precisan los requerimientos originales; las unidades siguientes (U5 a U8) las implementan con sus pruebas.

| # | Decisión | Requerimiento afectado | Cambio respecto del original |
|---|----------|------------------------|------------------------------|
| D1 | Desde la carta, cada pizza se agrega **entera** con un toque. La **media pizza** y la **mitad y mitad** se arman solo en el configurador «Armá tu pizza». | RF-13, RF-56, RF-60 | RF-60 se mantiene: la fila sigue mostrando los precios de entera y de media. Cambia cómo se pide la media: ya no se agrega directo desde la fila, sino desde el configurador. |
| D2 | En «Armá tu pizza», la primera mitad es obligatoria y la segunda opcional. Con un gusto se agrega media pizza al precio de media; con dos, una mitad y mitad que suma las dos medias. | RF-56, RN-10 | RN-10 no cambia. Se suma que la media pizza se pide desde el mismo configurador. |
| D3 | **No se puede elegir dos veces el mismo gusto** en una mitad y mitad: el gusto elegido en una mitad queda deshabilitado en la otra. | RF-56 | Nueva restricción; el requerimiento original no la mencionaba. |
| D4 | Una mitad y mitad cuenta como **una pizza** para el recargo de envío. | RN-15, RF-62 | Sin cambios; se confirma la regla. |
| D5 | Esta versión **no tiene fotos de productos**. Cada categoría lleva un recurso gráfico propio. | RF-03, RF-09 (F2), RF-36, RNF-02, RNF-03 | RF-03 deja de mostrar foto por producto. La carga de fotos del panel (RF-36) y las reglas de optimización (RNF-02, RNF-03) quedan sin uso hasta que se retome. |
| D6 | Nueva categoría **Postres**: Chocotorta $ 10.500; Vigilante con dos variantes, membrillo con queso y batata con queso, $ 7.500 cada una; Durazno con dulce de leche $ 7.000. | RF-01, catálogo | Se agregó a `docs/seed_catalogo.sql` (no se ejecuta). Va en el orden 8, después de Pastas, y las categorías siguientes bajan un lugar (Licuados 9 … Tragos de autor 13). El dueño no definió la unidad de venta ni las descripciones: la variante se llama «Unidad» y la descripción queda vacía. |
| D7 | La sección **Info** muestra solo dirección (con cómo llegar), horarios, contacto e Instagram. | RF-23 | Se quita la explicación del funcionamiento del salón. Histórico: esta decisión conservaba el modo consulta por QR; fue reemplazada el 2026-10-18 (el QR solo abre la carta pública, sin modo especial). |
| D8 | Ícono oficial de Instagram junto al perfil real `@heraldopizza`, y un footer compacto. | RF-23 | Sin cambio de alcance. |

**Pendiente de confirmar con el dueño:** la unidad de venta de la Chocotorta y del Durazno con dulce de leche (porción u otra), y si los postres llevan descripción.

## Decisiones de la iteración 7 (2026-10-16)

Las pidió el responsable del proyecto después de aprobar el diseño de U2. Ninguna cambia el carrito, los cálculos ni la forma de armar los pedidos.

| # | Decisión | Requerimiento afectado | Cambio respecto de lo anterior |
|---|----------|------------------------|-------------------------------|
| D9 | La información del local vuelve a mostrar **cómo pedir, medios de pago y envío**: WhatsApp (coordinación y confirmación), retiro o envío, pagos según la modalidad, costo de envío según la zona, $ 1.000 por pizza en los envíos y sin pedido mínimo. | RF-23, RN-03, RN-11, RN-15 | Reemplaza la parte de D7 que sacaba esos datos de «Info». Los textos salen de las mismas reglas que usa el checkout. No se publican los costos por zona (RF-26 es F2 y falta la lista) ni el recargo nocturno; la lluvia pasó a ser una aclaración informativa (2026-10-18). |
| D10 | **PedidosYa** es un canal secundario: enlace solo en el pie y en «Info», nunca en el encabezado, el carrito ni el checkout. WhatsApp sigue siendo el canal principal. | — | La URL está en `src/data/store-info.ts` (`pedidosYaUrl`). El logo oficial queda pendiente: se agrega en `src/data/brand-assets.ts`; hasta entonces se muestra el nombre como texto. |
| D11 | **Aviso de privacidad**: hoja «Privacidad» desde el pie, con cinco temas breves (qué datos, para qué, quién decide el envío, qué pasa al enviar, cómo consultar). | RF-18, RF-20 | Solo afirma lo que se comprobó: la página no usa cookies, almacenamiento, analítica ni llamadas de red, y lo escrito no sale del dispositivo. Un test (`privacy-claims.test.ts`) falla si el código empieza a usar alguna de esas cosas. El texto describe el flujo final de U8 (se abre WhatsApp con el mensaje listo); el prototipo todavía no lo abre. |
| D12 | **Aviso de confirmación** junto al botón de WhatsApp. El botón pasa de «Enviar por WhatsApp» a **«Continuar en WhatsApp»**. | RF-20, RN-03 | El botón abre WhatsApp con el mensaje preparado y el cliente lo envía desde ahí, así que «Enviar» no era exacto. Al texto pedido se sumó «para que lo envíes». Sin pantalla ni casilla de aceptación. |
| D13 | El campo **«Nombre y apellido»** reemplaza a «Nombre» y exige al menos dos palabras. | RF-18 | Pedido en la iteración 6; queda registrado acá. |

### Qué verificamos antes de escribir el aviso (2026-10-16)

- **Código:** `src/` no usa `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `fetch`, `XMLHttpRequest`, `sendBeacon`, service workers ni scripts de analítica. `index.html` no carga nada de otro sitio (las tipografías se instalan con el proyecto).
- **Navegador:** se recorrió el pedido completo con datos de prueba. Hubo 66 pedidos de red, todos al mismo origen y todos GET. No quedaron cookies, almacenamiento local ni de sesión, IndexedDB, cachés ni service workers, y lo escrito no apareció en ninguna URL.
- **Alcance:** esto describe la aplicación, no el servicio donde se publique. El hosting todavía no está elegido y puede registrar datos técnicos de acceso (por ejemplo la dirección IP).

### Datos que hay que pedirle al dueño

**Comerciales**

1. **Archivo oficial del logo de PedidosYa** (SVG o PNG, de su portal de socios o de su ejecutivo de cuenta) y sus reglas de uso. El sitio de PedidosYa bloquea la descarga automática y no encontramos un kit público.
2. ¿Los **precios y costos de envío en PedidosYa** son los mismos que en la carta? Si difieren, conviene aclararlo.
3. **Lista de zonas de envío** (barrios y fábricas) con su costo (RF-19, RF-63). Hoy solo existe «Otra zona (a consultar)».
4. ~~Recargo por lluvia~~ Resuelto: aclaración informativa, sin recargo automático. **Recargo nocturno** (RF-65, F2): si se informa. Hoy no se publica.
5. ¿El **11 7058-2325** puede publicarse? El PDF dice que es una cuenta personal de WhatsApp, no Business. ¿Atiende llamadas? ¿Hay otro teléfono?
6. Horario nocturno: ¿termina a las 00:00 o sigue después? (ya figuraba arriba).
7. Unidad de venta de la Chocotorta y del Durazno con dulce de leche, y si llevan descripción (ya figuraba arriba).

**Legales y de privacidad** (conviene validarlos con un contador o abogado antes de publicar)

8. **Nombre del titular o razón social, CUIT y domicilio legal**, si difiere de Av. Mitre 1130. El aviso hoy nombra solo a «Heraldo Pizza» y su dirección comercial.
9. **Canal formal para consultas sobre datos personales**: hoy el aviso indica WhatsApp, Instagram y el local. ¿Hay un correo electrónico?
10. **Cuánto tiempo conserva el local las conversaciones de WhatsApp** y si carga los pedidos en Fudo (el PDF dice que se cargan a mano). Si Fudo guarda nombre y dirección, hay que decidir si se menciona.
11. **Ley 25.326 (art. 6)**: según la guía de la AAIP, al recabar datos hay que informar la finalidad, los destinatarios, la existencia de la base de datos y la identidad y domicilio de su responsable, el carácter obligatorio o facultativo de las respuestas, y los derechos de acceso, rectificación y supresión. El aviso cubre la finalidad, los destinatarios y los derechos; faltan la identidad completa del responsable (punto 8) y definir si corresponde registrar la base ante la AAIP. Esto no es asesoramiento legal.
12. Cuando se elija el **hosting**, revisar si guarda registros de acceso y ajustar el aviso.

### Cuándo hay que volver a tocar el aviso

- **U5** (el carrito se guarda en el dispositivo), **U8** (se abre WhatsApp de verdad) o la fase de **Supabase**: el test de coherencia falla y el aviso debe actualizarse en el mismo cambio.

