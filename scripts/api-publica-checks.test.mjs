import { describe, expect, it } from 'vitest'
import { runPublicApiChecks } from './api-publica-checks.mjs'
import { summarize } from './resumen-verificacion.mjs'

// Codex P2→P1 on PR #32: an HTTP error from the public API must be a FALLA, never a «data differs» that
// `--permitir-diferentes` lets through. Only a successful answer with a valid count may be a DIFERENTE.

const CODES = ['promo-muzza-6-empanadas', 'promo-especial-muzzarella', 'promo-especial-coca-6-jyq', 'promo-docena-surtida', 'promo-docena-eleccion', 'promo-muzza-especial-6-jyq', 'promo-tres-muzzarella', 'promo-napolitana-especial']
const PRICES = [32000, 35000, 42500, 30000, 36000, 52000, 42000, 42000]
const COUNTS = { categorias: 13, productos: 84, variantes: 110, promociones: 8 }

const reply = (status, body = {}, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  json: async () => body,
})

/** A healthy project, with overrides by path prefix. */
function fakeFetch(overrides = {}) {
  return async (url, init = {}) => {
    const path = new URL(url).pathname + new URL(url).search
    if (init.headers?.['Accept-Profile'] === 'privado') return overrides['profile:privado'] ?? reply(406, { code: 'PGRST106' })
    for (const [prefix, answer] of Object.entries(overrides)) {
      if (path.startsWith(prefix)) {
        if (answer instanceof Error) throw answer
        return answer
      }
    }
    if (path.startsWith('/auth/v1/settings')) return reply(200, { disable_signup: true, external: { email: true, anonymous_users: false } })
    if (path.startsWith('/rest/v1/administradores')) return reply(401, { code: '42501' })
    if (path.startsWith('/rest/v1/promociones?select=codigo')) return reply(200, CODES.map((codigo, i) => ({ codigo, precio: PRICES[i] })))
    const table = /\/rest\/v1\/(\w+)\?select=id/.exec(path)?.[1]
    if (table) return reply(206, [], { 'content-range': `0-0/${COUNTS[table]}` })
    return reply(404)
  }
}
const run = (overrides) => runPublicApiChecks({ url: 'https://p.example', key: 'sb_publishable_x', fetchImpl: fakeFetch(overrides) })
const results = (rows) => Object.fromEntries(rows.map((row) => [row.comprobacion, row.resultado]))

describe('runPublicApiChecks', () => {
  it('passes for a healthy project', async () => {
    const rows = await run()
    expect(rows.every((row) => row.resultado === 'ok')).toBe(true)
    expect(summarize(rows).failed).toBe(false)
  })

  it.each([401, 403, 404, 500, 503])('an HTTP %i on a catalog table is a FALLA that «permitir diferentes» cannot let through', async (status) => {
    const rows = await run({ '/rest/v1/productos': reply(status, { message: 'denied' }) })
    expect(rows.filter((row) => row.resultado === 'FALLA').map((row) => row.comprobacion)).toEqual(['GET /rest/v1/productos'])
    expect(rows.some((row) => row.resultado === 'DIFERENTE')).toBe(false)
    expect(summarize(rows, { permitirDiferentes: true }).failed).toBe(true)
  })

  it('a count answer without a readable number is a FALLA too', async () => {
    const rows = await run({ '/rest/v1/variantes': reply(206, [], { 'content-range': '*/*' }) })
    expect(summarize(rows, { permitirDiferentes: true }).failed).toBe(true)
  })

  it('a table that cannot be reached at all is a FALLA', async () => {
    const rows = await run({ '/rest/v1/categorias': new TypeError('fetch failed') })
    expect(summarize(rows, { permitirDiferentes: true }).failed).toBe(true)
  })

  it('a valid count that differs from the initial data is only a DIFERENTE', async () => {
    const rows = await run({ '/rest/v1/categorias': reply(206, [], { 'content-range': '0-0/12' }) })
    expect(results(rows)['categorías, productos, variantes y promociones visibles']).toBe('DIFERENTE')
    expect(summarize(rows).failed).toBe(true)
    expect(summarize(rows, { permitirDiferentes: true }).failed).toBe(false)
  })

  it('the promotions list: an HTTP error is a FALLA, a different order or price is a DIFERENTE', async () => {
    expect(summarize(await run({ '/rest/v1/promociones?select=codigo': reply(403) }), { permitirDiferentes: true }).failed).toBe(true)
    const edited = await run({ '/rest/v1/promociones?select=codigo': reply(200, CODES.map((codigo) => ({ codigo, precio: 1 }))) })
    expect(results(edited)['precios de las promociones']).toBe('DIFERENTE')
    expect(summarize(edited, { permitirDiferentes: true }).failed).toBe(false)
  })

  it('an unreadable promotions body is a FALLA', async () => {
    const broken = { ...reply(200), json: async () => { throw new SyntaxError('bad json') } }
    expect(summarize(await run({ '/rest/v1/promociones?select=codigo': broken }), { permitirDiferentes: true }).failed).toBe(true)
  })

  it('open sign-up, anonymous sign-in, a readable administrators list, or an exposed private schema are FALLA', async () => {
    const cases = [
      { '/auth/v1/settings': reply(200, { disable_signup: false, external: { email: true, anonymous_users: false } }) },
      { '/auth/v1/settings': reply(200, { disable_signup: true, external: { email: true, anonymous_users: true } }) },
      { '/auth/v1/settings': new TypeError('fetch failed') },
      { '/rest/v1/administradores': reply(200, [{ user_id: 'x' }]) },
      { 'profile:privado': reply(200, []) },
    ]
    for (const overrides of cases) expect(summarize(await run(overrides), { permitirDiferentes: true }).failed).toBe(true)
  })

  // Codex P1 on PR #32 (round 2): only PostgREST's «Invalid schema» (PGRST106) proves `privado` is not exposed.
  it('the private schema counts as not exposed only with PostgREST\'s PGRST106 answer', async () => {
    const privado = (rows) => results(rows)['esquema privado no expuesto por la API']
    expect(privado(await run())).toBe('ok')
    for (const answer of [reply(401, { code: '42501' }), reply(403, { code: '42501' }), reply(404, { code: 'PGRST205' }), reply(500, { message: 'boom' }), reply(406, { code: 'PGRST107' }), reply(406, 'not json')]) {
      const rows = await run({ 'profile:privado': answer })
      expect(privado(rows)).toBe('FALLA')
      expect(summarize(rows, { permitirDiferentes: true }).failed).toBe(true)
    }
    const unreadable = { ...reply(406), json: async () => { throw new SyntaxError('bad json') } }
    expect(privado(await run({ 'profile:privado': unreadable }))).toBe('FALLA')
    expect(privado(await run({ 'profile:privado': new TypeError('fetch failed') }))).toBe('FALLA')
  })

  it('only ever asks with GET and the publishable key', async () => {
    const seen = []
    await runPublicApiChecks({ url: 'https://p.example', key: 'sb_publishable_x', fetchImpl: async (url, init = {}) => { seen.push({ method: init.method ?? 'GET', apikey: init.headers?.apikey }); return fakeFetch()(url, init) } })
    expect(seen.length).toBeGreaterThan(5)
    expect(seen.every((call) => call.method === 'GET' && call.apikey === 'sb_publishable_x')).toBe(true)
  })
})
