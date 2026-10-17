import { Eye, EyeOff, LogOut } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { PrimaryAction } from '@/components/ui/PrimaryAction'
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

const labelClass = 'block text-[1rem] font-bold'
const inputClass =
  'mt-2 min-h-12 w-full rounded-xl bg-chapa px-3.5 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0'

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="texture-chapa grid min-h-dvh place-items-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <span className="texture-pino size-16 rounded-full p-[3px] shadow-[0_10px_22px_-6px_rgb(0_0_0/0.9)]">
          <span className="grid size-full place-items-center rounded-full bg-chapa">
            <img src="/images/logo-heraldo-pizza.webp" alt="" width={64} height={64} className="size-[88%]" />
          </span>
        </span>
        {children}
      </div>
    </main>
  )
}

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
    const result = await auth.signIn(email.trim(), password)
    setSending(false)
    if (result.ok) {
      onSignedIn({ email: email.trim() })
      return
    }
    setError(
      result.reason === 'credentials'
        ? 'Email o contraseña incorrectos.'
        : 'No pudimos conectar con el servicio. Probá de nuevo.',
    )
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

function Panel({ session, onSignOut }: { session: AdminSession; onSignOut: () => void }) {
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

  const signOut = async () => {
    await auth.signOut().catch(() => undefined)
    setPhase({ kind: 'signed-out' })
  }

  switch (phase.kind) {
    case 'restoring':
    case 'checking':
      return (
        <Screen>
          <p role="status" className="text-[1.0625rem] font-semibold">
            Cargando…
          </p>
        </Screen>
      )
    case 'signed-out':
      return (
        <Screen>
          <LoginForm auth={auth} onSignedIn={(session) => setPhase({ kind: 'checking', session })} />
        </Screen>
      )
    case 'no-access':
      return (
        <Screen>
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
        </Screen>
      )
    case 'check-failed':
      return (
        <Screen>
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
        </Screen>
      )
    case 'admin':
      return <Panel session={phase.session} onSignOut={signOut} />
  }
}
