import { describe, expect, it } from 'vitest'
import { CatalogDataError, mapCatalogRows } from '@/data/catalog-mapper'

const row = {
  id: 'cat-pizzas',
  nombre: 'Pizzas',
  orden: 1,
  recargo_envio: true,
  productos: [
    {
      id: 'p-napo',
      nombre: 'Napolitana',
      descripcion: 'Muzzarella, tomate y ajo',
      solo_por_encargo: false,
      aviso_encargo: null,
      sin_stock: true,
      orden: 2,
      variantes: [
        { id: 'v-napo-media', nombre: 'Media', precio: 12500, orden: 2 },
        { id: 'v-napo-entera', nombre: 'Entera', precio: 21000, orden: 1 },
      ],
    },
    {
      id: 'p-muzza',
      nombre: 'Muzzarella',
      descripcion: null,
      solo_por_encargo: false,
      aviso_encargo: null,
      sin_stock: false,
      orden: 1,
      variantes: [{ id: 'v-muzza-entera', nombre: 'Entera', precio: 16000, orden: 1 }],
    },
  ],
}

const bar = {
  id: 'cat-cafe',
  nombre: 'Cafetería',
  orden: 2,
  recargo_envio: false,
  productos: [
    {
      id: 'p-cafe',
      nombre: 'Café chico',
      descripcion: null,
      solo_por_encargo: false,
      aviso_encargo: null,
      sin_stock: false,
      orden: 1,
      variantes: [{ id: 'v-cafe', nombre: 'Unidad', precio: null, orden: 1 }],
    },
    {
      id: 'p-ensaimada',
      nombre: 'Ensaimada',
      descripcion: null,
      solo_por_encargo: true,
      aviso_encargo: 'Por encargo: pedir con 1 o 2 días de anticipación.',
      sin_stock: false,
      orden: 2,
      variantes: [{ id: 'v-ensaimada', nombre: 'Unidad', precio: 4000, orden: 1 }],
    },
  ],
}

function withVariantPrice(precio: unknown) {
  return [{ ...bar, productos: [{ ...bar.productos[0], variantes: [{ id: 'v', nombre: 'Unidad', precio, orden: 1 }] }] }]
}

describe('mapCatalogRows', () => {
  it('maps the database rows to the domain model, ordered by category, product, and variant', () => {
    const { categories, products } = mapCatalogRows([bar, row])

    expect(categories).toEqual([
      { id: 'cat-pizzas', name: 'Pizzas', order: 1, appliesDeliverySurcharge: true },
      { id: 'cat-cafe', name: 'Cafetería', order: 2, appliesDeliverySurcharge: false },
    ])
    expect(products.map((product) => product.id)).toEqual(['p-muzza', 'p-napo', 'p-cafe', 'p-ensaimada'])
    expect(products[1]).toEqual({
      id: 'p-napo',
      categoryId: 'cat-pizzas',
      name: 'Napolitana',
      description: 'Muzzarella, tomate y ajo',
      madeToOrderNotice: null,
      inStock: false,
      order: 2,
      variants: [
        { id: 'v-napo-entera', name: 'Entera', price: 21000 },
        { id: 'v-napo-media', name: 'Media', price: 12500 },
      ],
    })
  })

  it('keeps an unpublished price as null, never as 0 ("Consultar en barra")', () => {
    const cafe = mapCatalogRows([bar]).products.find((product) => product.id === 'p-cafe')

    expect(cafe?.variants).toEqual([{ id: 'v-cafe', name: 'Unidad', price: null }])
  })

  it('shows the advance notice only for made-to-order products', () => {
    const { products } = mapCatalogRows([bar])

    expect(products.find((product) => product.id === 'p-ensaimada')?.madeToOrderNotice).toBe(
      'Por encargo: pedir con 1 o 2 días de anticipación.',
    )
    expect(products.find((product) => product.id === 'p-cafe')?.madeToOrderNotice).toBeNull()
  })

  it('returns an empty menu for an empty response', () => {
    expect(mapCatalogRows([])).toEqual({ categories: [], products: [] })
  })

  it.each([
    ['zero', 0],
    ['negative', -500],
    ['decimal', 10.5],
    ['text', '16000'],
  ])('rejects a %s price instead of guessing a value', (_label, precio) => {
    expect(() => mapCatalogRows(withVariantPrice(precio))).toThrow(CatalogDataError)
  })

  it.each([
    ['a response that is not a list', { categorias: [] }],
    ['a category without its products', [{ ...row, productos: undefined }]],
    ['a product without its variants', [{ ...row, productos: [{ ...row.productos[0], variantes: null }] }]],
    ['a missing name', [{ ...row, nombre: undefined }]],
  ])('rejects %s', (_label, body) => {
    expect(() => mapCatalogRows(body)).toThrow(CatalogDataError)
  })
})
