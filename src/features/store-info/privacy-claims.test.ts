import { describe, expect, it } from 'vitest'
import indexHtml from '../../../index.html?raw'

/**
 * The privacy notice (PrivacySheet.tsx) says the page uses no cookies, storage, analytics, or network calls.
 * That is true today because the code below does not use them. This test keeps the sentence honest: when a feature
 * needs one of these APIs (U5 saves the cart on the device, U8 may call a service, the admin phase adds Supabase),
 * it fails, and the notice must be updated in the same change.
 */
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })

const forbidden: Record<string, RegExp> = {
  'browser storage': /\b(localStorage|sessionStorage|indexedDB)\b/,
  cookies: /document\s*\.\s*cookie/,
  // No trailing \b after `fetch(`: the next character is often a quote, and \b between `(` and `'` never matches
  // (until U3b this missed fetch('/url') entirely).
  'network calls': /\bfetch\s*\(|\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/,
  'service workers': /navigator\s*\.\s*serviceWorker/,
  'analytics or ads': /\b(gtag|dataLayer|googletagmanager|google-analytics|fbq|hotjar|mixpanel|segment\.com)\b/i,
}

const appFiles = Object.entries(sources).filter(([path]) => !/\.test\.|\/test\//.test(path))

describe('privacy claims match the code', () => {
  it('scans the application source', () => {
    expect(appFiles.length).toBeGreaterThan(50)
  })

  for (const [what, pattern] of Object.entries(forbidden)) {
    it(`uses no ${what}`, () => {
      const offenders = appFiles.filter(([, code]) => pattern.test(code)).map(([path]) => path)

      expect(offenders, `Found ${what} in: ${offenders.join(', ')}. Update src/features/store-info/PrivacySheet.tsx first.`).toEqual([])
    })
  }

  it('loads no script or stylesheet from another site', () => {
    const external = [...indexHtml.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:)?\/\/[^"]+"/g)].map((match) => match[0])

    expect(external).toEqual([])
  })
})
