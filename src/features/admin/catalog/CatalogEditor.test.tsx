import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogEditor } from '@/features/admin/catalog/CatalogEditor'
import {
  AdminSaveError,
  type AdminCatalogRepository,
  type AdminCategory,
  type PriceChange,
} from '@/features/admin/catalog/admin-catalog'

const T0 = '2026-10-17T10:00:00.000001+00:00'
const T1 = '2026-10-17T10:05:00.000002+00:00'

function catalog(): AdminCategory[] {
  return [
    {
      id: 'cat-pizzas',
      name: 'Pizzas',
      visible: true,
      updatedAt: T0,
      products: [
        {
          id: 'p-muzza',
          categoryId: 'cat-pizzas',
          name: 'Muzzarella',
          description: 'Salsa y muzzarella.',
          madeToOrder: false,
          madeToOrderNotice: null,
          outOfStock: false,
          visible: true,
          updatedAt: T0,
          variants: [
            { id: 'v-entera', name: 'Entera', price: 16000, updatedAt: T0 },
            { id: 'v-media', name: 'Media', price: 10500, updatedAt: T0 },
          ],
        },
        {
          id: 'p-napo',
          categoryId: 'cat-pizzas',
          name: 'Napolitana',
          description: null,
          madeToOrder: false,
          madeToOrderNotice: null,
          outOfStock: false,
          visible: false,
          updatedAt: T0,
          variants: [{ id: 'v-napo', name: 'Entera', price: 21000, updatedAt: T0 }],
        },
      ],
    },
  ]
}

function fakeRepository(overrides: Partial<AdminCatalogRepository> = {}) {
  const repository: AdminCatalogRepository = {
    load: vi.fn(async () => catalog()),
    updateCategory: vi.fn(async (id, changes) => ({ id, name: changes.name ?? 'Pizzas', visible: changes.visible ?? true, updatedAt: T1 })),
    updateProduct: vi.fn(async (id, changes) => {
      const current = catalog()[0].products.find((product) => product.id === id)!
      return { ...current, ...changes, variants: undefined, updatedAt: T1 }
    }),
    updatePrices: vi.fn(async (_productId: string, changes: PriceChange[]) =>
      changes.map((change) => ({ id: change.variantId, price: change.price, updatedAt: T1 })),
    ),
    ...overrides,
  }
  return repository
}

async function renderEditor(repository = fakeRepository()) {
  render(<CatalogEditor repository={repository} />)
  await screen.findByRole('heading', { level: 2, name: 'Pizzas' })
  return repository
}

function productCard(name: string) {
  return screen.getByRole('region', { name })
}

describe('CatalogEditor: loading', () => {
  it('announces the load, then lists categories, products, and hidden rows', async () => {
    const repository = fakeRepository()
    render(<CatalogEditor repository={repository} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando catálogo…')
    await screen.findByRole('heading', { level: 2, name: 'Pizzas' })
    expect(productCard('Muzzarella')).toBeInTheDocument()
    expect(within(productCard('Napolitana')).getByText('Oculto en la carta')).toBeInTheDocument()
  })

  it('shows an error with «Reintentar» when the catalog cannot be read, and reloads', async () => {
    const repository = fakeRepository({ load: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(catalog()) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<CatalogEditor repository={repository} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el catálogo.')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Pizzas' })).toBeInTheDocument()
    expect(repository.load).toHaveBeenCalledTimes(2)
  })
})

describe('CatalogEditor: prices (RF-39, RF-58)', () => {
  it('saves only the changed variant with its token, and shows the saved value', async () => {
    const repository = await renderEditor()
    const card = productCard('Muzzarella')
    const save = within(card).getByRole('button', { name: 'Guardar precios' })
    expect(save).toBeDisabled()

    fireEvent.change(within(card).getByLabelText('Precio Entera de Muzzarella'), { target: { value: '17.000' } })
    expect(save).toBeEnabled()
    await act(async () => fireEvent.click(save))

    expect(repository.updatePrices).toHaveBeenCalledWith('p-muzza', [{ variantId: 'v-entera', price: 17000, updatedAt: T0 }])
    expect(within(card).getByRole('status')).toHaveTextContent('Guardado')
    expect(within(card).getByLabelText('Precio Entera de Muzzarella')).toHaveValue('17.000')
    expect(save).toBeDisabled()
  })

  it('saves both pizza prices together when both changed', async () => {
    const repository = await renderEditor()
    const card = productCard('Muzzarella')

    fireEvent.change(within(card).getByLabelText('Precio Entera de Muzzarella'), { target: { value: '17000' } })
    fireEvent.change(within(card).getByLabelText('Precio Media de Muzzarella'), { target: { value: '11000' } })
    await act(async () => fireEvent.click(within(card).getByRole('button', { name: 'Guardar precios' })))

    expect(repository.updatePrices).toHaveBeenCalledTimes(1)
    expect(repository.updatePrices).toHaveBeenCalledWith('p-muzza', [
      { variantId: 'v-entera', price: 17000, updatedAt: T0 },
      { variantId: 'v-media', price: 11000, updatedAt: T0 },
    ])
  })

  it.each([
    ['a decimal', '16000,5'],
    ['zero', '0'],
    ['an empty field', ''],
  ])('refuses %s without calling the database', async (_label, value) => {
    const repository = await renderEditor()
    const card = productCard('Muzzarella')

    fireEvent.change(within(card).getByLabelText('Precio Entera de Muzzarella'), { target: { value } })

    expect(within(card).getByText('Ingresá un precio entero mayor a 0.')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Guardar precios' })).toBeDisabled()
    expect(repository.updatePrices).not.toHaveBeenCalled()
  })

  it('publishes «Consultar en barra» only through its explicit checkbox, as null', async () => {
    const repository = await renderEditor()
    const card = productCard('Muzzarella')

    fireEvent.click(within(card).getByRole('checkbox', { name: 'Consultar en barra: Entera de Muzzarella' }))
    expect(within(card).getByLabelText('Precio Entera de Muzzarella')).toBeDisabled()
    await act(async () => fireEvent.click(within(card).getByRole('button', { name: 'Guardar precios' })))

    expect(repository.updatePrices).toHaveBeenCalledWith('p-muzza', [{ variantId: 'v-entera', price: null, updatedAt: T0 }])
  })

  it('explains a conflict and offers to reload the catalog', async () => {
    const repository = await renderEditor(
      fakeRepository({ updatePrices: vi.fn().mockRejectedValue(new AdminSaveError('conflict', 'stale')) }),
    )
    const card = productCard('Muzzarella')

    fireEvent.change(within(card).getByLabelText('Precio Entera de Muzzarella'), { target: { value: '17000' } })
    await act(async () => fireEvent.click(within(card).getByRole('button', { name: 'Guardar precios' })))

    expect(within(card).getByRole('alert')).toHaveTextContent('Otro cambio llegó antes. Recargá el catálogo para ver lo último.')
    await act(async () => fireEvent.click(within(card).getByRole('button', { name: 'Recargar catálogo' })))
    expect(repository.load).toHaveBeenCalledTimes(2)
  })

  it('offers «Reintentar» when the save could not reach the service, and retries the same change', async () => {
    const updatePrices = vi
      .fn()
      .mockRejectedValueOnce(new AdminSaveError('unavailable', 'offline'))
      .mockResolvedValue([{ id: 'v-entera', price: 17000, updatedAt: T1 }])
    const repository = await renderEditor(fakeRepository({ updatePrices }))
    const card = productCard('Muzzarella')

    fireEvent.change(within(card).getByLabelText('Precio Entera de Muzzarella'), { target: { value: '17000' } })
    await act(async () => fireEvent.click(within(card).getByRole('button', { name: 'Guardar precios' })))
    expect(within(card).getByRole('alert')).toHaveTextContent('No pudimos guardar. Revisá tu conexión e intentá de nuevo.')

    await act(async () => fireEvent.click(within(card).getByRole('button', { name: 'Reintentar' })))
    expect(repository.updatePrices).toHaveBeenCalledTimes(2)
    expect(within(card).getByRole('status')).toHaveTextContent('Guardado')
  })
})

describe('CatalogEditor: stock and visibility (RF-34, RF-31)', () => {
  it('marks a product out of stock with one tap, saving with its token', async () => {
    const repository = await renderEditor()
    const card = productCard('Muzzarella')

    await act(async () => fireEvent.click(within(card).getByRole('checkbox', { name: 'Sin stock: Muzzarella' })))

    expect(repository.updateProduct).toHaveBeenCalledWith('p-muzza', { outOfStock: true }, T0)
    expect(within(card).getByRole('checkbox', { name: 'Sin stock: Muzzarella' })).toBeChecked()
  })

  it('shows a hidden product again', async () => {
    const repository = await renderEditor()

    await act(async () => fireEvent.click(within(productCard('Napolitana')).getByRole('checkbox', { name: 'Visible: Napolitana' })))

    expect(repository.updateProduct).toHaveBeenCalledWith('p-napo', { visible: true }, T0)
  })

  it('warns how many products a hidden category hides, and saves it', async () => {
    const repository = await renderEditor()
    const toggle = screen.getByRole('checkbox', { name: 'Visible: categoría Pizzas' })

    expect(toggle).toHaveAccessibleDescription('Si la ocultás, también se ocultan sus 2 productos.')
    await act(async () => fireEvent.click(toggle))

    expect(repository.updateCategory).toHaveBeenCalledWith('cat-pizzas', { visible: false }, T0)
  })
})

describe('CatalogEditor: product data (RF-32, RF-35) and category name (RF-31)', () => {
  function openProductForm(name: string) {
    fireEvent.click(within(productCard(name)).getByRole('button', { name: `Editar datos de ${name}` }))
    return screen.getByRole('form', { name: `Datos de ${name}` })
  }

  it('saves name, description, and made-to-order with its notice, normalized', async () => {
    const repository = await renderEditor()
    const form = openProductForm('Muzzarella')

    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: '  Muzza  ' } })
    fireEvent.change(within(form).getByLabelText('Descripción'), { target: { value: '   ' } })
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Solo por encargo' }))
    fireEvent.change(within(form).getByLabelText('Aviso de anticipación'), { target: { value: ' Un día antes. ' } })
    await act(async () => fireEvent.click(within(form).getByRole('button', { name: 'Guardar datos' })))

    expect(repository.updateProduct).toHaveBeenCalledWith(
      'p-muzza',
      { name: 'Muzza', description: null, madeToOrder: true, madeToOrderNotice: 'Un día antes.' },
      T0,
    )
  })

  it('refuses a blank name and a made-to-order product without notice', async () => {
    const repository = await renderEditor()
    const form = openProductForm('Muzzarella')

    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: '   ' } })
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Solo por encargo' }))
    await act(async () => fireEvent.click(within(form).getByRole('button', { name: 'Guardar datos' })))

    expect(within(form).getByText('El nombre no puede quedar vacío.')).toBeInTheDocument()
    expect(within(form).getByText('Escribí el aviso de anticipación.')).toBeInTheDocument()
    expect(repository.updateProduct).not.toHaveBeenCalled()
  })

  it('renames a category, trimmed, and refuses a blank name', async () => {
    const repository = await renderEditor()
    const input = screen.getByLabelText('Nombre de la categoría Pizzas')

    fireEvent.change(input, { target: { value: '   ' } })
    expect(screen.getByText('El nombre no puede quedar vacío.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar nombre de Pizzas' })).toBeDisabled()

    fireEvent.change(input, { target: { value: ' Pizzas a la piedra ' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre de Pizzas' })))
    expect(repository.updateCategory).toHaveBeenCalledWith('cat-pizzas', { name: 'Pizzas a la piedra' }, T0)
  })
})
