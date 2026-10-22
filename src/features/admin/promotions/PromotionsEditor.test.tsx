import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOZEN_CHOICE, type AdminPromotion, type AdminPromotionsRepository } from '@/features/admin/promotions/admin-promotions'
import { PromotionsEditor } from '@/features/admin/promotions/PromotionsEditor'
import { AdminSaveError } from '@/features/admin/shared/admin-save'

// Saturday 24 October 2026, 21:00 in Argentina (00:00 UTC on Sunday): the panel must use Argentina's day.
const NOW = new Date('2026-10-25T00:00:00Z')

const promo = (changes: Partial<AdminPromotion> = {}): AdminPromotion => ({
  id: 'u-tres',
  code: 'promo-tres-muzzarella',
  title: 'Tres pizzas Muzzarella',
  description: null,
  price: 42000,
  visible: true,
  order: 7,
  activeFrom: null,
  activeTo: null,
  weekdays: null,
  flavorChoice: null,
  updatedAt: 't0',
  ...changes,
})

const all = [
  promo(),
  promo({ id: 'u-docena', code: 'promo-docena-eleccion', title: 'Docena de empanadas a elección', price: 36000, order: 5, flavorChoice: { ...DOZEN_CHOICE, categoryVisible: true } }),
  promo({ id: 'u-off', code: 'promo-apagada', title: 'Promo apagada', visible: false, order: 8 }),
  promo({ id: 'u-next', code: 'promo-futura', title: 'Promo futura', activeFrom: '2026-11-01', order: 9 }),
  promo({ id: 'u-old', code: 'promo-vieja', title: 'Promo vieja', activeTo: '2026-10-01', order: 10 }),
  promo({ id: 'u-day', code: 'promo-viernes', title: 'Promo de viernes', weekdays: [5], order: 11 }),
  promo({ id: 'u-hidden', code: 'promo-gustos-ocultos', title: 'Docena oculta', order: 12, flavorChoice: { ...DOZEN_CHOICE, categoryVisible: false } }),
]

function fakeRepository(changes: Partial<AdminPromotionsRepository> = {}): AdminPromotionsRepository {
  return {
    load: vi.fn(async () => all),
    create: vi.fn(async () => {
      throw new Error('unused')
    }),
    update: vi.fn(async (id, values, updatedAt) => {
      const found = all.find((item) => item.id === id)!
      if (updatedAt !== found.updatedAt) throw new AdminSaveError('conflict', 'stale')
      return { ...found, ...values, updatedAt: 't1' }
    }),
    ...changes,
  }
}

const card = (title: string) => screen.getByRole('region', { name: title })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

async function renderEditor(repository = fakeRepository(), onWorkChange = vi.fn()) {
  render(<PromotionsEditor repository={repository} onWorkChange={onWorkChange} />)
  await screen.findByRole('heading', { level: 1, name: 'Promociones' })
  return { repository, onWorkChange }
}

describe('PromotionsEditor: list (P5b)', () => {
  it('lists every promotion with its price, code, composition, and the state the public menu gives it today in Argentina', async () => {
    await renderEditor()
    const tres = card('Tres pizzas Muzzarella')
    expect(within(tres).getByText('Activa')).toBeInTheDocument()
    expect(within(tres).getByText('$ 42.000')).toBeInTheDocument()
    expect(within(tres).getByText('promo-tres-muzzarella')).toBeInTheDocument()
    expect(within(tres).getByText('Combo cerrado')).toBeInTheDocument()
    expect(within(tres).getByText('Sin límite de fechas · Todos los días')).toBeInTheDocument()
    expect(within(card('Docena de empanadas a elección')).getByText('Docena a elección: 12 empanadas')).toBeInTheDocument()
    expect(within(card('Promo apagada')).getByText('Desactivada')).toBeInTheDocument()
    expect(within(card('Promo futura')).getByText('Programada')).toBeInTheDocument()
    expect(within(card('Promo futura')).getByText('Desde el 01/11/2026 · Todos los días')).toBeInTheDocument()
    expect(within(card('Promo vieja')).getByText('Vencida')).toBeInTheDocument()
    // Saturday in Argentina, although it is already Sunday in UTC.
    expect(within(card('Promo de viernes')).getByText('Fuera de día')).toBeInTheDocument()
    expect(within(card('Promo de viernes')).getByText('Sin límite de fechas · Viernes')).toBeInTheDocument()
    expect(within(card('Docena oculta')).getByText('Categoría de gustos oculta')).toBeInTheDocument()
    expect(screen.getByText('7 promociones · 2 activas')).toBeInTheDocument()
  })

  it('shows loading, then an error with a retry that loads again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(all)
    render(<PromotionsEditor repository={fakeRepository({ load })} onWorkChange={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando promociones…')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las promociones.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('region', { name: 'Tres pizzas Muzzarella' })).toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('says when there are no promotions yet', async () => {
    render(<PromotionsEditor repository={fakeRepository({ load: vi.fn(async () => []) })} onWorkChange={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'Todavía no hay promociones' })).toBeInTheDocument()
  })
})

describe('PromotionsEditor: activate and deactivate (P5b)', () => {
  it('asks before switching a promotion off and saves nothing when the owner cancels', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { repository } = await renderEditor()
    await act(async () => fireEvent.click(within(card('Tres pizzas Muzzarella')).getByRole('checkbox', { name: 'Visible en la carta: Tres pizzas Muzzarella' })))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('¿Desactivar «Tres pizzas Muzzarella»?'))
    expect(repository.update).not.toHaveBeenCalled()
    expect(within(card('Tres pizzas Muzzarella')).getByRole('checkbox', { name: /Visible en la carta/ })).toBeChecked()
  })

  it('switches a promotion off after confirming and shows the saved state', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { repository } = await renderEditor()
    await act(async () => fireEvent.click(within(card('Tres pizzas Muzzarella')).getByRole('checkbox', { name: /Visible en la carta/ })))
    expect(repository.update).toHaveBeenCalledWith('u-tres', { visible: false }, 't0')
    expect(within(card('Tres pizzas Muzzarella')).getByText('Desactivada')).toBeInTheDocument()
    expect(within(card('Tres pizzas Muzzarella')).getByRole('status')).toHaveTextContent('Estado: Guardado')
  })

  it('switches a promotion on without asking', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const { repository } = await renderEditor()
    await act(async () => fireEvent.click(within(card('Promo apagada')).getByRole('checkbox', { name: /Visible en la carta/ })))
    expect(confirm).not.toHaveBeenCalled()
    expect(repository.update).toHaveBeenCalledWith('u-off', { visible: true }, 't0')
  })
})

describe('PromotionsEditor: edit (P5b)', () => {
  async function openEdit(title: string) {
    fireEvent.click(within(card(title)).getByRole('button', { name: `Editar ${title}` }))
    return screen.findByRole('dialog', { name: title })
  }

  it('edits title, description, price, dates, and days, and sends only those fields with the token', async () => {
    const { repository, onWorkChange } = await renderEditor()
    const dialog = await openEdit('Tres pizzas Muzzarella')
    expect(within(dialog).getByText('promo-tres-muzzarella')).toBeInTheDocument()
    expect(within(dialog).getByText('Combo cerrado')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Título' }), { target: { value: 'Tres Muzza' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Descripción/ }), { target: { value: 'Para compartir.' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Precio' }), { target: { value: '45.000' } })
    fireEvent.change(within(dialog).getByLabelText('Desde'), { target: { value: '2026-11-01' } })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Solo algunos días' }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Viernes' }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Sábado' }))
    expect(onWorkChange).toHaveBeenLastCalledWith({ dirty: true, saving: false })
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' })))

    expect(repository.update).toHaveBeenCalledWith(
      'u-tres',
      { title: 'Tres Muzza', description: 'Para compartir.', price: 45000, activeFrom: '2026-11-01', activeTo: null, weekdays: [5, 6] },
      't0',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(card('Tres Muzza')).getByText('$ 45.000')).toBeInTheDocument()
    expect(onWorkChange).toHaveBeenLastCalledWith({ dirty: false, saving: false })
  })

  it('shows field errors and sends nothing while the form is invalid', async () => {
    const { repository } = await renderEditor()
    const dialog = await openEdit('Tres pizzas Muzzarella')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Título' }), { target: { value: ' ' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Precio' }), { target: { value: '0' } })
    fireEvent.change(within(dialog).getByLabelText('Desde'), { target: { value: '2026-11-30' } })
    fireEvent.change(within(dialog).getByLabelText('Hasta'), { target: { value: '2026-11-01' } })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Solo algunos días' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

    expect(within(dialog).getByRole('textbox', { name: 'Título' })).toHaveAccessibleDescription('El título no puede quedar vacío.')
    expect(within(dialog).getByRole('textbox', { name: 'Precio' })).toHaveAccessibleDescription('Ingresá un precio entero mayor a 0.')
    expect(within(dialog).getByLabelText('Hasta')).toHaveAccessibleDescription('La fecha de fin no puede ser anterior a la de inicio.')
    expect(within(dialog).getByText('Elegí al menos un día.')).toBeInTheDocument()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('shows the dozen\'s composition as fixed', async () => {
    await renderEditor()
    const dialog = await openEdit('Docena de empanadas a elección')
    expect(within(dialog).getByText('Docena a elección: 12 empanadas')).toBeInTheDocument()
    expect(within(dialog).getByText('La composición y el código no se pueden cambiar.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('on a conflict keeps the draft, says another change arrived first, and reloads on request', async () => {
    const update = vi.fn().mockRejectedValue(new AdminSaveError('conflict', 'stale'))
    const repository = fakeRepository({ update })
    await renderEditor(repository)
    const dialog = await openEdit('Tres pizzas Muzzarella')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Precio' }), { target: { value: '45000' } })
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' })))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Otro cambio llegó antes. Recargá las promociones para ver lo último.')
    expect(within(dialog).getByRole('textbox', { name: 'Precio' })).toHaveValue('45000')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Recargar promociones' })))
    expect(repository.load).toHaveBeenCalledTimes(2)
  })

  it('keeps a draft when the sheet is closed and asks before a reload would discard it', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { repository } = await renderEditor()
    const dialog = await openEdit('Tres pizzas Muzzarella')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Precio' }), { target: { value: '45000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(within(card('Tres pizzas Muzzarella')).getByText('Cambios sin guardar')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Recargar promociones' }))
    expect(confirm).toHaveBeenCalledWith('Hay cambios sin guardar. ¿Descartarlos y recargar las promociones?')
    expect(repository.load).toHaveBeenCalledTimes(1)
    const reopened = await openEdit('Tres pizzas Muzzarella')
    expect(within(reopened).getByRole('textbox', { name: 'Precio' })).toHaveValue('45000')
  })
})

describe('PromotionsEditor: create (P5b)', () => {
  const created = (changes: Partial<AdminPromotion>) =>
    promo({ id: 'u-new', code: 'promo-1a2b3c', visible: false, order: 13, ...changes })

  async function openCreate() {
    fireEvent.click(screen.getByRole('button', { name: 'Nueva promoción' }))
    return screen.findByRole('dialog', { name: 'Nueva promoción' })
  }

  it('creates a closed combo, switched off, after the last one, and shows it with the code the database gave it', async () => {
    const create = vi.fn(async () => created({ title: 'Dos Muzza', price: 30000 }))
    const { onWorkChange } = await renderEditor(fakeRepository({ create }))
    const dialog = await openCreate()
    expect(within(dialog).getByRole('radio', { name: 'Combo cerrado' })).toBeChecked()
    expect(within(dialog).getByText('Se crea desactivada: activala cuando esté lista para la carta.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Título' }), { target: { value: 'Dos Muzza' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Precio' }), { target: { value: '30.000' } })
    expect(onWorkChange).toHaveBeenLastCalledWith({ dirty: true, saving: false })
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Crear promoción' })))

    expect(create).toHaveBeenCalledWith(
      { kind: 'closed', title: 'Dos Muzza', description: null, price: 30000, activeFrom: null, activeTo: null, weekdays: null },
      13,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const added = card('Dos Muzza')
    expect(within(added).getByText('promo-1a2b3c')).toBeInTheDocument()
    expect(within(added).getByText('Desactivada')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('«Dos Muzza» creada. Está desactivada hasta que la actives.')
    expect(onWorkChange).toHaveBeenLastCalledWith({ dirty: false, saving: false })
  })

  it('creates the dozen to choose, offering only 12 empanadas and no category or units to pick', async () => {
    const create = vi.fn(async () => created({ title: 'Docena del finde', flavorChoice: { ...DOZEN_CHOICE, categoryVisible: true } }))
    await renderEditor(fakeRepository({ create }))
    const dialog = await openCreate()
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Docena de empanadas a elección (12)' }))
    expect(within(dialog).queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Título' }), { target: { value: 'Docena del finde' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Precio' }), { target: { value: '34000' } })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Solo algunos días' }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Sábado' }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Domingo' }))
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Crear promoción' })))

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'dozen', price: 34000, weekdays: [0, 6] }), 13)
    expect(within(card('Docena del finde')).getByText('Docena a elección: 12 empanadas')).toBeInTheDocument()
  })

  it('shows field errors and creates nothing while the form is invalid', async () => {
    const create = vi.fn()
    await renderEditor(fakeRepository({ create }))
    const dialog = await openCreate()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear promoción' }))
    expect(within(dialog).getByRole('textbox', { name: 'Título' })).toHaveAccessibleDescription('El título no puede quedar vacío.')
    expect(within(dialog).getByRole('textbox', { name: 'Precio' })).toHaveAccessibleDescription('Ingresá un precio entero mayor a 0.')
    expect(create).not.toHaveBeenCalled()
  })

  it('keeps the draft when the database refuses it and lets the owner retry', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new AdminSaveError('unavailable', 'offline'))
      .mockResolvedValueOnce(created({ title: 'Dos Muzza' }))
    await renderEditor(fakeRepository({ create }))
    const dialog = await openCreate()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Título' }), { target: { value: 'Dos Muzza' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Precio' }), { target: { value: '30000' } })
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Crear promoción' })))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('No pudimos guardar.')
    expect(within(dialog).getByRole('textbox', { name: 'Título' })).toHaveValue('Dos Muzza')
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' })))
    expect(create).toHaveBeenCalledTimes(2)
    expect(card('Dos Muzza')).toBeInTheDocument()
  })

  it('places the first promotion at position 1 when there are none', async () => {
    const create = vi.fn(async () => created({ title: 'Primera', order: 1 }))
    await renderEditor(fakeRepository({ load: vi.fn(async () => []), create }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Nueva promoción' })[0])
    const dialog = await screen.findByRole('dialog', { name: 'Nueva promoción' })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Título' }), { target: { value: 'Primera' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Precio' }), { target: { value: '1000' } })
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Crear promoción' })))
    expect(create).toHaveBeenCalledWith(expect.anything(), 1)
  })
})
