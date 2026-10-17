import { describe, expect, it } from 'vitest'
import { assertNoSecretInClientEnv } from './client-env-guard.ts'

function jwt(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}.firma`
}

describe('assertNoSecretInClientEnv', () => {
  it('accepts the project URL and a publishable key', () => {
    expect(() =>
      assertNoSecretInClientEnv({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123',
      }),
    ).not.toThrow()
  })

  it.each([
    ['a secret key', 'sb_secret_abc123'],
    ['a publishable key with a secret key pasted after it', 'sb_publishable_abc123sb_secret_def456'],
    ['the words service_role', 'service_role'],
    ['a legacy service_role JWT', jwt({ role: 'service_role', iss: 'supabase' })],
  ])('refuses %s in a VITE_ variable, without printing the value', (_label, value) => {
    expect(() => assertNoSecretInClientEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: value })).toThrow(
      /VITE_SUPABASE_PUBLISHABLE_KEY/,
    )
    try {
      assertNoSecretInClientEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: value })
    } catch (error) {
      expect(String(error)).not.toContain(value)
    }
  })

  it('accepts a legacy anon JWT', () => {
    expect(() => assertNoSecretInClientEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'anon' }) })).not.toThrow()
  })

  it('ignores variables that do not reach the browser', () => {
    expect(() => assertNoSecretInClientEnv({ SECRET_KEY: 'sb_secret_abc123' })).not.toThrow()
  })
})
