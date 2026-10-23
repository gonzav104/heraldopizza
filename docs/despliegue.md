# Despliegue de Heraldo Pizza — procedimiento y verificaciones

Estado al escribirlo (2026-10-23, P6b-2): el recorrido comercial está integrado en `main` y probado en local. **Nada de esto se ejecutó contra un proyecto remoto**: no hay proyecto de Supabase de producción ni hosting elegido, y el enlace real de WhatsApp está apagado. Cada paso marcado con 🔐 necesita autorización expresa del responsable antes de ejecutarse; el resto se puede hacer y repetir en local.

## 0. Qué se publica, y en qué orden

1. **Base de datos (Supabase)**: esquema (6 migraciones), catálogo inicial, promociones iniciales y un administrador.
2. **Frontend (SPA estática)**: se compila con la URL y la clave *publicable* del proyecto.
3. **WhatsApp real**: una unidad aparte (P6b-2), con autorización aparte (sección 8).

**La base va primero y se verifica antes de publicar el frontend.** La carta pública lee la tabla `promociones` además del catálogo, y cualquiera de las dos lecturas que falle deja la carta en «No pudimos cargar la carta». Publicar el frontend contra una base sin migrar rompe la carta.

## 1. Piezas y su estado

| Pieza | Archivo | Se aplica | Idempotente |
|---|---|---|---|
| Catálogo (tablas, RLS, `privado.tocar_actualizado_en`) | `supabase/migrations/20261016220000_catalogo.sql` | `supabase db push` | no (se aplica una vez) |
| Administradores, `privado.es_admin()` y RLS del catálogo | `…220100_administradores_y_rls.sql` | ídem | ídem |
| `public.soy_administrador()` | `…20261017120000_soy_administrador.sql` | ídem | ídem |
| `public.actualizar_precios_producto()` | `…20261017180000_actualizar_precios_producto.sql` | ídem | ídem |
| Promociones (tabla, RLS, código inmutable, docena de 12) | `…20261022190000_promociones.sql` | ídem | ídem |
| `public.mover_promocion()` (orden atómico) | `…20261023120000_mover_promocion.sql` | ídem | ídem |
| **Seed del catálogo** | `docs/seed_catalogo.sql` | `psql` | **NO** |
| Seed de las 8 promociones | `supabase/seed_promociones.sql` | `psql` | **sí** (`on conflict (codigo) do nothing`) |
| Administrador | a mano (sección 4) | panel + SQL | — |

Las migraciones se aplican en el orden de su marca de tiempo. La CLI registra cada versión en `supabase_migrations.schema_migrations` al aplicarla; si un `db push` falla, `migration list` y la verificación de la sección 3.5 dicen exactamente qué quedó aplicado (no se asume nada sobre qué hizo la CLI a medias).

**El seed del catálogo no es idempotente**: son `insert` simples dentro de una transacción (`begin; … commit;`), con ids fijos para categorías y productos y variantes sin id. Volver a correrlo sobre una base ya cargada falla en el primer `insert` por clave duplicada, y como es una sola transacción **no inserta nada**: no duplica, pero tampoco sirve para completar una carga parcial. Por eso se corre **una sola vez y solo sobre tablas vacías** (sección 3).

**El seed de promociones va después del catálogo**: la docena a elección apunta a la categoría Empanadas (clave foránea y restricción). Es seguro repetirlo: solo agrega los códigos que faltan y nunca pisa precios, textos ni estados que el dueño haya cambiado desde `/admin`.

## 2. Antes de empezar (todo en local, sin autorización)

```bash
npm ci
npm run typecheck && npm run lint && npm test
npm run build && npm run check:bundle -- --whatsapp=apagado
npm run db:start                # stack local
npm run db:test                 # pgTAP: restricciones, RLS, permisos, orden
npm run db:verify               # la verificación SQL de solo lectura sobre la base local recién sembrada
npm run api:verify              # lo que ve un visitante por la API pública, solo con GET
npm run e2e                     # ¡resetea la base local!
```

Todo debe pasar. Además:

- [ ] El proyecto de destino es el correcto y se sabe qué contiene. Si ya tiene datos que importan, `pg_dump` antes de tocar nada (sección 7).
- [ ] La clave que se va a usar en el frontend es la **publicable** (`sb_publishable_…`). La clave secreta y `service_role` no van nunca al frontend, a un `.env` versionado ni a un chat.
- [ ] Se sabe qué contraseña de base de datos se usará y cómo se guarda (gestor de contraseñas, no un archivo del repositorio).
- [ ] **Ensayo previo en un proyecto de Supabase descartable.** Las secciones 3 a 5 solo se probaron contra el stack local: nunca se corrieron contra un proyecto real, así que cosas como lo que muestra `migration list`, los permisos que trae un proyecto nuevo o la existencia de `supabase_migrations.schema_migrations` son lo esperado, no lo comprobado. La primera vez conviene recorrerlas completas en un proyecto de prueba que se pueda borrar, y recién después hacerlo en el definitivo.

## 3. Base de datos 🔐

La cadena de conexión (`DATABASE_URL`, desde el panel de Supabase) **lleva la contraseña**: se carga en la terminal sin dejarla en el historial (`read -rs DATABASE_URL; export DATABASE_URL`) y no se pega en ningún lado.

**3.1 Enlazar y ver qué falta**

```bash
npx supabase link --project-ref <referencia-del-proyecto>
npx supabase migration list           # columnas LOCAL y REMOTE: lo que falta aparece solo en LOCAL
npx supabase db push --dry-run        # lista las migraciones que se aplicarían, sin aplicarlas
```

En un proyecto nuevo deben aparecer las 6, en el orden de la tabla. Si aparece una migración desconocida o falta alguna del medio, **se detiene**.

> No ejecutar `supabase db reset` contra el proyecto enlazado: borra la base. Tampoco `supabase config push` sin revisar antes `supabase/config.toml`, que describe el stack **local** (URL del sitio `127.0.0.1`, confirmaciones apagadas) y podría pisar la configuración real de Auth.

**3.2 Aplicar el esquema**

```bash
npx supabase db push
npx supabase migration list           # LOCAL y REMOTE deben coincidir fila por fila
```

Las migraciones deben aplicarse con la CLI: `supabase_migrations.schema_migrations`, que usa la verificación para saber qué está aplicado, solo existe así. No pegarlas a mano en el editor SQL.

**3.3 Cargar el catálogo, una sola vez**

Precondición: las cuatro tablas están vacías.

```sql
select (select count(*) from categorias)  as categorias,  (select count(*) from productos)   as productos,
       (select count(*) from variantes)   as variantes,   (select count(*) from promociones) as promociones;
-- debe dar 0 0 0 0
```

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -f docs/seed_catalogo.sql
```

Con `ON_ERROR_STOP`, cualquier error corta antes del `commit` y no queda nada. Resultado esperado: **13 categorías, 84 productos, 110 variantes (17 «Consultar en barra», con precio nulo)**.

**3.4 Cargar las promociones**

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -f supabase/seed_promociones.sql
```

Resultado esperado: **8 promociones**, suma de precios **$ 311.500**. Repetirlo da `INSERT 0 0`.

**3.5 Verificar (solo lectura)**

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -A -t -F ' | ' -f supabase/verificar_despliegue.sql
```

También se puede pegar el contenido de `supabase/verificar_despliegue.sql` en el editor SQL de Supabase: es una única consulta `SELECT`. Cada fila termina en:

| Resultado | Significa | Qué hacer |
|---|---|---|
| `ok` | coincide con lo versionado | — |
| `FALLA` | esquema, RLS, permisos o funciones distintos | **no se publica**; se corrige (nueva migración correctiva, nunca editar una aplicada) |
| `DIFERENTE` | datos distintos de los iniciales autorizados | justo después de cargarlos es un error; después de que el dueño edite precios o textos en `/admin` es normal |
| `AVISO` | para mirar, no impide publicar | por ejemplo, todavía no hay un administrador |

Justo después de cargar, las 27 filas deben ser `ok` salvo el `AVISO` del administrador (todavía no se creó). Las huellas de los datos coinciden con `docs/seed_catalogo.sql` y `supabase/seed_promociones.sql`; el archivo se actualiza en el mismo cambio que cualquier migración, permiso o dato inicial (la integración continua lo corre contra el stack local y falla si quedó viejo).

**Qué compara.** Migraciones aplicadas, RLS sin `FORCE`, permisos por tabla y por columna, funciones con su código fuente, y las definiciones completas de políticas (modo permisiva o restrictiva, `USING` y `WITH CHECK`), restricciones, disparadores (función, evento, momento y si están habilitados) y valores por defecto, además de los datos iniciales.

**La versión de PostgreSQL importa.** PostgreSQL arma el texto de esas definiciones al leerlas, y puede escribirlo distinto en otra versión mayor. Las huellas se calcularon en la **17** (la de `supabase/config.toml`). Una fila `AVISO` informa la versión del proyecto: si no es la 17 y alguna fila de definiciones da `FALLA`, no se asume un error ni se ignora: se compara contra un stack local de esa misma versión antes de decidir. Con la 17 y una `FALLA`, es un cambio real.

**Qué no demuestra.** La verificación SQL detecta diferencias respecto del esquema esperado; no es una auditoría de PostgreSQL. No compara índices, secuencias, extensiones ni esquemas ajenos al proyecto. Un resultado `ok` **no reemplaza las pruebas de permisos con pgTAP** (`npm run db:test`, que solo corren en local) y **no garantiza por sí solo la seguridad de una base remota**: confirma que lo versionado está aplicado tal cual. La verificación de la API pública (sección 5) comprueba desde afuera lo que ve un visitante.

> **No** correr las pruebas pgTAP (`npm run db:test`) contra el proyecto remoto: insertan usuarios y filas de prueba. Son solo para el stack local.

## 4. Administrador 🔐

El registro público está cerrado (RF-28): nadie se crea una cuenta solo. El administrador se crea a mano, en este orden:

1. En el panel de Supabase, **Authentication**: cerrar el registro de nuevos usuarios y dejar habilitado el ingreso con email y contraseña. Dejar deshabilitado el ingreso anónimo.
2. En **Authentication → Users**, crear el usuario con el email del dueño y una contraseña larga y única, confirmado. La contraseña no se comparte por chat ni se guarda en el repositorio.
3. En el editor SQL, darle el rol:

   ```sql
   insert into public.administradores (user_id)
   select id from auth.users where email = '<email del dueño>';
   ```
4. Comprobar que pueda entrar a `/admin` y que otra cuenta no.

`scripts/crear-admin-local.mjs` **solo funciona en el stack local** y rechaza cualquier API remota; no se usa en producción.

Otros ajustes de **Authentication** del proyecto (se hacen en el panel; `supabase/config.toml` no los configura en remoto): URL del sitio y URLs de redirección con el dominio real (no `127.0.0.1`), duración de la sesión, y una política de contraseñas más estricta que la local (6 caracteres).

## 5. Verificar la API pública 🔐 (solo `GET`)

Con la URL y la clave **publicable** del proyecto (la misma que va al frontend):

```bash
node scripts/verificar-api-publica.mjs --remoto --url=https://<proyecto>.supabase.co --key=<sb_publishable_…>
```

Comprueba, solo con `GET`, que el registro está cerrado, que el ingreso anónimo está deshabilitado, que se ven 13 categorías, 84 productos, 110 variantes y las 8 promociones con sus precios y orden, que un visitante **no** puede leer la lista de administradores y que el esquema `privado` no está expuesto (solo vale la respuesta `PGRST106` de PostgREST, «Invalid schema»; un 401, 403, 404 o 500 es `FALLA`). No escribe ni crea cuentas. Rechaza claves que parezcan secretas, y sin `--remoto` solo habla con el stack local. Después de que el dueño edite datos, usar `--permitir-diferentes`: solo perdona una diferencia de datos con la API respondiendo bien; cualquier error HTTP (401, 403, 404, 500…) o respuesta ilegible es `FALLA` y bloquea siempre.

Control manual complementario: abrir la carta publicada, comparar tres precios con `docs/seed_catalogo.sql` y ver que se muestran las 8 promociones.

## 6. Frontend

El hosting y el dominio **no están elegidos** (ver `docs/decisiones-pendientes.md`, tema 12 del aviso de privacidad). Requisitos para cualquier elección:

- **Fallback de SPA**: `/admin` es una ruta de la aplicación, no un archivo. El servidor tiene que devolver `index.html` para rutas que no existen, o entrar directo a `/admin` da 404.
- **HTTPS** y dominio definitivo **antes** de imprimir QR (AGENTS.md: no imprimir QR apuntando a un proveedor temporal).

**Compilar en un entorno limpio** (la integración continua u otra máquina sin `.env.local`), con exactamente estas variables y **sin** `VITE_WHATSAPP_ENABLED`:

```bash
VITE_SUPABASE_URL=https://<proyecto>.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_…> \
npm run build
npm run check:bundle -- --whatsapp=apagado
```

⚠️ **Nunca publicar un build hecho en una máquina de desarrollo**: Vite incrusta lo que haya en `.env.local`, y un build local lleva la URL y la clave del stack local (`127.0.0.1:54321`). Se comprobó compilando: la URL local aparece dentro del bundle. Un build así publicado muestra una carta que no carga.

`check:bundle` además verifica que el chunk inicial no lleve `supabase-js` ni el ingreso del panel, que ningún archivo tenga una clave secreta ni `service_role`, que no viajen las promociones de prototipo y **en qué estado está el interruptor de WhatsApp**.

Después de publicar, repetir la sección 5 y abrir `/admin` con la cuenta del dueño.

## 7. Si algo falla

Ningún paso de este procedimiento borra datos existentes. Salvo el de promociones, ninguno es repetible a ciegas.

| Falla en… | Qué pasó | Cómo se sigue |
|---|---|---|
| `db push` (una migración) | las anteriores quedaron aplicadas; de la que falló, no se asume nada | `migration list` y la verificación de la sección 3.5 muestran qué quedó. Corregir la causa y repetir `db push`. Si el error está en una migración que **ya se aplicó en algún lado**, no se edita: se agrega una nueva |
| Catálogo | transacción única: no se insertó nada | corregir y repetir, con las tablas todavía vacías |
| Catálogo, con tablas que **no** estaban vacías | falla en el primer insert, sin cambios | no forzarlo: investigar qué hay cargado (`select count(*)` por tabla). Un catálogo parcial se resuelve a mano, no repitiendo el seed |
| Promociones | idempotente | repetir |
| Administrador equivocado | | `delete from public.administradores where user_id = …`, y crear el correcto |
| Verificación con `FALLA` | el esquema no es el versionado | no publicar el frontend; nueva migración correctiva y `db push` |
| Frontend defectuoso | | volver a publicar el build anterior; la base no cambia por eso |
| Datos mal editados por el dueño | | los planes de Supabase difieren en copias de seguridad: confirmar cuál tiene el proyecto **antes** de abrir al público. Para cambios manuales de datos, antes: `pg_dump "$DATABASE_URL" --data-only --schema=public -f respaldo-AAAA-MM-DD.sql` (guardarlo fuera del repositorio: puede tener datos de la carta y, si hubiera, de administradores) |

Las migraciones **solo avanzan**: no hay bajada. La recuperación de un esquema equivocado es una migración nueva, no deshacer.

## 8. Activar WhatsApp real (P6b-2) — otra unidad, otra autorización 🔐

Hoy el enlace está apagado en todos los entornos y la integración continua lo exige (`check:bundle -- --whatsapp=apagado`). Para activarlo hace falta, **en este orden**:

1. **Autorización expresa del dueño/responsable** para que los pedidos lleguen al `5491170582325` (número confirmado como oficial; el PDF lo describe como cuenta personal de WhatsApp, no Business).
2. **Prueba en dispositivos reales** que acá no se pudo hacer: Android (Chrome) e iPhone (Safari), con el dueño enterado, pasando por todo el recorrido y enviando un mensaje de prueba **desde WhatsApp** (el enlace nunca envía nada solo: abre WhatsApp con el texto escrito y el cliente lo envía). Los E2E emulan el teléfono sobre Chromium y no ejercitan las reglas de ventanas emergentes de Safari.
3. Cambiar la afirmación de la integración continua a `--whatsapp=encendido` **en el mismo cambio** que lo autoriza.
4. Definir `VITE_WHATSAPP_ENABLED=true` solo en el entorno de compilación de producción y compilar con `npm run check:bundle -- --whatsapp=encendido`.
5. Quién atiende el número y en qué horario. La carta muestra el horario del local, pero la aplicación no bloquea pedidos fuera de él (el recargo/aviso nocturno automatizado es F2).

Antes de **cualquier** despliegue, verificar explícitamente el valor de `VITE_WHATSAPP_ENABLED` en el entorno de compilación y mirar la línea `WhatsApp: …` que imprime `check:bundle`.

## 9. Riesgos conocidos

**Bloqueantes para publicar**

- No existe el proyecto de Supabase de producción ni se ejecutó nada contra uno: las secciones 3 a 5 no se probaron fuera del stack local.
- Hosting, dominio y HTTPS sin elegir (y el fallback de SPA para `/admin`).
- Aviso de privacidad: faltan datos legales que solo puede dar el dueño (titular o razón social, CUIT, domicilio legal, canal formal para consultas, conservación de las conversaciones; ver «Datos que hay que pedirle al dueño», puntos 8 a 12). Conviene validarlo con un contador o abogado antes de publicar.

**Bloqueantes solo para activar WhatsApp**

- Autorización expresa y prueba en dispositivos reales (sección 8).

**Observaciones menores**

- El `catch` de la verificación final trata cualquier error como falla de red y no lo registra.
- Una carta con categorías pero sin productos se aplicaría al refrescar.
- Dos altas simultáneas de promociones pueden empatar en el orden hasta el próximo movimiento (el desempate es por código).
- Bajar un total (por ejemplo, de crédito a efectivo) también pide aceptación; editar el carrito descarta la referencia pendiente (decisiones aprobadas).
- Limitaciones conocidas de las herramientas de verificación, sin corregir a propósito (no son parte de la aplicación):
  - `check:bundle` reconoce la forma en que Vite incrusta `VITE_WHATSAPP_ENABLED`; si una versión futura la cambiara, podría informar «apagado» sin haberla visto. Los tests cubren las formas actuales.
  - `api:verify` no reintenta una consulta que falla por un tropiezo pasajero (cada una espera hasta 15 s); repetirlo es seguro porque solo lee.
  - En modo local, `api:verify` no avisa con claridad si `supabase status` no devuelve la clave publicable.
  - `--remoto` acepta cualquier URL (la clave es publicable por diseño y se rechazan las secretas).
  - Los dos servidores de desarrollo de los E2E comparten la caché de Vite: riesgo mínimo de inestabilidad en CI.
- Test intermitente de docenas (`dozen-builder.test.tsx`), ajeno al flujo.
- Solo local: un worktree de otra rama bajo `.claude/worktrees/` hace que `eslint` y `vitest` locales recojan sus archivos; no afecta a la integración continua.
