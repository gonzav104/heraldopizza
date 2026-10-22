import { describe, expect, it } from 'vitest'
import { CatalogDataError, mapCatalogRows, mapPromotionRows } from '@/data/catalog-mapper'

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

  it.each([
    ['an empty', ''],
    ['a blank', '   '],
  ])('treats %s description as no description, so one cleared field cannot take the menu down', (_label, descripcion) => {
    const body = [{ ...row, productos: [{ ...row.productos[0], descripcion }] }]

    expect(mapCatalogRows(body).products[0].description).toBeNull()
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

describe('mapPromotionRows (P5a)', () => {
  const promo = {
    codigo: 'promo-muzza-6-empanadas',
    titulo: 'Muzza + 6 empanadas surtidas',
    descripcion: 'No son a elección.',
    precio: 32000,
    orden: 1,
    vigente_desde: null,
    vigente_hasta: null,
    dias_semana: null,
    eleccion_categoria_id: null,
    eleccion_unidades: null,
  }

  it('maps a row to a promotion whose id is the commercial code, with no image and no flavor choice', () => {
    expect(mapPromotionRows([promo])).toEqual([
      {
        id: 'promo-muzza-6-empanadas',
        title: 'Muzza + 6 empanadas surtidas',
        description: 'No son a elección.',
        price: 32000,
        imageUrl: null,
        activeFrom: null,
        activeTo: null,
        weekdays: [],
        // Absent, not undefined: a closed combo.
      },
    ])
    expect(mapPromotionRows([promo])[0]).not.toHaveProperty('flavorChoice')
  })

  it('keeps validity dates and weekdays as given, and the flavor choice of the dozen', () => {
    const [mapped] = mapPromotionRows([
      { ...promo, vigente_desde: '2026-11-01', vigente_hasta: '2026-11-30', dias_semana: [5, 6, 0], eleccion_categoria_id: 'cat-emp', eleccion_unidades: 12 },
    ])
    expect(mapped).toMatchObject({ activeFrom: '2026-11-01', activeTo: '2026-11-30', weekdays: [5, 6, 0], flavorChoice: { categoryId: 'cat-emp', units: 12 } })
  })

  it('sorts by the menu order, then by code', () => {
    const rows = [
      { ...promo, codigo: 'promo-b', orden: 2 },
      { ...promo, codigo: 'promo-c', orden: 1 },
      { ...promo, codigo: 'promo-a', orden: 2 },
    ]
    expect(mapPromotionRows(rows).map((item) => item.id)).toEqual(['promo-c', 'promo-a', 'promo-b'])
  })

  it.each([
    ['a list that is not a list', { codigo: 'promo-x' }],
    ['a code with another shape', [{ ...promo, codigo: 'Promo X' }]],
    ['a repeated code', [promo, { ...promo }]],
    ['a blank title', [{ ...promo, titulo: '  ' }]],
    ['a missing price', [{ ...promo, precio: null }]],
    ['a zero price', [{ ...promo, precio: 0 }]],
    ['a fractional price', [{ ...promo, precio: 1000.5 }]],
    ['a date that is not a date', [{ ...promo, vigente_desde: '01/11/2026' }]],
    ['a weekday out of range', [{ ...promo, dias_semana: [7] }]],
    ['an empty weekday list', [{ ...promo, dias_semana: [] }]],
    ['a repeated weekday', [{ ...promo, dias_semana: [1, 1] }]],
    ['a flavor choice with only its category', [{ ...promo, eleccion_categoria_id: 'cat-emp' }]],
    ['a flavor choice with zero units', [{ ...promo, eleccion_categoria_id: 'cat-emp', eleccion_unidades: 0 }]],
  ])('rejects %s instead of guessing', (_, rows) => {
    expect(() => mapPromotionRows(rows)).toThrow(CatalogDataError)
  })
})
