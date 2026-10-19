import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CatalogEditor } from './CatalogEditor'
import { AdminSaveError, type AdminCatalogRepository, type AdminCategory, type PriceChange } from './admin-catalog'

const categories: AdminCategory[] = [
  {
    id: 'c',
    name: 'Pizzas',
    visible: true,
    updatedAt: 't0',
    products: [
      {
        id: 'p',
        categoryId: 'c',
        name: 'Jamón',
        description: null,
        madeToOrder: false,
        madeToOrderNotice: null,
        visible: true,
        outOfStock: false,
        updatedAt: 't0',
        variants: [{ id: 'v', name: 'Entera', price: 1000, updatedAt: 't0' }],
      },
    ],
  },
]
const repo = (): AdminCatalogRepository => ({
  load: vi.fn(async () => categories),
  updateProduct: vi.fn(async (_id, changes) => ({ ...categories[0].products[0], ...changes, updatedAt: 't1' })),
  updatePrices: vi.fn(async (_id: string, changes: PriceChange[]) =>
    changes.map((c) => ({ id: c.variantId, price: c.price, updatedAt: 't1' })),
  ),
  updateCategory: vi.fn(async (_id, changes) => ({ ...categories[0], ...changes, updatedAt: 't1' })),
})
async function start(repository = repo()) {
  render(<CatalogEditor repository={repository} />)
  await screen.findByRole('heading', { name: 'Jamón' })
  fireEvent.click(screen.getByRole('button', { name: 'Editar precios de Jamón' }))
  return repository
}

describe('catalog workspace', () => {
  it('searches without accents and retains price drafts while hidden by search', async () => {
    await start()
    fireEvent.change(screen.getByLabelText('Precio Entera de Jamón'), { target: { value: '1200' } })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar productos' }), { target: { value: 'otra' } })
    expect(screen.queryByRole('region', { name: 'Jamón' })).not.toBeInTheDocument()
    expect(screen.getByText('No encontramos productos')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pizzas' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar productos' }), { target: { value: 'JAMON' } })
    expect(screen.getByLabelText('Precio Entera de Jamón')).toHaveValue('1200')
  })
  it('keeps detail drafts after closing and immediate stock saves', async () => {
    const repository = await start()
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos de Jamón' }))
    fireEvent.change(within(screen.getByRole('form')).getByLabelText('Nombre'), { target: { value: 'Jamón nuevo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    await act(async () => fireEvent.click(screen.getByRole('checkbox', { name: 'Sin stock: Jamón' })))
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos de Jamón' }))
    expect(within(screen.getByRole('form')).getByLabelText('Nombre')).toHaveValue('Jamón nuevo')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar datos' })))
    expect(repository.updateProduct).toHaveBeenLastCalledWith(
      'p',
      expect.objectContaining({ name: 'Jamón nuevo' }),
      't1',
    )
  })
  it('confirms reload including invalid category drafts, and guards browser unload', async () => {
    const repository = await start()
    fireEvent.click(screen.getByText('Editar categoría'))
    fireEvent.change(screen.getByLabelText('Nombre de la categoría Pizzas'), { target: { value: '' } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Recargar catálogo' }))
    expect(confirm).toHaveBeenCalled()
    expect(repository.load).toHaveBeenCalledTimes(1)
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    confirm.mockRestore()
  })
})

describe('workspace filters and save isolation', () => {
  it('combines visibility, stock and attention filters and resets an empty result', async () => {
    await start()
    fireEvent.change(screen.getByLabelText('Visibilidad'), { target: { value: 'hidden' } })
    expect(screen.queryByRole('region', { name: 'Jamón' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    fireEvent.change(screen.getByLabelText('Disponibilidad'), { target: { value: 'out' } })
    expect(screen.queryByRole('region', { name: 'Jamón' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    fireEvent.change(screen.getByLabelText('Revisar'), { target: { value: 'order' } })
    expect(screen.queryByRole('region', { name: 'Jamón' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    fireEvent.change(screen.getByLabelText('Precio Entera de Jamón'), { target: { value: '1200' } })
    fireEvent.change(screen.getByLabelText('Revisar'), { target: { value: 'pending' } })
    expect(screen.getByRole('region', { name: 'Jamón' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar precios' }))
    expect(screen.queryByRole('region', { name: 'Jamón' })).not.toBeInTheDocument()
  })

  it('retains data drafts when prices are saved and only discards the selected group', async () => {
    await start()
    fireEvent.change(screen.getByLabelText('Precio Entera de Jamón'), { target: { value: '1200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos de Jamón' }))
    fireEvent.change(within(screen.getByRole('form')).getByLabelText('Descripción'), {
      target: { value: 'Nueva descripción' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar precios' })))
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos de Jamón' }))
    expect(within(screen.getByRole('form')).getByLabelText('Descripción')).toHaveValue('Nueva descripción')
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(within(screen.getByRole('form')).getByLabelText('Descripción')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.getByLabelText('Precio Entera de Jamón')).toHaveValue('1.200')
    expect(screen.queryByText('Datos pendientes')).not.toBeInTheDocument()
  })

  it('locks editing and reload during a deferred save and reports pending work to the shell', async () => {
    const repository = repo()
    let resolve!: (value: Awaited<ReturnType<AdminCatalogRepository['updatePrices']>>) => void
    repository.updatePrices = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<AdminCatalogRepository['updatePrices']>>>((done) => {
          resolve = done
        }),
    )
    const report = vi.fn()
    render(<CatalogEditor repository={repository} onWorkChange={report} />)
    await screen.findByRole('heading', { name: 'Jamón' })
    fireEvent.click(screen.getByRole('button', { name: 'Editar precios de Jamón' }))
    fireEvent.change(screen.getByLabelText('Precio Entera de Jamón'), { target: { value: '1200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar precios' }))
    expect(screen.getByLabelText('Precio Entera de Jamón')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descartar precios' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Sin stock: Jamón' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Recargar catálogo' })).toBeDisabled()
    expect(report).toHaveBeenLastCalledWith({ dirty: true, saving: true })
    await act(async () => resolve([{ id: 'v', price: 1200, updatedAt: 't1' }]))
    expect(report).toHaveBeenLastCalledWith({ dirty: false, saving: false })
  })

  it('preserves drafts across category navigation and includes hidden-by-category products', async () => {
    const repository = repo()
    repository.load = vi.fn(async () => [
      ...categories,
      {
        id: 'b',
        name: 'Bebidas',
        visible: false,
        updatedAt: 't0',
        products: [
          {
            ...categories[0].products[0],
            id: 'water',
            name: 'Agua',
            categoryId: 'b',
            variants: [{ id: 'w', name: 'Unidad', price: null, updatedAt: 't0' }],
          },
        ],
      },
    ])
    await start(repository)
    fireEvent.change(screen.getByLabelText('Precio Entera de Jamón'), { target: { value: '1200' } })
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Categorías del catálogo' })).getByRole('button', {
        name: /Bebidas/,
      }),
    )
    expect(screen.queryByRole('region', { name: 'Jamón' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Visibilidad'), { target: { value: 'hidden' } })
    fireEvent.change(screen.getByLabelText('Revisar'), { target: { value: 'consult' } })
    expect(screen.getByRole('region', { name: 'Agua' })).toHaveTextContent('Oculto por categoría')
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getByLabelText('Precio Entera de Jamón')).toHaveValue('1200')
  })
})

it('starts with a compact price summary and preserves drafts when its editor closes', async () => {
  render(<CatalogEditor repository={repo()} />)
  await screen.findByRole('heading', { name: 'Jamón' })
  expect(screen.queryByRole('textbox', { name: 'Precio Entera de Jamón' })).not.toBeInTheDocument()
  expect(screen.getByText('$1.000')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Editar precios de Jamón' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Precio Entera de Jamón' }), { target: { value: '1200' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar precios de Jamón' }))
  expect(screen.queryByRole('textbox', { name: 'Precio Entera de Jamón' })).not.toBeInTheDocument()
  expect(screen.getByText('Precios pendientes')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Editar precios de Jamón' }))
  expect(screen.getByRole('textbox', { name: 'Precio Entera de Jamón' })).toHaveValue('1200')
})

it('keeps a failed save visible when search would otherwise hide the product', async () => {
  const repository = repo()
  repository.updatePrices = vi.fn().mockRejectedValue(new AdminSaveError('conflict', 'stale'))
  await start(repository)
  fireEvent.change(screen.getByLabelText('Precio Entera de Jamón'), { target: { value: '1200' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar precios' })))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar productos' }), { target: { value: 'otra' } })
  expect(screen.getByRole('region', { name: 'Jamón' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Otro cambio llegó antes')
  expect(screen.getByLabelText('Precio Entera de Jamón')).toHaveValue('1200')
})
