// Creates (or resets) an administrator account on the LOCAL Supabase stack, for manual and browser tests (U4).
// Development only: it refuses any API that is not on this machine, reads the local stack's secret key at run time
// from `supabase status`, and never prints it. The key never reaches the frontend or the repository.
//
// Usage: npm run db:admin-local
//   ADMIN_EMAIL (default admin@heraldo.local) and ADMIN_PASSWORD (default: a random one, printed once).
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const status = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
const env = Object.fromEntries(
  [...status.matchAll(/^([A-Z_]+)="?([^"\n]*)"?$/gm)].map((match) => [match[1], match[2]]),
)
const apiUrl = env.API_URL
const secret = env.SECRET_KEY || env.SERVICE_ROLE_KEY

const host = apiUrl ? new URL(apiUrl).hostname : ''
if (host !== '127.0.0.1' && host !== 'localhost') {
  console.error(`Refusing to run: the API is not local (${host || 'unknown'}). This script is for the local stack only.`)
  process.exit(1)
}
if (!secret) {
  console.error('The local stack did not report a secret key. Is it running? Try `npm run db:start`.')
  process.exit(1)
}

const email = process.env.ADMIN_EMAIL || 'admin@heraldo.local'
const generated = !process.env.ADMIN_PASSWORD
const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString('base64url')
const headers = { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }

async function call(path, init) {
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { ...headers, ...init?.headers } })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed with ${response.status}: ${JSON.stringify(body)}`)
  return body
}

const { users } = await call('/auth/v1/admin/users?per_page=1000')
let user = users.find((candidate) => candidate.email === email)
if (user) {
  user = await call(`/auth/v1/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ password }) })
} else {
  user = await call('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
}

await call('/rest/v1/administradores?on_conflict=user_id', {
  method: 'POST',
  headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
  body: JSON.stringify({ user_id: user.id }),
})

console.log(`Local administrator ready: ${email}`)
if (generated) console.log(`Password (local only, shown once): ${password}`)
