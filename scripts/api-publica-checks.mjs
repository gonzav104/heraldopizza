// The checks of `npm run api:verify` (P6b-2), apart from the command line so they can be tested with an injected
// `fetch`. GET requests only, with the PUBLISHABLE key. An HTTP error or an unreadable answer is always a FALLA: only
// a successful answer with a valid count or list can be a DIFERENTE (data other than the authorized initial data),
// the one result `--permitir-diferentes` lets through (Codex P1 on PR #32).

const INITIAL_COUNTS = '13 84 110 8'
const INITIAL_CODES =
  'promo-muzza-6-empanadas,promo-especial-muzzarella,promo-especial-coca-6-jyq,promo-docena-surtida,promo-docena-eleccion,promo-muzza-especial-6-jyq,promo-tres-muzzarella,promo-napolitana-especial'
const INITIAL_PRICES = '32000,35000,42500,30000,36000,52000,42000,42000'

/**
 * @param {{ url: string, key: string, fetchImpl?: typeof fetch }} options
 * @returns {Promise<{ comprobacion: string, esperado: string, obtenido: string, resultado: string }[]>}
 */
export async function runPublicApiChecks({ url, key, fetchImpl = fetch }) {
  const rows = []
  const fail = (comprobacion, esperado, obtenido) => rows.push({ comprobacion, esperado, obtenido, resultado: 'FALLA' })
  const check = (comprobacion, tipo, esperado, obtenido) =>
    rows.push({ comprobacion, esperado: String(esperado), obtenido: String(obtenido), resultado: String(esperado) === String(obtenido) ? 'ok' : tipo === 'DATOS' ? 'DIFERENTE' : 'FALLA' })

  /** The response, or null (and a FALLA row) when there was none. */
  async function get(path, extra = {}, label = path) {
    try {
      return await fetchImpl(`${url}${path}`, { headers: { apikey: key, ...extra }, signal: AbortSignal.timeout(15000) })
    } catch (error) {
      fail(`GET ${label}`, 'respuesta', `sin respuesta (${error instanceof Error ? error.message : error})`)
      return null
    }
  }

  /** The body as JSON when the answer was a success; otherwise a FALLA row and null. */
  async function successBody(response, label) {
    if (!response) return null
    if (!response.ok) {
      fail(`GET ${label}`, 'HTTP 2xx', `HTTP ${response.status}`)
      return null
    }
    try {
      return await response.json()
    } catch {
      fail(`GET ${label}`, 'respuesta legible', 'respuesta ilegible')
      return null
    }
  }

  async function count(table) {
    const response = await get(`/rest/v1/${table}?select=id`, { Prefer: 'count=exact', Range: '0-0' }, `/rest/v1/${table}`)
    if (!response) return null
    if (!response.ok) {
      fail(`GET /rest/v1/${table}`, 'HTTP 2xx', `HTTP ${response.status}`)
      return null
    }
    const total = response.headers.get('content-range')?.split('/')[1]
    if (!total || !/^\d+$/.test(total)) {
      fail(`GET /rest/v1/${table}`, 'conteo legible', `sin conteo (content-range: ${response.headers.get('content-range') ?? 'ausente'})`)
      return null
    }
    return total
  }

  const settings = await get('/auth/v1/settings')
  const auth = await successBody(settings, '/auth/v1/settings')
  check('registro público cerrado (no se pueden crear cuentas)', 'ESTRUCTURA', 'true', auth?.disable_signup ?? 'sin respuesta')
  check('ingreso con email y contraseña habilitado', 'ESTRUCTURA', 'true', auth?.external?.email ?? 'sin respuesta')
  check('ingreso anónimo deshabilitado', 'ESTRUCTURA', 'false', auth?.external?.anonymous_users ?? 'sin respuesta')

  const admins = await get('/rest/v1/administradores?select=*')
  check('anónimo sin acceso a la lista de administradores', 'ESTRUCTURA', 'denegado', admins && (admins.status === 401 || admins.status === 403) ? 'denegado' : `HTTP ${admins?.status}`)
  const privado = await get('/rest/v1/categorias?select=id', { 'Accept-Profile': 'privado' })
  check('esquema privado no expuesto por la API', 'ESTRUCTURA', 'no expuesto', privado && privado.status >= 400 ? 'no expuesto' : `HTTP ${privado?.status}`)

  // A count that could not be read is already a FALLA above: the data row is only written when every count is valid.
  const counts = [await count('categorias'), await count('productos'), await count('variantes'), await count('promociones')]
  if (counts.every((value) => value !== null)) {
    check('categorías, productos, variantes y promociones visibles', 'DATOS', INITIAL_COUNTS, counts.join(' '))
  }

  const promotions = await get('/rest/v1/promociones?select=codigo,precio&order=orden.asc,codigo.asc', {}, '/rest/v1/promociones (lista)')
  const list = await successBody(promotions, '/rest/v1/promociones (lista)')
  if (Array.isArray(list)) {
    check('las ocho promociones originales, con su orden', 'DATOS', INITIAL_CODES, list.map((item) => item.codigo).join(','))
    check('precios de las promociones', 'DATOS', INITIAL_PRICES, list.map((item) => item.precio).join(','))
  } else if (list !== null) {
    fail('GET /rest/v1/promociones (lista)', 'lista', 'respuesta que no es una lista')
  }
  return rows
}
