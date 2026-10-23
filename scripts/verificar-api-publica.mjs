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
import { runPublicApiChecks } from './api-publica-checks.mjs'
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

const rows = await runPublicApiChecks({ url, key })

for (const row of rows) console.log(`${row.resultado.padEnd(9)} ${row.comprobacion}`)
const { failed, counts, blocking } = summarize(rows, { permitirDiferentes: Boolean(args['permitir-diferentes']) })
console.log(`\n${counts.ok} ok, ${counts.FALLA} FALLA, ${counts.DIFERENTE} DIFERENTE, ${counts.AVISO} AVISO.`)
if (failed) {
  console.error('Public API verification failed:\n- ' + (blocking.map((row) => `${row.resultado}: ${row.comprobacion} (esperado ${row.esperado}; obtenido ${row.obtenido})`).join('\n- ') || 'no result rows'))
  process.exit(1)
}
console.log('Public API verification passed.')
