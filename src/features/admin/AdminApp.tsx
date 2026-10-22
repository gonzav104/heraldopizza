import { ArrowUpRight, Eye, EyeOff, LogOut } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import './admin.css'
import type { AdminAuth, AdminSession } from '@/features/admin/admin-auth'
import type { AdminCatalogRepository } from '@/features/admin/catalog/admin-catalog'
import { CatalogEditor } from '@/features/admin/catalog/CatalogEditor'

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

const labelClass = 'admin-label'
const inputClass = 'admin-input'

function Brand() {
  return (
    <div className="admin-brand">
      <img src="/images/logo-heraldo-pizza.webp" alt="Heraldo Pizza" width="44" height="44" />
      <span>Administración</span>
    </div>
  )
}

function AdminStatus({ children }: { children: ReactNode }) {
  return (
    <main className="admin-theme admin-access">
      <div className="admin-access-content">
        <Brand />
        {children}
        <a className="admin-back" href="/">
          Volver a la carta
        </a>
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
    <form aria-labelledby={ids.title} onSubmit={submit} className="admin-login">
      <h1 id={ids.title} className="admin-login-title">
        Ingresar al panel
      </h1>
      <p className="admin-muted">Tu carta, al día. Ingresá para gestionar los productos.</p>
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
        <div className="admin-password">
          <input
            id={ids.password}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} admin-password-input`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            className="admin-password-toggle"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="admin-error">
          {error}
        </p>
      ) : null}
      <button className="admin-button admin-primary" type="submit" disabled={sending}>
        {sending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}

type Section = 'catalog' | 'promotions'
type Work = { dirty: boolean; saving: boolean }
const idle: Work = { dirty: false, saving: false }

const SECTIONS: { id: Section; label: string; region: string }[] = [
  { id: 'catalog', label: 'Carta', region: 'Gestión del catálogo' },
  { id: 'promotions', label: 'Promociones', region: 'Gestión de promociones' },
]

function Panel({
  session,
  catalog,
  onSignOut,
  signOutFailed,
}: {
  session: AdminSession
  catalog: AdminCatalogRepository
  onSignOut: () => Promise<void>
  signOutFailed: boolean
}) {
  const [section, setSection] = useState<Section>('catalog')
  // A section loads the first time it is opened and then stays mounted, hidden, so its unsaved edits survive a switch.
  const [visited, setVisited] = useState<Section[]>(['catalog'])
  const [work, setWork] = useState<Record<Section, Work>>({ catalog: idle, promotions: idle })
  const reportCatalog = useCallback((next: Work) => setWork((current) => ({ ...current, catalog: next })), [])
  const reportPromotions = useCallback((next: Work) => setWork((current) => ({ ...current, promotions: next })), [])
  const [leaving, setLeaving] = useState(false)
  const saving = work.catalog.saving || work.promotions.saving
  const dirty = work.catalog.dirty || work.promotions.dirty
  const exitBlocked = saving || leaving
  const mayLeave = () =>
    !exitBlocked && (!dirty || window.confirm('Tenés cambios sin guardar. Si salís, se perderán. ¿Querés salir?'))
  const open = (next: Section) => {
    setSection(next)
    setVisited((current) => (current.includes(next) ? current : [...current, next]))
  }

  return (
    <main className="admin-theme admin-workspace">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-identity">
            <Brand />
            <h1 className="sr-only">Panel de Heraldo Pizza</h1>
            <p className="admin-session">{session.email}</p>
          </div>
          <nav aria-label="Sesión de administración" className="admin-session-actions">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-button admin-menu-link"
              aria-disabled={exitBlocked || undefined}
              onClick={(event) => {
                if (exitBlocked) event.preventDefault()
              }}
            >
              Ver carta <span className="sr-only">(abre otra pestaña)</span>
              <ArrowUpRight aria-hidden="true" size={16} />
            </a>
            <button
              type="button"
              disabled={exitBlocked}
              className="admin-button"
              onClick={async () => {
                if (!mayLeave()) return
                setLeaving(true)
                try {
                  await onSignOut()
                } finally {
                  setLeaving(false)
                }
              }}
            >
              <LogOut aria-hidden="true" size={16} /> Cerrar sesión
            </button>
          </nav>
        </div>
        <nav aria-label="Secciones del panel" className="admin-sections" inert={leaving}>
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-current={section === id ? 'page' : undefined}
              aria-label={work[id].dirty ? `${label} (cambios sin guardar)` : undefined}
              disabled={saving}
              onClick={() => open(id)}
            >
              {label}
              {work[id].dirty ? <span aria-hidden="true" className="admin-section-dot" /> : null}
            </button>
          ))}
        </nav>
      </header>
      {signOutFailed ? (
        <div className="admin-content admin-content-banner">
          <p role="alert" className="admin-error admin-banner">
            {SIGN_OUT_FAILED}
          </p>
        </div>
      ) : null}
      {SECTIONS.filter(({ id }) => visited.includes(id)).map(({ id, region }) => (
        // hidden takes the inactive section out of the page, the keyboard, and the accessibility tree.
        <section key={id} className="admin-content" aria-label={region} hidden={section !== id} inert={leaving}>
          {id === 'catalog' ? (
            <CatalogEditor repository={catalog} onWorkChange={reportCatalog} />
          ) : (
            <PromotionsPlaceholder onWorkChange={reportPromotions} />
          )}
        </section>
      ))}
    </main>
  )
}

/** Stand-in until the promotions editor lands (P5b-3): it holds no work. */
function PromotionsPlaceholder({ onWorkChange }: { onWorkChange: (work: Work) => void }) {
  useEffect(() => onWorkChange(idle), [onWorkChange])
  return <p className="admin-muted">La administración de promociones todavía no está disponible.</p>
}

/**
 * The admin panel (U4): restores the saved session, asks soy_administrador() whether to show the panel, and offers
 * sign-in and sign-out. The answer only shapes the interface; row level security guards every write.
 */
export function AdminApp({ auth, catalog }: { auth: AdminAuth; catalog: AdminCatalogRepository }) {
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
      if (!session)
        setPhase((current) =>
          current.kind === 'restoring' || current.kind === 'no-access' ? current : { kind: 'signed-out' },
        )
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
        <AdminStatus>
          <p role="status" className="text-[1.0625rem] font-semibold">
            Cargando…
          </p>
        </AdminStatus>
      )
    case 'signed-out':
      return (
        <AdminStatus>
          <LoginForm auth={auth} onSignedIn={(session) => setPhase({ kind: 'checking', session })} />
        </AdminStatus>
      )
    case 'no-access':
      return (
        <AdminStatus>
          <p role="alert" className="admin-status-title">
            Esta cuenta no tiene acceso al panel.
          </p>
          <button type="button" onClick={() => setPhase({ kind: 'signed-out' })} className="admin-button admin-primary">
            Volver a ingresar
          </button>
        </AdminStatus>
      )
    case 'check-failed':
      return (
        <AdminStatus>
          <p role="alert" className="admin-status-title">
            No pudimos verificar tu cuenta.
          </p>
          <p className="admin-muted">Revisá tu conexión e intentá de nuevo.</p>
          <button
            type="button"
            onClick={() => setPhase({ kind: 'checking', session: phase.session })}
            className="admin-button admin-primary"
          >
            Reintentar
          </button>
          <button type="button" onClick={signOut} className="admin-button">
            <LogOut aria-hidden="true" className="size-4.5" />
            Cerrar sesión
          </button>
          {signOutFailed ? (
            <p role="status" className="admin-error">
              {SIGN_OUT_FAILED}
            </p>
          ) : null}
        </AdminStatus>
      )
    case 'admin':
      return <Panel session={phase.session} catalog={catalog} onSignOut={signOut} signOutFailed={signOutFailed} />
  }
}
