import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { AdminSaveError } from '@/features/admin/catalog/admin-catalog'
import { SupabaseAdminCatalog } from '@/features/admin/catalog/supabase-admin-catalog'

type Result = { data: unknown; error: unknown }

/** A chainable stand-in for the supabase-js query builder that records every call and resolves to `result`. */
function fakeClient(result: Result) {
  const calls: { method: string; args: unknown[] }[] = []
  const builder: Record<string, unknown> = {}
  for (const method of ['from', 'select', 'update', 'eq', 'order']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  }
  builder.then = (resolve: (value: Result) => void) => resolve(result)
  const client = {
    from: (...args: unknown[]) => {
      calls.push({ method: 'from', args })
      return builder
    },
    rpc: async (...args: unknown[]) => {
      calls.push({ method: 'rpc', args })
      return result
    },
  }
  return { calls, catalog: new SupabaseAdminCatalog(client as unknown as SupabaseClient) }
}

const token = '2026-10-17T12:00:00.123456+00:00'

const row = {
  id: 'cat-1',
  nombre: 'Pizzas',
  orden: 1,
  visible: false,
  actualizado_en: token,
  productos: [
    {
      id: 'p-2',
      nombre: 'Napolitana',
      descripcion: null,
      solo_por_encargo: false,
      aviso_encargo: null,
      sin_stock: true,
      visible: true,
      orden: 2,
      actualizado_en: token,
      variantes: [
        { id: 'v-m', nombre: 'Media', precio: null, orden: 2, actualizado_en: token },
        { id: 'v-e', nombre: 'Entera', precio: 21000, orden: 1, actualizado_en: token },
      ],
    },
    {
      id: 'p-1',
      nombre: 'Muzzarella',
      descripcion: 'Clásica',
      solo_por_encargo: true,
      aviso_encargo: 'Un día antes.',
      sin_stock: false,
      visible: false,
      orden: 1,
      actualizado_en: token,
      variantes: [],
    },
  ],
}

function eqs(calls: { method: string; args: unknown[] }[]) {
  return calls.filter((call) => call.method === 'eq').map((call) => call.args)
}

describe('SupabaseAdminCatalog.load', () => {
  it('reads every category, product, and variant, hidden ones included, in menu order', async () => {
    const { catalog, calls } = fakeClient({ data: [row], error: null })

    const [category] = await catalog.load()

    expect(calls[0]).toEqual({ method: 'from', args: ['categorias'] })
    const select = calls.find((call) => call.method === 'select')?.args[0] as string
    expect(select).not.toContain('*')
    expect(select).toContain('actualizado_en')
    expect(category).toMatchObject({ id: 'cat-1', name: 'Pizzas', visible: false, updatedAt: token })
    expect(category.products.map((product) => product.id)).toEqual(['p-1', 'p-2'])
    expect(category.products[1]).toEqual({
      id: 'p-2',
      categoryId: 'cat-1',
      name: 'Napolitana',
      description: null,
      madeToOrder: false,
      madeToOrderNotice: null,
      outOfStock: true,
      visible: true,
      updatedAt: token,
      variants: [
        { id: 'v-e', name: 'Entera', price: 21000, updatedAt: token },
        { id: 'v-m', name: 'Media', price: null, updatedAt: token },
      ],
    })
  })

  it('keeps the token as the exact text the database returned', async () => {
    const { catalog } = fakeClient({ data: [row], error: null })

    const [category] = await catalog.load()

    expect(category.products[0].variants).toEqual([])
    expect(category.updatedAt).toBe('2026-10-17T12:00:00.123456+00:00')
  })
})

describe('SupabaseAdminCatalog.updateProduct', () => {
  const saved = { ...row.productos[1], categoria_id: 'cat-1' }

  it('sends only the editable columns, guarded by id and token, and returns the saved row', async () => {
    const { catalog, calls } = fakeClient({ data: [saved], error: null })

    const product = await catalog.updateProduct(
      'p-1',
      { name: 'Muzza', description: null, madeToOrder: true, madeToOrderNotice: 'Un día antes.', outOfStock: false, visible: false },
      token,
    )

    expect(calls[0]).toEqual({ method: 'from', args: ['productos'] })
    const payload = calls.find((call) => call.method === 'update')?.args[0] as Record<string, unknown>
    expect(payload).toEqual({
      nombre: 'Muzza',
      descripcion: null,
      solo_por_encargo: true,
      aviso_encargo: 'Un día antes.',
      sin_stock: false,
      visible: false,
    })
    expect(Object.keys(payload)).not.toEqual(expect.arrayContaining(['id']))
    expect(eqs(calls)).toEqual([
      ['id', 'p-1'],
      ['actualizado_en', token],
    ])
    expect(product).toMatchObject({ id: 'p-1', name: 'Muzzarella', updatedAt: token })
  })

  it('sends only the fields that changed', async () => {
    const { catalog, calls } = fakeClient({ data: [saved], error: null })

    await catalog.updateProduct('p-1', { outOfStock: true }, token)

    expect(calls.find((call) => call.method === 'update')?.args[0]).toEqual({ sin_stock: true })
  })

  it('treats zero updated rows as a conflict, never as success', async () => {
    const { catalog } = fakeClient({ data: [], error: null })

    await expect(catalog.updateProduct('p-1', { visible: true }, token)).rejects.toMatchObject({ reason: 'conflict' })
  })

  it('reports a database rule violation as a validation error', async () => {
    const { catalog } = fakeClient({ data: null, error: { code: '23514', message: 'check' } })

    await expect(catalog.updateProduct('p-1', { name: ' ' }, token)).rejects.toMatchObject({ reason: 'validation' })
  })

  it('reports a missing permission as forbidden', async () => {
    const { catalog } = fakeClient({ data: null, error: { code: '42501', message: 'denied' } })

    await expect(catalog.updateProduct('p-1', { visible: true }, token)).rejects.toMatchObject({ reason: 'forbidden' })
  })

  it('reports a network failure as unavailable', async () => {
    const { catalog } = fakeClient({ data: null, error: { message: 'TypeError: Failed to fetch' } })

    await expect(catalog.updateProduct('p-1', { visible: true }, token)).rejects.toMatchObject({ reason: 'unavailable' })
  })
})

describe('SupabaseAdminCatalog.updateCategory', () => {
  it('sends only name and visibility, guarded by id and token', async () => {
    const { catalog, calls } = fakeClient({ data: [{ id: 'cat-1', nombre: 'Pizzas', visible: true, actualizado_en: token }], error: null })

    const category = await catalog.updateCategory('cat-1', { name: 'Pizzas', visible: true }, token)

    expect(calls[0]).toEqual({ method: 'from', args: ['categorias'] })
    expect(calls.find((call) => call.method === 'update')?.args[0]).toEqual({ nombre: 'Pizzas', visible: true })
    expect(eqs(calls)).toEqual([
      ['id', 'cat-1'],
      ['actualizado_en', token],
    ])
    expect(category).toEqual({ id: 'cat-1', name: 'Pizzas', visible: true, updatedAt: token })
  })
})

describe('SupabaseAdminCatalog.updatePrices', () => {
  it('calls actualizar_precios_producto with every change and returns the renewed tokens', async () => {
    const renewed = '2026-10-17T12:05:00.654321+00:00'
    const { catalog, calls } = fakeClient({
      data: [
        { id: 'v-e', precio: 17000, actualizado_en: renewed },
        { id: 'v-m', precio: null, actualizado_en: renewed },
      ],
      error: null,
    })

    const variants = await catalog.updatePrices('p-2', [
      { variantId: 'v-e', price: 17000, updatedAt: token },
      { variantId: 'v-m', price: null, updatedAt: token },
    ])

    expect(calls).toEqual([
      {
        method: 'rpc',
        args: [
          'actualizar_precios_producto',
          {
            p_producto: 'p-2',
            p_precios: [
              { id: 'v-e', precio: 17000, actualizado_en: token },
              { id: 'v-m', precio: null, actualizado_en: token },
            ],
          },
        ],
      },
    ])
    expect(variants).toEqual([
      { id: 'v-e', price: 17000, updatedAt: renewed },
      { id: 'v-m', price: null, updatedAt: renewed },
    ])
  })

  it.each([
    ['HP422', 'validation'],
    ['HP404', 'not-found'],
    ['HP409', 'conflict'],
    ['HP403', 'forbidden'],
    ['42501', 'forbidden'],
    [undefined, 'unavailable'],
  ])('maps the database answer %s to %s', async (code, reason) => {
    const { catalog } = fakeClient({ data: null, error: { code, message: 'x' } })

    const failure = catalog.updatePrices('p-2', [{ variantId: 'v-e', price: 1, updatedAt: token }])
    await expect(failure).rejects.toBeInstanceOf(AdminSaveError)
    await expect(failure).rejects.toMatchObject({ reason })
  })
})
