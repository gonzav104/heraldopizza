import { createClient, isAuthApiError, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { AdminAuth, AdminSession, SignInResult } from '@/features/admin/admin-auth'

/**
 * Supabase adapter of AdminAuth. It is imported only by the lazily loaded admin panel, so supabase-js never reaches
 * the public menu's bundle (U4, S5). It uses the publishable key alone: no secret, service_role, or admin key ever
 * reaches the browser (S6). The session is saved on the device by supabase-js (RF-29) and only after signing in.
 */

/** The build has no Supabase URL or publishable key, so the panel cannot reach the service. */
export class AdminConfigError extends Error {
  override name = 'AdminConfigError'
}

function toAdminSession(session: Session | null): AdminSession | null {
  return session ? { email: session.user.email ?? '' } : null
}

export class SupabaseAdminAuth implements AdminAuth {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async getSession(): Promise<AdminSession | null> {
    const { data, error } = await this.client.auth.getSession()
    if (error) throw error
    return toAdminSession(data.session)
  }

  onSessionChange(listener: (session: AdminSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => listener(toAdminSession(session)))
    return () => data.subscription.unsubscribe()
  }

  async signIn(email: string, password: string): Promise<SignInResult> {
    const { error } = await this.client.auth.signInWithPassword({ email, password })
    if (!error) return { ok: true }
    // Refused credentials get one generic answer: the panel never says whether the email exists.
    if (isAuthApiError(error) && (error.code === 'invalid_credentials' || error.status === 400)) {
      return { ok: false, reason: 'credentials' }
    }
    return { ok: false, reason: 'unavailable' }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }

  async isAdmin(): Promise<boolean> {
    const { data, error } = await this.client.rpc('soy_administrador')
    if (error) throw new Error('soy_administrador() failed', { cause: error })
    if (typeof data !== 'boolean') throw new Error('soy_administrador() did not answer with a boolean')
    return data
  }
}

interface AdminEnv {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

/** Builds the panel's auth from the same two public build settings as the menu. */
export function createSupabaseAdminAuth(env: AdminEnv = import.meta.env): SupabaseAdminAuth {
  const url = env.VITE_SUPABASE_URL?.trim()
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !publishableKey || !/^https?:\/\//.test(url)) {
    throw new AdminConfigError('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set')
  }
  return new SupabaseAdminAuth(
    createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    }),
  )
}
