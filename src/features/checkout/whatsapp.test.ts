import { describe, expect, it } from 'vitest'
import { storeInfo } from '@/data/store-info'
import { buildWhatsAppUrl, isWhatsAppEnabled } from './whatsapp'

const decoded = (url: string) => decodeURIComponent(new URL(url).searchParams.get('text') ?? '')

describe('buildWhatsAppUrl (P6b-1)', () => {
  it('uses the official wa.me domain, the store number in international format, and only the text', () => {
    const url = new URL(buildWhatsAppUrl(storeInfo.whatsappNumber, 'Hola'))
    expect(storeInfo.whatsappNumber).toBe('5491170582325')
    expect(url.origin).toBe('https://wa.me')
    expect(url.pathname).toBe('/5491170582325')
    expect([...url.searchParams.keys()]).toEqual(['text'])
    expect(url.hash).toBe('')
  })

  it('encodes every character that could break the URL or the message', () => {
    const message = '*Pedido para Heraldo Pizza*\nNombre: Ñandú Pérez\n• 1 × Muzza & Fugazzeta: $ 16.000\nNota: piso 3 #B + timbre? 50% 🍕'
    const url = buildWhatsAppUrl('5491170582325', message)
    expect(url.split('?text=')[1]).not.toMatch(/[\s#&?+]/)
    expect(url.split('?text=')[1]).toBe(encodeURIComponent(message))
    expect(new URL(url).searchParams.get('text')).toBe(message)
  })

  it('round-trips a long order message without losing anything', () => {
    const rows = Array.from({ length: 120 }, (_, i) => `• ${i + 1} × Empanada de jamón y queso: $ 1.800\n  Aclaración: sin sal, bien cocida`)
    const message = `*Pedido para Heraldo Pizza*\n${rows.join('\n')}`
    const url = buildWhatsAppUrl('5491170582325', message)
    expect(message.length).toBeGreaterThan(5000)
    expect(new URL(url).searchParams.get('text')).toBe(message)
    expect(decoded(url)).toContain('120 × Empanada')
  })

  it.each(['', '+5491170582325', '549 11 7058-2325', '12', 'javascript:alert(1)'])('refuses a malformed number %j', (number) => {
    expect(() => buildWhatsAppUrl(number, 'Hola')).toThrow()
  })
})

describe('isWhatsAppEnabled (P6b-1)', () => {
  it.each([
    [{}, false],
    [{ VITE_WHATSAPP_ENABLED: 'false' }, false],
    [{ VITE_WHATSAPP_ENABLED: '1' }, false],
    [{ VITE_WHATSAPP_ENABLED: 'TRUE' }, false],
    [{ VITE_WHATSAPP_ENABLED: 'true' }, true],
  ])('%o → %s: only an explicit «true» turns it on', (env, enabled) => {
    expect(isWhatsAppEnabled(env)).toBe(enabled)
  })

  it('is off in this build: no environment turns it on yet', () => {
    expect(isWhatsAppEnabled()).toBe(false)
    expect(import.meta.env.VITE_WHATSAPP_ENABLED).toBeUndefined()
  })
})
