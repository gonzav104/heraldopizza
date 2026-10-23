// Checks the production build after `npm run build` (U4):
// 1. The public menu's initial chunks (the entry script and its modulepreloads in dist/index.html) carry nothing from
//    supabase-js or the admin sign-in: the panel lives in a lazy chunk loaded only on /admin.
// 2. That lazy chunk exists, so check 1 cannot pass just because the markers changed name.
// 3. No file in dist holds a secret key, the word service_role, or a JWT whose role is service_role.
// 4. No file in dist carries the prototype promotions, which load in development only until U9 brings a real source.
// 5. The WhatsApp switch (P6b-2): it reports whether this build offers the real link (VITE_WHATSAPP_ENABLED exactly
//    «true») and, with `--whatsapp=apagado` or `--whatsapp=encendido`, fails when the build is in another state. CI and
//    the deployment procedure assert «apagado» until the real link is authorized.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { whatsappStateOf } from './estado-whatsapp.mjs'

const dist = 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const initial = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((match) => match[1])
const allChunks = readdirSync(join(dist, 'assets'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => join('assets', name))

const supabaseMarkers = ['GoTrueClient', 'signInWithPassword', 'soy_administrador', '@supabase/']
const secretMarkers = [/sb_secret_[A-Za-z0-9]/, /service_role/]
// Ids of src/data/prototype-promotions.ts: present in a bundle only if the development-only loader leaked.
const prototypePromotionMarker = /promo-(?:muzza-6-empanadas|especial-muzzarella|especial-coca-6-jyq|docena-surtida|docena-eleccion|muzza-especial-6-jyq|tres-muzzarella|napolitana-especial)/

function hasServiceRoleJwt(text) {
  for (const [token] of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]*/g)) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
      if (payload?.role === 'service_role') return true
    } catch {
      // Not a JWT payload; ignore.
    }
  }
  return false
}

const failures = []
if (initial.length === 0) failures.push('dist/index.html references no script')

for (const chunk of initial) {
  const code = readFileSync(join(dist, chunk), 'utf8')
  for (const marker of supabaseMarkers) {
    if (code.includes(marker)) failures.push(`initial chunk ${chunk} contains "${marker}"`)
  }
}

const lazyAdmin = allChunks.filter(
  (chunk) => !initial.includes(chunk) && readFileSync(join(dist, chunk), 'utf8').includes('GoTrueClient'),
)
if (lazyAdmin.length === 0) failures.push('no lazy chunk carries the admin sign-in (GoTrueClient)')

for (const name of readdirSync(dist, { recursive: true })) {
  const path = join(dist, String(name))
  if (!/\.(js|html|css|json|txt|map)$/.test(path)) continue
  const text = readFileSync(path, 'utf8')
  for (const pattern of secretMarkers) {
    if (pattern.test(text)) failures.push(`${path} matches ${pattern}`)
  }
  if (hasServiceRoleJwt(text)) failures.push(`${path} contains a service_role JWT`)
  if (prototypePromotionMarker.test(text)) failures.push(`${path} carries the prototype promotions (development only)`)
}

const expectedWhatsapp = process.argv.find((argument) => argument.startsWith('--whatsapp='))?.slice('--whatsapp='.length)
if (expectedWhatsapp !== undefined && !['apagado', 'encendido'].includes(expectedWhatsapp)) {
  failures.push(`--whatsapp expects «apagado» or «encendido», not «${expectedWhatsapp}»`)
}
let whatsapp = null
try {
  whatsapp = whatsappStateOf(allChunks.map((chunk) => readFileSync(join(dist, chunk), 'utf8')))
  if (['apagado', 'encendido'].includes(expectedWhatsapp ?? '') && whatsapp.state !== expectedWhatsapp) {
    failures.push(`WhatsApp is ${whatsapp.state} in this build (${whatsapp.note}), expected ${expectedWhatsapp}`)
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error))
}

if (failures.length > 0) {
  console.error('Bundle check failed:\n- ' + failures.join('\n- '))
  process.exit(1)
}
console.log(`Bundle check passed: initial ${initial.join(', ')}; admin sign-in only in ${lazyAdmin.join(', ')}.`)
console.log(`WhatsApp: ${whatsapp?.state} (${whatsapp?.note}).`)
