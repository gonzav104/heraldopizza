import { Eye, EyeOff, LogOut } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { PrimaryAction } from '@/components/ui/PrimaryAction'
import { StatusScreen } from '@/components/ui/StatusScreen'
import type { AdminAuth, AdminSession } from '@/features/admin/admin-auth'

/**
 * Where the panel stands. «restoring» and «checking» render one neutral screen, so neither the login nor the panel
 * flashes while the saved session is read or the role is checked (S4 of U4).
 */
type Phase =
  | { kind: 'restoring' }
  | { kind: 'signed-out' }
  | { kind: 'checking'; session: AdminSession }
  | { kind: 'admin'; session: AdminSession }
  | { kind: 'no-access' }
  | { kind: 'check-failed'; session: AdminSession }

const UNAVAILABLE = 'No pudimos iniciar sesión. Probá de nuevo en un momento.'
const SIGN_OUT_FAILED = 'No pudimos cerrar la sesión. Probá de nuevo.'

const labelClass = 'block text-[1rem] font-bold'
const inputClass =
  'mt-2 min-h-12 w-full rounded-xl bg-chapa px-3.5 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0'

function LoginForm({ auth, onSignedIn }: { auth: AdminAuth; onSignedIn: (session: AdminSession) => void }) {
  const ids = { email: useId(), password: useId(), title: useId() }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      const result = await auth.signIn(email.trim(), password)
      if (result.ok) {
        onSignedIn(result.session)
        return
      }
      setError(result.reason === 'credentials' ? 'Email o contraseña incorrectos.' : UNAVAILABLE)
    } catch {
      // The port promises never to reject; if it ever does, the form must still recover.
      setError(UNAVAILABLE)
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      aria-labelledby={ids.title}
      onSubmit={submit}
      className="flex w-full flex-col gap-5 rounded-2xl bg-chapa-high p-5 text-left ring-1 ring-chapa-edge"
    >
      <h1 id={ids.title} className="type-display text-center text-[1.5rem]">
        Ingresar al panel
      </h1>
      <div>
        <label htmlFor={ids.email} className={labelClass}>
          Email
        </label>
        <input
          id={ids.email}
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={ids.password} className={labelClass}>
          Contraseña
        </label>
        <div className="relative">
          <input
            id={ids.password}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} pr-14`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            className="absolute top-2 right-1 grid size-12 place-items-center rounded-xl text-crema-muted hover:text-crema"
          >
            {showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-[0.9375rem] font-semibold text-mostaza">
          {error}
        </p>
      ) : null}
      <PrimaryAction type="submit" label={sending ? 'Ingresando…' : 'Ingresar'} disabled={sending} />
    </form>
  )
}

function Panel({
  session,
  onSignOut,
  signOutFailed,
}: {
  session: AdminSession
  onSignOut: () => void
  signOutFailed: boolean
}) {
  return (
    <main className="texture-chapa min-h-dvh">
      <header className="border-b border-chapa-edge bg-chapa-high/60">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="type-display text-[1.375rem]">Panel de Heraldo Pizza</h1>
            <p className="text-[0.9375rem] text-crema-muted">{session.email}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-chapa px-4 font-semibold ring-1 ring-chapa-edge hover:bg-chapa-edge"
          >
            <LogOut aria-hidden="true" className="size-4.5 text-mostaza" />
            Cerrar sesión
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-4 py-8">
        {signOutFailed ? (
          <p role="alert" className="mb-4 font-semibold text-mostaza">
            {SIGN_OUT_FAILED}
          </p>
        ) : null}
        <p className="text-crema-muted">La gestión de la carta llega en la próxima etapa.</p>
      </section>
    </main>
  )
}

/**
 * The admin panel (U4): restores the saved session, asks soy_administrador() whether to show the panel, and offers
 * sign-in and sign-out. The answer only shapes the interface; row level security guards every write.
 */
export function AdminApp({ auth }: { auth: AdminAuth }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'restoring' })
  const [signOutFailed, setSignOutFailed] = useState(false)

  useEffect(() => {
    let active = true
    auth.getSession().then(
      (session) => {
        if (active) setPhase(session ? { kind: 'checking', session } : { kind: 'signed-out' })
      },
      () => {
        if (active) setPhase({ kind: 'signed-out' })
      },
    )
    const stop = auth.onSessionChange((session) => {
      // A session that ends elsewhere sends the panel back to the login; the «no access» notice stays on screen.
      if (!session) setPhase((current) => (current.kind === 'restoring' || current.kind === 'no-access' ? current : { kind: 'signed-out' }))
    })
    return () => {
      active = false
      stop()
    }
  }, [auth])

  useEffect(() => {
    if (phase.kind !== 'checking') return
    let active = true
    const { session } = phase
    auth.isAdmin().then(
      async (isAdmin) => {
        if (!active) return
        if (isAdmin) {
          setPhase({ kind: 'admin', session })
          return
        }
        setPhase({ kind: 'no-access' })
        await auth.signOut().catch(() => undefined)
      },
      () => {
        if (active) setPhase({ kind: 'check-failed', session })
      },
    )
    return () => {
      active = false
    }
  }, [auth, phase])

  // A failed sign-out leaves the session on the device, so the panel says so instead of showing the login.
  const signOut = async () => {
    try {
      await auth.signOut()
      setSignOutFailed(false)
      setPhase({ kind: 'signed-out' })
    } catch {
      setSignOutFailed(true)
    }
  }

  switch (phase.kind) {
    case 'restoring':
    case 'checking':
      return (
        <StatusScreen>
          <p role="status" className="text-[1.0625rem] font-semibold">
            Cargando…
          </p>
        </StatusScreen>
      )
    case 'signed-out':
      return (
        <StatusScreen>
          <LoginForm auth={auth} onSignedIn={(session) => setPhase({ kind: 'checking', session })} />
        </StatusScreen>
      )
    case 'no-access':
      return (
        <StatusScreen>
          <p role="alert" className="type-display text-[1.375rem]">
            Esta cuenta no tiene acceso al panel.
          </p>
          <button
            type="button"
            onClick={() => setPhase({ kind: 'signed-out' })}
            className="inline-flex min-h-12 items-center rounded-full bg-heraldo px-6 font-bold text-white hover:bg-heraldo-deep"
          >
            Volver a ingresar
          </button>
        </StatusScreen>
      )
    case 'check-failed':
      return (
        <StatusScreen>
          <p role="alert" className="type-display text-[1.375rem]">
            No pudimos verificar tu cuenta.
          </p>
          <p className="text-crema-muted">Revisá tu conexión e intentá de nuevo.</p>
          <button
            type="button"
            onClick={() => setPhase({ kind: 'checking', session: phase.session })}
            className="inline-flex min-h-12 items-center rounded-full bg-heraldo px-6 font-bold text-white hover:bg-heraldo-deep"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold ring-1 ring-chapa-edge hover:bg-chapa-edge"
          >
            <LogOut aria-hidden="true" className="size-4.5 text-mostaza" />
            Cerrar sesión
          </button>
          {signOutFailed ? (
            <p role="status" className="font-semibold text-mostaza">
              {SIGN_OUT_FAILED}
            </p>
          ) : null}
        </StatusScreen>
      )
    case 'admin':
      return <Panel session={phase.session} onSignOut={signOut} signOutFailed={signOutFailed} />
  }
}
