import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminApp } from '@/features/admin/AdminApp'
import type { AdminAuth, AdminSession, SignInResult } from '@/features/admin/admin-auth'
import type { AdminCatalogRepository } from '@/features/admin/catalog/admin-catalog'
import type { AdminPromotionsRepository } from '@/features/admin/promotions/admin-promotions'

/** The catalog editor is tested on its own; here it only needs to load an empty catalog. */
const catalog: AdminCatalogRepository = {
  load: async () => [],
  updateCategory: async () => {
    throw new Error('unused')
  },
  updateProduct: async () => {
    throw new Error('unused')
  },
  updatePrices: async () => {
    throw new Error('unused')
  },
}

/** The promotions editor is tested on its own; here it only needs to load none. */
const promotions: AdminPromotionsRepository = {
  load: vi.fn(async () => []),
  create: async () => {
    throw new Error('unused')
  },
  update: async () => {
    throw new Error('unused')
  },
  move: async () => {
    throw new Error('unused')
  },
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** A fake AdminAuth whose every call the test settles by hand. */
function fakeAuth() {
  const session = deferred<AdminSession | null>()
  const admin: Deferred<boolean>[] = []
  const signIns: Deferred<SignInResult>[] = []
  let listener: ((session: AdminSession | null) => void) | null = null
  const auth: AdminAuth = {
    getSession: vi.fn(() => session.promise),
    onSessionChange: vi.fn((next) => {
      listener = next
      return () => {
        listener = null
      }
    }),
    signIn: vi.fn(() => {
      const call = deferred<SignInResult>()
      signIns.push(call)
      return call.promise
    }),
    signOut: vi.fn(async () => {}),
    isAdmin: vi.fn(() => {
      const call = deferred<boolean>()
      admin.push(call)
      return call.promise
    }),
  }
  return { auth, session, admin, signIns, emit: (next: AdminSession | null) => listener?.(next) }
}

const owner = { email: 'duenio@example.test' }

function loginForm() {
  return screen.queryByRole('form', { name: 'Ingresar al panel' })
}

function panel() {
  return screen.queryByRole('heading', { level: 1, name: 'Panel de Heraldo Pizza' })
}

async function settle<T>(call: Deferred<T>, value: T) {
  await act(async () => call.resolve(value))
}

describe('AdminApp', () => {
  it('shows neither the login nor the panel while it restores the saved session (no flash)', async () => {
    const { auth, session, admin } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    expect(loginForm()).not.toBeInTheDocument()
    expect(panel()).not.toBeInTheDocument()

    await settle(session, owner)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    expect(loginForm()).not.toBeInTheDocument()
    expect(panel()).not.toBeInTheDocument()

    await settle(admin[0], true)
    expect(panel()).toBeInTheDocument()
    expect(loginForm()).not.toBeInTheDocument()
  })

  it('opens the panel straight from a saved administrator session (RF-29)', async () => {
    const { auth, session, admin } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, owner)
    await settle(admin[0], true)

    expect(panel()).toBeInTheDocument()
    expect(screen.getByText('duenio@example.test')).toBeInTheDocument()
  })

  it('asks for email and password when there is no saved session (RF-27)', async () => {
    const { auth, session } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, null)

    const form = loginForm()
    expect(form).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('link', { name: /registr/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/crear cuenta|registrarse/i)).not.toBeInTheDocument()
  })

  it('lets the owner show and hide the password', async () => {
    const { auth, session } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, null)

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  it('signs in, checks the role, and opens the panel; the button waits while it sends', async () => {
    const { auth, session, signIns, admin } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, null)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'duenio@example.test' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(auth.signIn).toHaveBeenCalledWith('duenio@example.test', 'secreto')
    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled()

    await settle(signIns[0], { ok: true, session: owner })
    expect(auth.isAdmin).toHaveBeenCalled()
    await settle(admin[0], true)
    expect(panel()).toBeInTheDocument()
  })

  it('answers refused credentials with one generic message and keeps the form', async () => {
    const { auth, session, signIns } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, null)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'otro@example.test' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    await settle(signIns[0], { ok: false, reason: 'credentials' })

    expect(screen.getByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
    expect(loginForm()).toBeInTheDocument()
    expect(panel()).not.toBeInTheDocument()
  })

  it('says when the sign-in could not be completed', async () => {
    const { auth, session, signIns } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, null)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'duenio@example.test' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    await settle(signIns[0], { ok: false, reason: 'unavailable' })

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos iniciar sesión. Probá de nuevo en un momento.')
  })

  it('turns away an account without the administrator role and signs it out', async () => {
    const { auth, session, admin } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, { email: 'cliente@example.test' })
    await settle(admin[0], false)

    expect(screen.getByRole('alert')).toHaveTextContent('Esta cuenta no tiene acceso al panel.')
    expect(auth.signOut).toHaveBeenCalled()
    expect(panel()).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Volver a ingresar' }))
    expect(loginForm()).toBeInTheDocument()
  })

  it('shows an error with «Reintentar» when the role cannot be checked, and retries', async () => {
    const { auth, session, admin } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, owner)
    await act(async () => admin[0].reject(new Error('offline')))

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos verificar tu cuenta.')
    expect(panel()).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    await settle(admin[1], true)
    expect(panel()).toBeInTheDocument()
  })

  it('shows the email of the session the server returned, not the one typed', async () => {
    const { auth, session, signIns, admin } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, null)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'DUENIO@Example.test' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    await settle(signIns[0], { ok: true, session: owner })
    await settle(admin[0], true)

    expect(screen.getByText('duenio@example.test')).toBeInTheDocument()
    expect(screen.queryByText('DUENIO@Example.test')).not.toBeInTheDocument()
  })

  it('does not leave the button stuck if signing in throws anyway', async () => {
    const { auth, session, signIns } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, null)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'duenio@example.test' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    await act(async () => signIns[0].reject(new Error('boom')))

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos iniciar sesión. Probá de nuevo en un momento.')
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
  })

  it('offers «Cerrar sesión» when the account cannot be checked, so a rejected session is never a dead end', async () => {
    const { auth, session, admin } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, owner)
    await act(async () => admin[0].reject(new Error('401')))

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })))

    expect(auth.signOut).toHaveBeenCalled()
    expect(loginForm()).toBeInTheDocument()
  })

  it('stays in the panel and says so when signing out fails, instead of pretending', async () => {
    const { auth, session, admin } = fakeAuth()
    vi.mocked(auth.signOut).mockRejectedValueOnce(new Error('offline'))
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, owner)
    await settle(admin[0], true)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })))

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cerrar la sesión. Probá de nuevo.')
    expect(panel()).toBeInTheDocument()
    expect(loginForm()).not.toBeInTheDocument()
  })

  it('signs out from the panel and returns to the login (RF-29)', async () => {
    const { auth, session, admin } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, owner)
    await settle(admin[0], true)

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })))

    expect(auth.signOut).toHaveBeenCalled()
    expect(loginForm()).toBeInTheDocument()
    expect(panel()).not.toBeInTheDocument()
  })

  it('goes back to the login when the session ends elsewhere', async () => {
    const { auth, session, admin, emit } = fakeAuth()
    render(<AdminApp auth={auth} catalog={catalog} promotions={promotions} />)
    await settle(session, owner)
    await settle(admin[0], true)

    act(() => emit(null))

    expect(loginForm()).toBeInTheDocument()
    expect(panel()).not.toBeInTheDocument()
  })
})

function editableCatalog(): AdminCatalogRepository {
  return {
    ...catalog,
    load: async () => [
      {
        id: 'c1',
        name: 'Pizzas',
        visible: true,
        updatedAt: 't0',
        products: [
          {
            id: 'p1',
            categoryId: 'c1',
            name: 'Muzzarella',
            description: null,
            madeToOrder: false,
            madeToOrderNotice: null,
            outOfStock: false,
            visible: true,
            updatedAt: 't0',
            variants: [{ id: 'v1', name: 'Entera', price: 16000, updatedAt: 't0' }],
          },
        ],
      },
    ],
  }
}

async function openEditablePanel(repository = editableCatalog()) {
  const fake = fakeAuth()
  render(<AdminApp auth={fake.auth} catalog={repository} promotions={promotions} />)
  await settle(fake.session, owner)
  await settle(fake.admin[0], true)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar precios de Muzzarella' }))
  const price = await screen.findByRole('textbox', { name: /Precio.*Entera/i })
  fireEvent.change(price, { target: { value: '17000' } })
  return { ...fake, price }
}

describe('AdminApp: leaving pending work', () => {
  it('keeps drafts when sign-out is cancelled and signs out only after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { auth, price } = await openEditablePanel()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })))
    expect(confirm).toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
    expect(price).toHaveValue('17000')
    confirm.mockReturnValue(true)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })))
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(loginForm()).toBeInTheDocument()
  })

  it('preserves drafts after a confirmed sign-out fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { auth, price } = await openEditablePanel()
    vi.mocked(auth.signOut).mockRejectedValueOnce(new Error('offline'))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })))
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cerrar la sesión.')
    expect(price).toHaveValue('17000')
  })

  it('pauses catalog editing during sign-out and restores the draft after failure', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { auth, price } = await openEditablePanel()
    const signOut = deferred<void>()
    vi.mocked(auth.signOut).mockReturnValueOnce(signOut.promise)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled()
    expect(price.closest('section[aria-label="Gestión del catálogo"]')).toHaveAttribute('inert')
    await act(async () => signOut.reject(new Error('offline')))
    expect(price).toHaveValue('17000')
    expect(price.closest('section[aria-label="Gestión del catálogo"]')).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
  })

  it('opens the public menu separately without discarding or confirming drafts', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { price } = await openEditablePanel()
    const link = screen.getByRole('link', { name: 'Ver carta (abre otra pestaña)' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    fireEvent.click(link)
    expect(confirm).not.toHaveBeenCalled()
    expect(price).toHaveValue('17000')
  })

  it('disables exit during a price save and restores it when the save fails', async () => {
    const save = deferred<Awaited<ReturnType<AdminCatalogRepository['updatePrices']>>>()
    const { auth } = await openEditablePanel({ ...editableCatalog(), updatePrices: () => save.promise })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar precios' }))
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Ver carta (abre otra pestaña)' })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(auth.signOut).not.toHaveBeenCalled()
    await act(async () => save.reject(new Error('offline')))
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
  })
})

describe('AdminApp: sections (P5b)', () => {
  const sections = () => screen.getByRole('navigation', { name: 'Secciones del panel' })

  it('offers Carta and Promociones, opens Carta, and keeps an unvisited section out of the page', async () => {
    const fake = fakeAuth()
    render(<AdminApp auth={fake.auth} catalog={editableCatalog()} promotions={promotions} />)
    await settle(fake.session, owner)
    await settle(fake.admin[0], true)
    const nav = sections()
    expect(within(nav).getAllByRole('button').map((button) => button.textContent)).toEqual(['Carta', 'Promociones'])
    expect(within(nav).getByRole('button', { name: 'Carta' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('region', { name: 'Gestión del catálogo' })).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Gestión de promociones' })).not.toBeInTheDocument()
    expect(promotions.load).not.toHaveBeenCalled()
    fireEvent.click(within(nav).getByRole('button', { name: 'Promociones' }))
    expect(await screen.findByRole('heading', { name: 'Todavía no hay promociones' })).toBeInTheDocument()
    expect(document.querySelector('section[aria-label="Gestión del catálogo"]')).toHaveAttribute('hidden')
    fireEvent.click(within(nav).getByRole('button', { name: 'Carta' }))
    fireEvent.click(within(nav).getByRole('button', { name: 'Promociones' }))
    expect(promotions.load).toHaveBeenCalledTimes(1)
  })

  it('keeps an unsaved catalog edit across sections, hides the inactive one, and loads the catalog only once', async () => {
    const repository = editableCatalog()
    const load = vi.spyOn(repository, 'load')
    const { price } = await openEditablePanel(repository)
    fireEvent.click(within(sections()).getByRole('button', { name: 'Promociones' }))

    expect(within(sections()).getByRole('button', { name: /^Promociones/ })).toHaveAttribute('aria-current', 'page')
    expect(within(sections()).getByRole('button', { name: 'Carta (cambios sin guardar)' })).toBeInTheDocument()
    expect(price.closest('section[aria-label="Gestión del catálogo"]')).toHaveAttribute('hidden')
    expect(screen.queryByRole('textbox', { name: /Precio.*Entera/i })).not.toBeInTheDocument()

    fireEvent.click(within(sections()).getByRole('button', { name: /^Carta/ }))
    expect(screen.getByRole('textbox', { name: /Precio.*Entera/i })).toHaveValue('17000')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('asks before signing out with an unsaved edit in a section that is not on screen', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { auth } = await openEditablePanel()
    fireEvent.click(within(sections()).getByRole('button', { name: /^Promociones/ }))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })))
    expect(confirm).toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('blocks switching sections while a save is running', async () => {
    const save = deferred<Awaited<ReturnType<AdminCatalogRepository['updatePrices']>>>()
    await openEditablePanel({ ...editableCatalog(), updatePrices: () => save.promise })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar precios' }))
    expect(within(sections()).getByRole('button', { name: /^Promociones/ })).toBeDisabled()
    await act(async () => save.reject(new Error('offline')))
    expect(within(sections()).getByRole('button', { name: /^Promociones/ })).toBeEnabled()
  })
})
