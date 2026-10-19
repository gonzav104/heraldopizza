import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
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
it('preserves acknowledged stock and product token after retrying a failed price save', async () => {
  let product = structuredClone(categories[0].products[0])
  let rejectFirstPrice = true
  const repository = repo()
  repository.load = vi.fn(async () => [{ ...categories[0], products: [structuredClone(product)] }])
  repository.updateProduct = vi.fn(async (_id, changes, updatedAt) => {
    if (updatedAt !== product.updatedAt) throw new AdminSaveError('conflict', 'stale product token')
    product = { ...product, ...changes, updatedAt: 't1' }
    return structuredClone(product)
  })
  repository.updatePrices = vi.fn(async (_id: string, changes: PriceChange[]) => {
    if (rejectFirstPrice) {
      rejectFirstPrice = false
      throw new AdminSaveError('unavailable', 'offline')
    }
    const saved = changes.map((c) => ({ id: c.variantId, price: c.price, updatedAt: 'v1' }))
    product.variants = product.variants.map((v) => ({ ...v, ...saved.find((s) => s.id === v.id) }))
    return saved
  })
  render(<CatalogEditor repository={repository} />)
  await screen.findByRole('heading', { name: 'Jamón' })
  fireEvent.click(screen.getByRole('button', { name: 'Editar precios de Jamón' }))
  fireEvent.change(screen.getByLabelText('Precio Entera de Jamón'), { target: { value: '1200' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar precios' })))
  expect(product.variants[0].price).toBe(1000)
  await act(async () => fireEvent.click(screen.getByRole('checkbox', { name: 'Sin stock: Jamón' })))
  expect(product.outOfStock).toBe(true)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })))
  expect(product.variants[0].price).toBe(1200)
  expect(product.outOfStock).toBe(true)
  expect.soft(screen.getByRole('checkbox', { name: 'Sin stock: Jamón' })).toBeChecked()
  await act(async () => fireEvent.click(screen.getByRole('checkbox', { name: 'Visible: Jamón' })))
  expect(repository.updateProduct).toHaveBeenLastCalledWith('p', { visible: false }, 't1')
})

it('preserves acknowledged prices after retrying a failed status save', async () => {
  let product = structuredClone(categories[0].products[0])
  let rejectFirstStatus = true
  const repository = repo()
  repository.load = vi.fn(async () => [{ ...categories[0], products: [structuredClone(product)] }])
  repository.updateProduct = vi.fn(async (_id, changes, updatedAt) => {
    if (rejectFirstStatus) {
      rejectFirstStatus = false
      throw new AdminSaveError('unavailable', 'offline')
    }
    if (updatedAt !== product.updatedAt) throw new AdminSaveError('conflict', 'stale product token')
    product = { ...product, ...changes, updatedAt: 't1' }
    return structuredClone(product)
  })
  repository.updatePrices = vi.fn(async (_id: string, changes: PriceChange[]) => {
    const saved = changes.map((c) => ({ id: c.variantId, price: c.price, updatedAt: 'v1' }))
    product.variants = product.variants.map((v) => ({ ...v, ...saved.find((s) => s.id === v.id) }))
    return saved
  })
  render(<CatalogEditor repository={repository} />)
  await screen.findByRole('heading', { name: 'Jamón' })
  fireEvent.click(screen.getByRole('button', { name: 'Editar precios de Jamón' }))
  await act(async () => fireEvent.click(screen.getByRole('checkbox', { name: 'Sin stock: Jamón' })))
  expect(product.outOfStock).toBe(false)
  fireEvent.change(screen.getByLabelText('Precio Entera de Jamón'), { target: { value: '1200' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Guardar precios' })))
  expect(product.variants[0].price).toBe(1200)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })))
  expect(product.outOfStock).toBe(true)
  expect(product.variants[0].price).toBe(1200)
  expect(screen.getByLabelText('Precio Entera de Jamón')).toHaveValue('1.200')
})
