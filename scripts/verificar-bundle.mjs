// Checks the production build after `npm run build` (U4):
// 1. The public menu's initial chunks (the entry script and its modulepreloads in dist/index.html) carry nothing from
//    supabase-js or the admin sign-in: the panel lives in a lazy chunk loaded only on /admin.
// 2. That lazy chunk exists, so check 1 cannot pass just because the markers changed name.
// 3. No file in dist holds a secret or service_role key.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const initial = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((match) => match[1])
const allChunks = readdirSync(join(dist, 'assets'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => join('assets', name))

const supabaseMarkers = ['GoTrueClient', 'signInWithPassword', 'soy_administrador', '@supabase/']
const secretMarkers = [/sb_secret_[A-Za-z0-9]/, /service_role/]

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
}

if (failures.length > 0) {
  console.error('Bundle check failed:\n- ' + failures.join('\n- '))
  process.exit(1)
}
console.log(`Bundle check passed: initial ${initial.join(', ')}; admin sign-in only in ${lazyAdmin.join(', ')}.`)
