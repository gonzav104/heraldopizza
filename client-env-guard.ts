// Vite copies every VITE_ variable into the browser bundle. This guard stops `vite`, `vite build`, and the tests from
// starting when one of them holds a server-only key: an `sb_secret_` key, the text `service_role`, or a JWT whose role
// is service_role (U4, S6). The error names the variable and never prints its value.

function isServiceRoleJwt(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: unknown }
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

export function assertNoSecretInClientEnv(env: Record<string, string | undefined>): void {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue
    if (/sb_secret_/.test(value) || /service_role/.test(value) || isServiceRoleJwt(value)) {
      throw new Error(
        `${name} looks like a server-only key. VITE_ variables reach the browser: use only the publishable ` +
          'key there (check .env.local).',
      )
    }
  }
}
