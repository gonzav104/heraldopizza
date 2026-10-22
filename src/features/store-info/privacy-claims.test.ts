import { describe, expect, it } from 'vitest'
import indexHtml from '../../../index.html?raw'

/**
 * The privacy notice (PrivacySheet.tsx) says the menu is downloaded from the Supabase database, that nothing about
 * the order travels with that request, that only the order is saved in the browser (RF-17), and that the page uses no
 * cookies or analytics. This test keeps those sentences honest: the network is allowed in one approved file only (the
 * catalog adapter), and only as a GET without cookies; browser storage is allowed in the order storage only. When a
 * feature needs other storage or another network call (U8 may call a service), it fails, and the notice must be
 * updated in the same change.
 */
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })

/** The one file allowed to use the network: it reads the public catalog (U3b). */
const CATALOG_ADAPTER = '/src/data/supabase-catalog-repository.ts'

const forbidden: Record<string, RegExp> = {
  'browser storage': /\b(localStorage|sessionStorage|indexedDB)\b/,
  cookies: /document\s*\.\s*cookie/,
  // No trailing \b after `fetch(`: the next character is often a quote, and \b between `(` and `'` never matches
  // (before U3b this missed fetch('/url') entirely).
  'network calls': /\bfetch\s*\(|\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/,
  'service workers': /navigator\s*\.\s*serviceWorker/,
  'analytics or ads': /\b(gtag|dataLayer|googletagmanager|google-analytics|fbq|hotjar|mixpanel|segment\.com)\b/i,
}

/** The one file allowed to use browser storage: it saves the order lines (RF-17). */
const ORDER_STORAGE = '/src/features/cart/order-storage.ts'

const allowedFiles: Record<string, Set<string>> = {
  'network calls': new Set([CATALOG_ADAPTER]),
  'browser storage': new Set([ORDER_STORAGE]),
}

const appFiles = Object.entries(sources).filter(([path]) => !/\.test\.|\/test\//.test(path))

describe('privacy claims match the code', () => {
  it('scans the application source, including the catalog adapter', () => {
    expect(appFiles.length).toBeGreaterThan(50)
    expect(appFiles.map(([path]) => path)).toContain(CATALOG_ADAPTER)
  })

  for (const [what, pattern] of Object.entries(forbidden)) {
    const allowed = allowedFiles[what] ?? new Set<string>()
    it(`uses no ${what}${allowed.size > 0 ? ` outside ${[...allowed].join(', ')}` : ''}`, () => {
      const offenders = appFiles.filter(([path, code]) => pattern.test(code) && !allowed.has(path)).map(([path]) => path)

      expect(offenders, `Found ${what} in: ${offenders.join(', ')}. Update src/features/store-info/PrivacySheet.tsx first.`).toEqual([])
    })
  }

  it('lets the catalog adapter make its requests from one place: a GET without cookies or a body', () => {
    const code = sources[CATALOG_ADAPTER]

    expect(code.match(/\bfetch\s*\(/g)).toHaveLength(1)
    expect(code).toMatch(/method:\s*'GET'/)
    expect(code).toMatch(/credentials:\s*'omit'/)
    expect(code).not.toMatch(/\bbody\s*:/)
    expect(code).not.toMatch(/\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/)
  })

  it('reads only the public catalog tables: categorias and promociones (P5a)', () => {
    const code = sources[CATALOG_ADAPTER]
    const paths = [...code.matchAll(/'(rest\/v1\/[a-z_]+)'/g)].map((match) => match[1]).sort()

    expect(paths).toEqual(['rest/v1/categorias', 'rest/v1/promociones'])
  })

  it('lets the order storage use localStorage only, under its own key', () => {
    const code = sources[ORDER_STORAGE]

    expect(code).toMatch(/window\.localStorage\.setItem\(name,/)
    expect(code).toMatch(/ORDER_STORAGE_KEY = 'heraldo-pedido'/)
    expect(code).not.toMatch(/\b(sessionStorage|indexedDB)\b|document\s*\.\s*cookie/)
  })

  it('loads no script or stylesheet from another site', () => {
    const external = [...indexHtml.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:)?\/\/[^"]+"/g)].map((match) => match[0])

    expect(external).toEqual([])
  })
})
