-- Verificación de despliegue de Heraldo Pizza (P6b-2). SOLO LECTURA: una única consulta SELECT, sin transacciones ni
-- cambios, así que corre igual con psql que pegada en el editor SQL de Supabase. No necesita variables ni meta-comandos.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -A -t -F ' | ' -f supabase/verificar_despliegue.sql
--
-- Cada fila compara lo esperado con lo obtenido y termina en uno de estos resultados:
--   ok         coincide.
--   FALLA      esquema, permisos o RLS distintos de lo versionado: NO se publica hasta corregirlo, siempre.
--   DIFERENTE  los datos no son los iniciales autorizados (docs/seed_catalogo.sql y supabase/seed_promociones.sql).
--              Es un error justo después de cargarlos; es normal después de que el dueño edite precios o textos en /admin.
--   AVISO      algo para mirar que no impide publicar (por ejemplo, todavía no hay un administrador).
-- Compara también las definiciones completas (expresiones de las políticas, restricciones, disparadores y valores por
-- defecto), calculadas en PostgreSQL 17: la fila de la versión avisa si el proyecto usa otra, porque ese texto puede
-- escribirse distinto. Lo que NO compara, a propósito: índices, secuencias, extensiones ni esquemas ajenos al proyecto.
-- Que todo dé «ok» confirma que el esquema versionado está aplicado; la autorización además la prueban las pruebas pgTAP
-- (solo local) y la verificación de la API pública (npm run api:verify).
-- Se corre en local en cada integración continua (npm run db:verify): si cambia una migración, un permiso o los datos
-- iniciales, este archivo se actualiza en el mismo cambio, y así los valores esperados nunca quedan viejos.
select comprobacion, esperado, obtenido,
       case
         when esperado is not distinct from obtenido then 'ok'
         when tipo = 'DATOS' then 'DIFERENTE'
         when tipo = 'AVISO' then 'AVISO'
         else 'FALLA'
       end as resultado
from (
  -- Esquema: qué migraciones se aplicaron.
  select 10 as n, 'ESTRUCTURA' as tipo, 'migraciones aplicadas' as comprobacion,
         '20261016220000,20261016220100,20261017120000,20261017180000,20261022190000,20261023120000' as esperado,
         (select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations) as obtenido
  union all
  select 20, 'ESTRUCTURA', 'tablas con RLS activada (y ninguna con FORCE, que no se versiona)',
         'administradores,categorias,productos,promociones,variantes',
         (select string_agg(c.relname, ',' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and not c.relforcerowsecurity)
  union all
  select 21, 'ESTRUCTURA', 'tablas del esquema public (ninguna sin RLS)',
         '5',
         (select count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r')
  -- Políticas, permisos por tabla y por columna, funciones y disparadores: huella de la lista ordenada.
  union all
  select 30, 'ESTRUCTURA', 'políticas RLS (cantidad y huella)',
         '19 44b8d04aeb591565a222f969f4ba3f9c',
         (select count(*)::text || ' ' || md5(string_agg(tablename || ' | ' || policyname || ' | ' || cmd || ' | ' || array_to_string(roles, ','), ';' order by policyname))
            from pg_policies where schemaname = 'public')
  union all
  select 31, 'ESTRUCTURA', 'permisos de anon y authenticated por tabla (cantidad y huella)',
         '17 c9d407504ff06e22a459e476ae72c2d4',
         (select count(*)::text || ' ' || md5(string_agg(grantee || ' ' || table_name || ' ' || privilege_type, ';' order by grantee, table_name, privilege_type))
            from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated', 'public'))
  union all
  select 32, 'ESTRUCTURA', 'permisos de escritura por columna (cantidad y huella)',
         '68 0df1218b9a5e447bf9ff43bacd5a4c87',
         (select count(*)::text || ' ' || md5(string_agg(grantee || ' ' || table_name || '.' || column_name || ' ' || privilege_type, ';' order by grantee, table_name, column_name, privilege_type))
            from information_schema.role_column_grants
           where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE'))
  union all
  select 33, 'ESTRUCTURA', 'funciones: quién ejecuta qué, security, search_path y código fuente (cantidad y huella)',
         '7 d7bf7a7a859fd48090bb79cc54c54fcc',
         (select count(*)::text || ' ' || md5(string_agg(n.nspname || '.' || p.proname || ' secdef=' || p.prosecdef::text || ' cfg=' || coalesce(p.proconfig::text, '-')
              || ' anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text || ' auth=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
              || ' src=' || md5(p.prosrc), ';' order by n.nspname, p.proname))
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'privado'))
  union all
  select 34, 'ESTRUCTURA', 'esquema privado: anon sin acceso, authenticated con uso',
         'anon=false auth=true',
         (select 'anon=' || has_schema_privilege('anon', 'privado', 'USAGE')::text || ' auth=' || has_schema_privilege('authenticated', 'privado', 'USAGE')::text)
  union all
  select 35, 'ESTRUCTURA', 'disparadores (actualizado_en y código inmutable)',
         '5 97a8b3f625be39ce74c5cc857da85326',
         (select count(*)::text || ' ' || md5(string_agg(event_object_table || ' ' || trigger_name, ';' order by event_object_table, trigger_name))
            from information_schema.triggers where trigger_schema = 'public')
  union all
  select 37, 'ESTRUCTURA', 'restricciones de todas las tablas, por nombre y tipo (cantidad y huella)',
         '26 6f257935aa55d50bd980d80dd41ede4f',
         (select count(*)::text || ' ' || md5(string_agg(conrelid::regclass::text || ' ' || conname || ' ' || contype::text, ';' order by conrelid::regclass::text, conname))
            from pg_constraint where connamespace = 'public'::regnamespace)
  union all
  select 38, 'ESTRUCTURA', 'columnas: nombre, tipo y si admiten nulos (cantidad y huella)',
         '41 28ce4aa0f51f364c8ae84881f4e19775',
         (select count(*)::text || ' ' || md5(string_agg(table_name || '.' || column_name || ' ' || data_type || ' ' || is_nullable, ';' order by table_name, ordinal_position))
            from information_schema.columns where table_schema = 'public')
  -- Definiciones completas (Codex, PR #32). PostgreSQL arma estos textos al leerlos, así que pueden cambiar de una versión
  -- mayor a otra o con otro search_path: por eso van en filas aparte y con un AVISO de la versión. Una FALLA en estas
  -- filas con la versión esperada es un cambio real; con otra versión, primero hay que comparar contra un stack local
  -- de esa misma versión.
  union all
  select 51, 'AVISO', 'versión mayor de PostgreSQL (las huellas de definiciones se calcularon en la 17)', '17',
         (current_setting('server_version_num')::int / 10000)::text
  union all
  select 52, 'ESTRUCTURA', 'políticas: expresiones USING y WITH CHECK (cantidad y huella)',
         '19 fa9880ff0b8aa732ada90b65f60bd446',
         (select count(*)::text || ' ' || md5(string_agg(tablename || ' | ' || policyname || ' | ' || coalesce(qual, '-') || ' | ' || coalesce(with_check, '-'), ';' order by tablename, policyname))
            from pg_policies where schemaname = 'public')
  union all
  select 53, 'ESTRUCTURA', 'restricciones: definición completa (cantidad y huella)',
         '26 8680e2c706f780af3267202b9954533b',
         (select count(*)::text || ' ' || md5(string_agg(conrelid::regclass::text || ' ' || conname || ' ' || pg_get_constraintdef(oid), ';' order by conrelid::regclass::text, conname))
            from pg_constraint where connamespace = 'public'::regnamespace)
  union all
  select 54, 'ESTRUCTURA', 'disparadores: definición completa, con su función, evento y momento (cantidad y huella)',
         '5 d845fcef27bc2065e97776715c00f952',
         (select count(*)::text || ' ' || md5(string_agg(c.relname || ' ' || t.tgname || ' ' || pg_get_triggerdef(t.oid), ';' order by c.relname, t.tgname))
            from pg_trigger t join pg_class c on c.oid = t.tgrelid
           where c.relnamespace = 'public'::regnamespace and not t.tgisinternal)
  union all
  select 55, 'ESTRUCTURA', 'columnas: valores por defecto (cantidad y huella)',
         '41 5ae3ff33b80e15b2306a6a41872abd9f',
         (select count(*)::text || ' ' || md5(string_agg(table_name || '.' || column_name || ' = ' || coalesce(column_default, '-'), ';' order by table_name, column_name))
            from information_schema.columns where table_schema = 'public')
  union all
  select 36, 'ESTRUCTURA', 'restricciones de las promociones (código único, docena de 12 empanadas)',
         'promociones_codigo_unico,promociones_eleccion_completa,promociones_eleccion_docena,promociones_eleccion_empanadas',
         (select string_agg(conname, ',' order by conname) from pg_constraint
           where conrelid = 'public.promociones'::regclass
             and conname in ('promociones_codigo_unico', 'promociones_eleccion_completa', 'promociones_eleccion_docena', 'promociones_eleccion_empanadas'))
  -- Datos iniciales autorizados.
  union all
  select 40, 'DATOS', 'categorías, productos, variantes y promociones', '13 84 110 8',
         (select (select count(*) from public.categorias) || ' ' || (select count(*) from public.productos) || ' '
              || (select count(*) from public.variantes) || ' ' || (select count(*) from public.promociones))
  union all
  select 41, 'DATOS', 'variantes «Consultar en barra» (precio nulo, nunca $ 0)', '17 0',
         (select (select count(*) from public.variantes where precio is null) || ' ' || (select count(*) from public.variantes where precio = 0))
  union all
  select 42, 'DATOS', 'suma de precios: variantes y promociones', '1465000 311500',
         (select coalesce(sum(precio), 0) from public.variantes) || ' ' || (select coalesce(sum(precio), 0) from public.promociones)
  union all
  select 43, 'DATOS', 'huella de las categorías', '580a66a4128c541b32a3aa59417a750c',
         (select md5(string_agg(id::text || '|' || nombre || '|' || orden::text || '|' || visible::text || '|' || recargo_envio::text, ';' order by id)) from public.categorias)
  union all
  select 44, 'DATOS', 'huella de los productos', '37b37d45e750cf0ef1354cdddff9e67c',
         (select md5(string_agg(id::text || '|' || categoria_id::text || '|' || nombre || '|' || coalesce(descripcion, '') || '|' || solo_por_encargo::text || '|'
              || coalesce(aviso_encargo, '') || '|' || sin_stock::text || '|' || visible::text || '|' || orden::text, ';' order by id)) from public.productos)
  union all
  select 45, 'DATOS', 'huella de las variantes (nombre, precio y orden de cada producto)', 'b39cabdd3f7dcde27327b1e4d5cc648e',
         (select md5(string_agg(producto_id::text || '|' || nombre || '|' || coalesce(precio::text, 'null') || '|' || orden::text, ';' order by producto_id, orden, nombre)) from public.variantes)
  union all
  select 46, 'DATOS', 'huella de las promociones (código, textos, precio, vigencia y docena)', '89d49e0b5fad07d2fc22bcc5349a0baa',
         (select md5(string_agg(id::text || '|' || codigo || '|' || titulo || '|' || coalesce(descripcion, '') || '|' || precio::text || '|' || visible::text || '|' || orden::text || '|'
              || coalesce(vigente_desde::text, '') || '|' || coalesce(vigente_hasta::text, '') || '|' || coalesce(dias_semana::text, '') || '|'
              || coalesce(eleccion_categoria_id::text, '') || '|' || coalesce(eleccion_unidades::text, ''), ';' order by codigo)) from public.promociones)
  union all
  select 47, 'DATOS', 'promociones sin repetir: códigos distintos', '8',
         (select count(distinct codigo)::text from public.promociones)
  union all
  select 48, 'DATOS', 'la docena a elección: 12 unidades de la categoría Empanadas',
         'promo-docena-eleccion e4f5b25a-de7f-5c2e-a05f-071bcc5aa6d4 12',
         (select codigo || ' ' || eleccion_categoria_id::text || ' ' || eleccion_unidades::text from public.promociones where eleccion_unidades is not null)
  -- Quién administra.
  union all
  select 90, 'AVISO', 'administradores cargados (al menos uno para usar /admin)', '1 o más',
         (select case when count(*) >= 1 then '1 o más' else '0: nadie puede entrar a /admin' end from public.administradores)
) comprobaciones
order by n;
