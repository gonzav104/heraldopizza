// Checks what a visitor can see through a project's public API (P6b-2), with GET requests only and the PUBLISHABLE
// key (public by design): sign-up closed, no anonymous sign-in, the authorized initial data present and the same
// promotions, nobody but an administrator able to read the administrators, and the private schema not exposed. It never
// writes and never creates an account.
//
//   npm run api:verify                      the LOCAL stack, read from `supabase status`
//   node scripts/verificar-api-publica.mjs --remoto --url=https://<proyecto>.supabase.co --key=<clave publicable>
//   (the key may also come from VITE_SUPABASE_PUBLISHABLE_KEY; a remote project is never contacted without --remoto)
//
// Results as in supabase/verificar_despliegue.sql: FALLA always blocks; DIFERENTE (data other than the authorized initial
// data) blocks unless `--permitir-diferentes`, which is for after the owner edited data on purpose.
import { execFileSync } from 'node:child_process'
import { summarize } from './resumen-verificacion.mjs'

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true] }))

let url
let key
if (args.url !== undefined && !args.remoto) {
  console.error('--url only applies with --remoto (a remote project is never contacted by accident).')
  process.exit(1)
}
if (args.remoto) {
  url = typeof args.url === 'string' ? args.url.replace(/\/+$/, '') : undefined
  key = typeof args.key === 'string' ? args.key : process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    console.error('With --remoto, give --url=https://<proyecto>.supabase.co and the publishable key (--key or VITE_SUPABASE_PUBLISHABLE_KEY).')
    process.exit(1)
  }
  if (/service_role|sb_secret_/.test(key) || /^eyJ/.test(key)) {
    console.error('Refusing to run: that does not look like a publishable key (sb_publishable_…). Never use a secret or service_role key here.')
    process.exit(1)
  }
} else {
  const status = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
  const env = Object.fromEntries([...status.matchAll(/^([A-Z_]+)="?([^"\n]*)"?$/gm)].map((match) => [match[1], match[2]]))
  const host = env.API_URL ? new URL(env.API_URL).hostname : ''
  if (host !== '127.0.0.1' && host !== 'localhost') {
    console.error(`Refusing to run without --remoto: the API is not local (${host || 'unknown'}).`)
    process.exit(1)
  }
  url = env.API_URL
  key = env.PUBLISHABLE_KEY
}

const headers = { apikey: key }
const rows = []
const check = (comprobacion, tipo, esperado, obtenido) =>
  rows.push({ comprobacion, esperado: String(esperado), obtenido: String(obtenido), resultado: String(esperado) === String(obtenido) ? 'ok' : tipo === 'DATOS' ? 'DIFERENTE' : 'FALLA' })

async function get(path, extra = {}) {
  try {
    return await fetch(`${url}${path}`, { headers: { ...headers, ...extra }, signal: AbortSignal.timeout(15000) })
  } catch (error) {
    rows.push({ comprobacion: `GET ${path}`, esperado: 'respuesta', obtenido: `sin respuesta (${error instanceof Error ? error.message : error})`, resultado: 'FALLA' })
    return null
  }
}
const count = async (table) => {
  const response = await get(`/rest/v1/${table}?select=id`, { Prefer: 'count=exact', Range: '0-0' })
  return response?.headers.get('content-range')?.split('/')[1] ?? `sin conteo (HTTP ${response?.status})`
}

const settings = await get('/auth/v1/settings')
const auth = settings && settings.ok ? await settings.json() : null
check('registro público cerrado (no se pueden crear cuentas)', 'ESTRUCTURA', 'true', auth?.disable_signup ?? 'sin respuesta')
check('ingreso con email y contraseña habilitado', 'ESTRUCTURA', 'true', auth?.external?.email ?? 'sin respuesta')
check('ingreso anónimo deshabilitado', 'ESTRUCTURA', 'false', auth?.external?.anonymous_users ?? 'sin respuesta')

const admins = await get('/rest/v1/administradores?select=*')
check('anónimo sin acceso a la lista de administradores', 'ESTRUCTURA', 'denegado', admins && (admins.status === 401 || admins.status === 403) ? 'denegado' : `HTTP ${admins?.status}`)
const privado = await get('/rest/v1/categorias?select=id', { 'Accept-Profile': 'privado' })
check('esquema privado no expuesto por la API', 'ESTRUCTURA', 'no expuesto', privado && privado.status >= 400 ? 'no expuesto' : `HTTP ${privado?.status}`)

check('categorías, productos, variantes y promociones visibles', 'DATOS', '13 84 110 8',
  [await count('categorias'), await count('productos'), await count('variantes'), await count('promociones')].join(' '))
const promotions = await get('/rest/v1/promociones?select=codigo,precio&order=orden.asc,codigo.asc')
const list = promotions?.ok ? await promotions.json() : []
check('las ocho promociones originales, con su orden', 'DATOS',
  'promo-muzza-6-empanadas,promo-especial-muzzarella,promo-especial-coca-6-jyq,promo-docena-surtida,promo-docena-eleccion,promo-muzza-especial-6-jyq,promo-tres-muzzarella,promo-napolitana-especial',
  list.map((item) => item.codigo).join(','))
check('precios de las promociones', 'DATOS', '32000,35000,42500,30000,36000,52000,42000,42000', list.map((item) => item.precio).join(','))

for (const row of rows) console.log(`${row.resultado.padEnd(9)} ${row.comprobacion}`)
const { failed, counts, blocking } = summarize(rows, { permitirDiferentes: Boolean(args['permitir-diferentes']) })
console.log(`\n${counts.ok} ok, ${counts.FALLA} FALLA, ${counts.DIFERENTE} DIFERENTE, ${counts.AVISO} AVISO.`)
if (failed) {
  console.error('Public API verification failed:\n- ' + (blocking.map((row) => `${row.resultado}: ${row.comprobacion} (esperado ${row.esperado}; obtenido ${row.obtenido})`).join('\n- ') || 'no result rows'))
  process.exit(1)
}
console.log('Public API verification passed.')
