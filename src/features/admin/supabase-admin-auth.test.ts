import { AuthApiError, AuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { AdminConfigError, SupabaseAdminAuth, createSupabaseAdminAuth } from '@/features/admin/supabase-admin-auth'

function fakeClient(overrides: {
  session?: { user: { email?: string | null } } | null
  signInError?: unknown
  signInThrows?: unknown
  rpc?: { data: unknown; error: unknown }
}) {
  const unsubscribe = vi.fn()
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: overrides.session ?? null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
      signInWithPassword: vi.fn(async () => {
        if (overrides.signInThrows) throw overrides.signInThrows
        return overrides.signInError
          ? { data: { user: null, session: null }, error: overrides.signInError }
          : { data: { user: { email: 'duenio@example.test' }, session: { user: { email: 'duenio@example.test' } } }, error: null }
      }),
      signOut: vi.fn(async () => ({ error: null })),
    },
    rpc: vi.fn(async () => overrides.rpc ?? { data: false, error: null }),
  }
  return { client, unsubscribe, auth: new SupabaseAdminAuth(client as unknown as SupabaseClient) }
}

describe('SupabaseAdminAuth', () => {
  it('restores the saved session with the account email', async () => {
    const { auth } = fakeClient({ session: { user: { email: 'duenio@example.test' } } })

    await expect(auth.getSession()).resolves.toEqual({ email: 'duenio@example.test' })
  })

  it('reports no session when nothing is saved', async () => {
    const { auth } = fakeClient({ session: null })

    await expect(auth.getSession()).resolves.toBeNull()
  })

  it('signs in with email and password, and reports the email of the session the server returned', async () => {
    const { auth, client } = fakeClient({})

    await expect(auth.signIn('DUENIO@example.test', 'secreto')).resolves.toEqual({
      ok: true,
      session: { email: 'duenio@example.test' },
    })
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'DUENIO@example.test', password: 'secreto' })
  })

  it('reports refused credentials without saying which part was wrong', async () => {
    const { auth } = fakeClient({ signInError: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials') })

    await expect(auth.signIn('x@example.test', 'mal')).resolves.toEqual({ ok: false, reason: 'credentials' })
  })

  it.each([
    ['a disabled email provider', new AuthApiError('Email logins are disabled', 422, 'email_provider_disabled')],
    ['an unconfirmed email', new AuthApiError('Email not confirmed', 400, 'email_not_confirmed')],
    ['a 400 without the credentials code', new AuthApiError('Bad request', 400, 'validation_failed')],
    ['a rate limit', new AuthApiError('Too many requests', 429, 'over_request_rate_limit')],
  ])('does not blame the password for %s', async (_label, error) => {
    const { auth } = fakeClient({ signInError: error })

    await expect(auth.signIn('x@example.test', 'clave')).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('turns an unexpected exception into an unavailable answer instead of rejecting', async () => {
    const { auth } = fakeClient({ signInThrows: new Error('boom') })

    await expect(auth.signIn('x@example.test', 'clave')).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('reports an unavailable service when the request cannot get through', async () => {
    const { auth } = fakeClient({ signInError: new AuthRetryableFetchError('Failed to fetch', 0) })

    await expect(auth.signIn('x@example.test', 'clave')).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('asks the database through soy_administrador() whether the account is an administrator', async () => {
    const { auth, client } = fakeClient({ rpc: { data: true, error: null } })

    await expect(auth.isAdmin()).resolves.toBe(true)
    expect(client.rpc).toHaveBeenCalledWith('soy_administrador')
  })

  it('rejects instead of guessing when soy_administrador() fails or answers something else', async () => {
    await expect(fakeClient({ rpc: { data: null, error: { message: 'boom' } } }).auth.isAdmin()).rejects.toThrow()
    await expect(fakeClient({ rpc: { data: 'yes', error: null } }).auth.isAdmin()).rejects.toThrow()
  })

  it('forwards session changes and lets the panel unsubscribe', () => {
    const { auth, client, unsubscribe } = fakeClient({})
    const listener = vi.fn()

    const stop = auth.onSessionChange(listener)
    const callback = (client.auth.onAuthStateChange.mock.calls[0] as unknown as [(e: string, s: unknown) => void])[0]
    callback('SIGNED_OUT', null)
    callback('TOKEN_REFRESHED', { user: { email: 'duenio@example.test' } })
    stop()

    expect(listener.mock.calls).toEqual([[null], [{ email: 'duenio@example.test' }]])
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('createSupabaseAdminAuth', () => {
  it.each([
    ['without a URL', { VITE_SUPABASE_PUBLISHABLE_KEY: 'k' }],
    ['without a key', { VITE_SUPABASE_URL: 'http://127.0.0.1:54321' }],
    ['with a URL that is not http(s)', { VITE_SUPABASE_URL: 'ftp://x', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' }],
  ])('fails with a configuration error %s', (_label, env) => {
    expect(() => createSupabaseAdminAuth(env)).toThrow(AdminConfigError)
  })
})
