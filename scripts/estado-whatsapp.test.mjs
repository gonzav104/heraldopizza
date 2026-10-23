import { describe, expect, it } from 'vitest'
import { whatsappStateOf } from './estado-whatsapp.mjs'

// How a production build carries the WhatsApp switch (P6b-2): Vite writes the value of every VITE_ variable the build
// environment defines as an object literal, with the value in backticks. The real link is offered only for «true».
const build = (value) => `function g(e={BASE_URL:\`/\`,DEV:!1,VITE_SUPABASE_URL:\`https://x.supabase.co\`${value === undefined ? '' : `,VITE_WHATSAPP_ENABLED:\`${value}\``}}){return e.VITE_WHATSAPP_ENABLED===\`true\`}`

describe('whatsappStateOf', () => {
  it('is off when the build environment does not define the variable, which is the default', () => {
    expect(whatsappStateOf([build(undefined)])).toEqual({ state: 'apagado', value: null, note: 'variable ausente' })
  })

  it.each(['false', '1', 'TRUE', 'si', ''])('is off for the value %j: only exactly «true» turns it on', (value) => {
    expect(whatsappStateOf([build(value)])).toMatchObject({ state: 'apagado', value })
  })

  it('is on only for exactly «true»', () => {
    expect(whatsappStateOf([build('true')])).toEqual({ state: 'encendido', value: 'true', note: 'VITE_WHATSAPP_ENABLED=true' })
  })

  it('reads the value in any quote style the bundler may use', () => {
    expect(whatsappStateOf(['{VITE_WHATSAPP_ENABLED:"true"}']).state).toBe('encendido')
    expect(whatsappStateOf(["{VITE_WHATSAPP_ENABLED:'true'}"]).state).toBe('encendido')
  })

  it('looks at every file, and the same value in several places counts once', () => {
    expect(whatsappStateOf(['nothing here', build('true'), build('true')])).toMatchObject({ state: 'encendido', value: 'true' })
  })

  it('refuses a build whose files disagree about the value', () => {
    expect(() => whatsappStateOf([build('true'), build('false')])).toThrow(/distintos valores/)
  })

  it('the code that reads the variable is not mistaken for a definition', () => {
    expect(whatsappStateOf(['return e.VITE_WHATSAPP_ENABLED===`true`'])).toMatchObject({ state: 'apagado', value: null })
  })
})
