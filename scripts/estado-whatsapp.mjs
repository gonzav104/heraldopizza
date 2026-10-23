// The WhatsApp switch as a production build carries it (P6b-2). The build embeds VITE_WHATSAPP_ENABLED only when its
// environment defines it (Vite writes every VITE_ variable as an object literal, the value in backticks); the app offers
// the real link only for exactly «true» (src/features/checkout/whatsapp.ts). Pure, so a test can feed it any text.

/** `VITE_WHATSAPP_ENABLED:` followed by a quoted value: a definition, never the code that reads the variable. */
const DEFINITION = /VITE_WHATSAPP_ENABLED\s*:\s*([`"'])((?:(?!\1)[^\\])*)\1/g

/**
 * @param {string[]} texts the contents of the build's script files
 * @returns {{ state: 'apagado' | 'encendido', value: string | null, note: string }}
 * @throws when the files carry different values: nobody can tell which one the app uses
 */
export function whatsappStateOf(texts) {
  const values = new Set()
  for (const text of texts) for (const match of text.matchAll(DEFINITION)) values.add(match[2])
  if (values.size > 1) throw new Error(`el build tiene distintos valores de VITE_WHATSAPP_ENABLED: ${[...values].map((v) => JSON.stringify(v)).join(', ')}`)
  const [value = null] = values
  if (value === null) return { state: 'apagado', value: null, note: 'variable ausente' }
  if (value === 'true') return { state: 'encendido', value, note: 'VITE_WHATSAPP_ENABLED=true' }
  return { state: 'apagado', value, note: `VITE_WHATSAPP_ENABLED=${JSON.stringify(value)}: solo «true» lo enciende` }
}
