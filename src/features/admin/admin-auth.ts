/** What the admin panel knows about the signed-in account. */
export interface AdminSession {
  email: string
}

/**
 * A successful sign-in carries the session the server returned. A failed one says only whether the credentials were
 * refused or the sign-in could not be completed (network, configuration, rate limit, account state).
 */
export type SignInResult = { ok: true; session: AdminSession } | { ok: false; reason: 'credentials' | 'unavailable' }

/**
 * Port between the admin panel and the authentication service. The Supabase adapter implements it; tests use a fake.
 * `isAdmin` only shapes the interface: row level security decides every read and write on the server.
 */
export interface AdminAuth {
  /** The session saved on this device, if any (RF-29). Rejects when it cannot be read. */
  getSession(): Promise<AdminSession | null>
  /** Called when the session changes elsewhere (expiry, sign-out in another tab). Returns an unsubscribe function. */
  onSessionChange(listener: (session: AdminSession | null) => void): () => void
  /** Never rejects: every failure becomes a SignInResult. */
  signIn(email: string, password: string): Promise<SignInResult>
  /** Rejects when the session could not be ended; the session is then still on the device. */
  signOut(): Promise<void>
  /** Whether the signed-in account is an administrator. Rejects when the service cannot answer. */
  isAdmin(): Promise<boolean>
}
