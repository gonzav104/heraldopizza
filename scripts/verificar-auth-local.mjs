// Checks the LOCAL stack's auth settings (U4), so a config change cannot silently reopen sign-up or switch off
// password sign-in: public sign-up must be refused (RF-28) and the email provider must answer a wrong password with
// invalid_credentials. Local only; uses the publishable key reported by `supabase status`.
import { execFileSync } from 'node:child_process'

const status = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
const env = Object.fromEntries([...status.matchAll(/^([A-Z_]+)="?([^"\n]*)"?$/gm)].map((match) => [match[1], match[2]]))
const host = env.API_URL ? new URL(env.API_URL).hostname : ''
if (host !== '127.0.0.1' && host !== 'localhost') {
  console.error(`Refusing to run: the API is not local (${host || 'unknown'}).`)
  process.exit(1)
}
const headers = { apikey: env.PUBLISHABLE_KEY, 'Content-Type': 'application/json' }

async function post(path, body) {
  const response = await fetch(`${env.API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const json = await response.json().catch(() => ({}))
  return json.error_code ?? json.code ?? `HTTP ${response.status}`
}

const failures = []
const signup = await post('/auth/v1/signup', { email: 'registro@example.test', password: 'Prueba-registro-2026' })
if (signup !== 'signup_disabled') failures.push(`public sign-up answered ${signup}, expected signup_disabled`)
const login = await post('/auth/v1/token?grant_type=password', { email: 'nadie@example.test', password: 'incorrecta' })
if (login !== 'invalid_credentials') failures.push(`password sign-in answered ${login}, expected invalid_credentials`)

if (failures.length > 0) {
  console.error('Auth check failed:\n- ' + failures.join('\n- '))
  process.exit(1)
}
console.log('Auth check passed: public sign-up refused, password sign-in enabled.')
