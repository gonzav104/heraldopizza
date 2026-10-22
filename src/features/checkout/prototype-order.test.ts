import { describe, expect, it } from 'vitest'
import type { Product } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { indexCatalog, reconcileOrder } from '@/features/cart/line-pricing'
import type { OrderLine } from '@/features/cart/order-lines'
import {
  OTHER_ZONE,
  buildOrderMessage,
  computeTotals,
  emptyCheckout,
  paymentOptions,
  totalsSummary,
  validateCheckout,
  withMode,
  zoneOptions,
  type CheckoutDetails,
  type OrderTotals,
  type ZoneOption,
} from './prototype-order'

const product = (name: string): Product => {
  const found = prototypeProducts.find((item) => item.name === name)
  if (!found) throw new Error(name)
  return found
}
const variantId = (name: string, variantName: string) => {
  const found = product(name).variants.find((item) => item.name === variantName)
  if (!found) throw new Error(`${name} ${variantName}`)
  return found.id
}

const index = indexCatalog(prototypeCategories, prototypeProducts, [])
const known = (productsSubtotal: number, pizzaCount: number) => ({ productsSubtotal, pizzaCount, pizzasToConfirm: false })
// Intl uses a no-break space after "$"; compare with plain spaces.
const plain = (text: string) => text.replace(/\u00a0/g, ' ')

const delivery: CheckoutDetails = {
  name: 'Ana Gómez',
  mode: 'envio',
  address: 'Rivadavia 100',
  zoneId: OTHER_ZONE.id,
  payment: 'efectivo',
  note: '',
}

describe('paymentOptions (RN-11, RF-57)', () => {
  it('offers only cash and transfer for delivery', () => {
    expect(paymentOptions('envio').map((option) => option.id)).toEqual(['efectivo', 'transferencia'])
  })

  it('adds debit and credit for pickup, with the credit surcharge shown', () => {
    const options = paymentOptions('retiro')
    expect(options.map((option) => option.id)).toEqual(['efectivo', 'transferencia', 'debito', 'credito'])
    expect(options.find((option) => option.id === 'credito')?.note).toBe('+8 %')
  })
})

describe('zoneOptions', () => {
  it('holds only the pinned "Otra zona (a consultar)" until the real list exists (RF-63)', () => {
    expect(zoneOptions).toEqual([OTHER_ZONE])
    expect(OTHER_ZONE.label).toBe('Otra zona (a consultar)')
    expect(OTHER_ZONE.cost).toBeNull()
  })
})

describe('withMode', () => {
  it('clears card payments when switching to delivery', () => {
    expect(withMode({ ...delivery, mode: 'retiro', payment: 'credito' }, 'envio').payment).toBeNull()
    expect(withMode({ ...delivery, mode: 'retiro', payment: 'debito' }, 'envio').payment).toBeNull()
  })

  it('keeps payments that stay valid', () => {
    expect(withMode({ ...delivery, mode: 'retiro', payment: 'transferencia' }, 'envio').payment).toBe('transferencia')
    expect(withMode(delivery, 'retiro').payment).toBe('efectivo')
  })
})

describe('validateCheckout', () => {
  it('requires name, mode, and payment', () => {
    expect(Object.keys(validateCheckout(emptyCheckout)).sort()).toEqual(['mode', 'name', 'payment'])
  })

  it('treats a blank name as missing', () => {
    expect(validateCheckout({ ...delivery, name: '   ' }).name).toBeDefined()
  })

  it('asks for first and last name, not a single word', () => {
    expect(validateCheckout({ ...delivery, name: 'Ana' }).name).toBe('Escribí tu nombre y apellido.')
    expect(validateCheckout({ ...delivery, name: 'Ana Gómez' }).name).toBeUndefined()
    expect(validateCheckout({ ...delivery, name: '  María   de los Ángeles Pérez ' }).name).toBeUndefined()
  })

  it('requires address and zone only for delivery', () => {
    const errors = validateCheckout({ ...delivery, address: ' ', zoneId: null })
    expect(Object.keys(errors).sort()).toEqual(['address', 'zone'])
    expect(validateCheckout({ ...delivery, mode: 'retiro', address: '', zoneId: null })).toEqual({})
  })

  it('rejects a card payment on delivery', () => {
    expect(validateCheckout({ ...delivery, payment: 'credito' }).payment).toBeDefined()
  })

  it('accepts a complete delivery order', () => {
    expect(validateCheckout(delivery)).toEqual({})
  })
})

describe('computeTotals', () => {
  it('adds $ 1.000 per pizza on delivery and leaves the shipping cost to confirm (RN-15, RF-62)', () => {
    expect(computeTotals(known(47000, 2), delivery)).toEqual({
      products: 47000,
      pizzaSurcharge: { count: 2, unit: 1000, amount: 2000 },
      promoPizzasToConfirm: false,
      shipping: { kind: 'to-confirm' },
      creditSurcharge: null,
      total: 49000,
      complete: false,
    })
  })

  it('adds no pizza surcharge on delivery without pizzas', () => {
    expect(computeTotals(known(6000, 0), delivery).pizzaSurcharge).toBeNull()
  })

  it('adds no delivery charges for pickup, and the total is complete', () => {
    expect(computeTotals(known(16000, 1), { ...delivery, mode: 'retiro' })).toEqual({
      products: 16000,
      pizzaSurcharge: null,
      promoPizzasToConfirm: false,
      shipping: { kind: 'none' },
      creditSurcharge: null,
      total: 16000,
      complete: true,
    })
  })

  it('leaves the shipping to confirm while no zone is chosen', () => {
    expect(computeTotals(known(16000, 1), { ...delivery, zoneId: null }).shipping).toEqual({ kind: 'to-confirm' })
  })

  it('adds a zone cost once the zone has one (data shape only: no real zone has a cost yet)', () => {
    const zone: ZoneOption = { id: 'zona-con-costo', label: 'Zona de prueba', pinned: false, cost: 2500 }
    const totals = computeTotals(known(16000, 1), { ...delivery, zoneId: zone.id }, [zone, OTHER_ZONE])
    expect(totals.shipping).toEqual({ kind: 'amount', amount: 2500 })
    expect(totals.total).toBe(16000 + 1000 + 2500)
    expect(totals.complete).toBe(true)
  })

  it('keeps the pizzas of promotions with an unknown count out of the total, and says so', () => {
    const totals = computeTotals({ productsSubtotal: 50000, pizzaCount: 1, pizzasToConfirm: true }, delivery)
    expect(totals.pizzaSurcharge).toEqual({ count: 1, unit: 1000, amount: 1000 })
    expect(totals.promoPizzasToConfirm).toBe(true)
    expect(totals.total).toBe(51000)
    expect(totals.complete).toBe(false)
  })

  it('ignores unknown promo pizzas for pickup: there is no surcharge to confirm', () => {
    const totals = computeTotals({ productsSubtotal: 50000, pizzaCount: 1, pizzasToConfirm: true }, { ...delivery, mode: 'retiro' })
    expect(totals.promoPizzasToConfirm).toBe(false)
    expect(totals.complete).toBe(true)
  })

  it('applies the 8 % credit surcharge on products only, in whole pesos rounded to the nearest (RN-17)', () => {
    const pickup = { ...delivery, mode: 'retiro' as const, payment: 'credito' as const }
    expect(computeTotals(known(10010, 1), pickup)).toMatchObject({ creditSurcharge: 801, total: 10811 })
    // 10.006 × 8 % = 800,48 → 800; 10.025 × 8 % = 802 exactly.
    expect(computeTotals(known(10006, 0), pickup).creditSurcharge).toBe(800)
    expect(computeTotals(known(10025, 0), pickup).creditSurcharge).toBe(802)
  })

  it('never applies the credit surcharge on delivery, even if a stale state still says credit', () => {
    const totals = computeTotals(known(20000, 2), { ...delivery, payment: 'credito' })
    expect(totals.creditSurcharge).toBeNull()
    expect(totals.total).toBe(22000)
  })

  it('switching to delivery and back keeps the totals consistent with the mode', () => {
    let details: CheckoutDetails = { ...delivery, mode: 'retiro', payment: 'credito' }
    expect(computeTotals(known(20000, 2), details).total).toBe(21600)
    details = withMode(details, 'envio')
    expect(details.payment).toBeNull()
    expect(computeTotals(known(20000, 2), details).total).toBe(22000)
    details = withMode(details, 'retiro')
    expect(computeTotals(known(20000, 2), details).total).toBe(20000)
  })
})

describe('totalsSummary: the rows shared by the summary card and the message', () => {
  const rows = (totals: OrderTotals) => totalsSummary(totals).rows.map(({ label, value }) => plain(`${label}: ${value}`))

  it('lists products, each surcharge, and what is still to confirm', () => {
    const totals = computeTotals({ productsSubtotal: 60500, pizzaCount: 3, pizzasToConfirm: true }, delivery)
    expect(rows(totals)).toEqual([
      'Productos: $ 60.500',
      'Recargo por pizza (3 × $ 1.000): $ 3.000',
      'Recargo por pizzas de promos: A confirmar',
      'Envío: A confirmar',
    ])
    const summary = totalsSummary(totals)
    expect(summary.total).toEqual({ label: 'Total parcial', value: expect.stringContaining('63.500') })
    expect(summary.notes).toEqual([
      'No incluye el envío ni el recargo por pizzas de promos: el local los confirma.',
      'El local confirma el total.',
    ])
  })

  it('names a single exclusion in the singular', () => {
    expect(totalsSummary(computeTotals(known(16000, 1), delivery)).notes[0]).toBe('No incluye el envío: el local lo confirma.')
  })

  it('calls a total with nothing left out "Total orientativo"', () => {
    const summary = totalsSummary(computeTotals(known(35000, 0), { ...delivery, mode: 'retiro', payment: 'credito' }))
    expect(summary.rows.map((row) => row.label)).toEqual(['Productos', 'Recargo crédito 8 %'])
    expect(summary.total.label).toBe('Total orientativo')
    expect(summary.notes).toEqual(['El local confirma el total.'])
  })

  it('adds up to the total: the rows with an amount are exactly what the total holds', () => {
    const zone: ZoneOption = { id: 'z', label: 'Zona de prueba', pinned: false, cost: 3000 }
    for (const details of [delivery, { ...delivery, zoneId: zone.id }, { ...delivery, mode: 'retiro' as const, payment: 'credito' as const }]) {
      const totals = computeTotals({ productsSubtotal: 43210, pizzaCount: 2, pizzasToConfirm: true }, details, [zone, OTHER_ZONE])
      const sum = totalsSummary(totals).rows.reduce((total, row) => total + (row.amount ?? 0), 0)
      expect(sum).toBe(totals.total)
    }
  })
})

describe('buildOrderMessage', () => {
  it('writes a delivery order with notes, the pizza surcharge, and the shipping to confirm', () => {
    const lines: OrderLine[] = [
      {
        id: 'a',
        kind: 'product',
        productId: product('Muzzarella').id,
        variantId: variantId('Muzzarella', 'Entera'),
        quantity: 1,
        note: 'sin aceitunas',
      },
      {
        id: 'm',
        kind: 'product',
        productId: product('Especial').id,
        variantId: variantId('Especial', 'Media'),
        quantity: 1,
        note: '',
      },
      {
        id: 'b',
        kind: 'half',
        firstProductId: product('Muzzarella').id,
        secondProductId: product('Napolitana Heraldo').id,
        quantity: 1,
        note: '',
      },
      {
        id: 'c',
        kind: 'product',
        productId: product('Empanada de carne picada').id,
        variantId: variantId('Empanada de carne picada', 'Unidad'),
        quantity: 2,
        note: '',
      },
    ]
    const summary = reconcileOrder(lines, index)
    const message = buildOrderMessage(delivery, summary, computeTotals(summary, delivery))

    expect(plain(message)).toBe(
      [
        '*Pedido para Heraldo Pizza*',
        'Nombre: Ana Gómez',
        'Modalidad: Envío',
        'Dirección: Rivadavia 100',
        'Zona: Otra zona (a consultar)',
        '',
        '*Productos*',
        '• 1 × Muzzarella (Entera): $ 16.000',
        '  Aclaración: sin aceitunas',
        '• 1 × Media pizza de Especial: $ 13.500',
        '• 1 × Pizza mitad y mitad (Muzzarella + Napolitana Heraldo): $ 25.000',
        '• 2 × Empanada de carne picada: $ 6.000',
        '',
        'Productos: $ 60.500',
        'Recargo por pizza (3 × $ 1.000): $ 3.000',
        'Envío: A confirmar',
        '',
        'Pago: Efectivo',
        '',
        '*Total parcial: $ 63.500*',
        'No incluye el envío: el local lo confirma.',
        'El local confirma el total.',
      ].join('\n'),
    )
  })

  it('writes a pickup order with credit, made-to-order notice, and general note (RN-07)', () => {
    const details: CheckoutDetails = { ...emptyCheckout, name: ' Ana Gómez ', mode: 'retiro', payment: 'credito', note: 'Paso a las 21' }
    const lines: OrderLine[] = [
      { id: 'a', kind: 'product', productId: product('Ensaimada').id, variantId: variantId('Ensaimada', 'Grande'), quantity: 1, note: '' },
    ]
    const summary = reconcileOrder(lines, index)
    const message = buildOrderMessage(details, summary, computeTotals(summary, details))

    expect(plain(message)).toBe(
      [
        '*Pedido para Heraldo Pizza*',
        'Nombre: Ana Gómez',
        'Modalidad: Retiro',
        '',
        '*Productos*',
        '• 1 × Ensaimada (Grande): $ 35.000',
        '',
        'Productos: $ 35.000',
        'Recargo crédito 8 %: $ 2.800',
        '',
        'Pago: Crédito',
        'Por encargo: Ensaimada. Pedir con 1 o 2 días de anticipación.',
        'Nota: Paso a las 21',
        '',
        '*Total orientativo: $ 37.800*',
        'El local confirma el total.',
      ].join('\n'),
    )
  })

  it('counts the pizzas of a promotion by its confirmed count times the quantity, and flags unknown ones', () => {
    const promos = [
      { ...promoBase, id: 'conocida', title: 'Promo con dos pizzas', price: 30000, deliveryPizzas: 2 },
      { ...promoBase, id: 'desconocida', title: 'Promo sin confirmar', price: 20000, deliveryPizzas: null },
    ]
    const catalog = indexCatalog(prototypeCategories, prototypeProducts, promos)
    const summary = reconcileOrder(
      [
        { id: 'p1', kind: 'promotion', promotionId: 'conocida', quantity: 3, note: '' },
        { id: 'p2', kind: 'promotion', promotionId: 'desconocida', quantity: 1, note: '' },
      ],
      catalog,
    )
    const message = plain(buildOrderMessage(delivery, summary, computeTotals(summary, delivery)))

    expect(message).toContain('Recargo por pizza (6 × $ 1.000): $ 6.000')
    expect(message).toContain('Recargo por pizzas de promos: A confirmar')
    expect(message).toContain('*Total parcial: $ 116.000*')
    expect(message).toContain('No incluye el envío ni el recargo por pizzas de promos: el local los confirma.')
  })
})

const promoBase = { description: null, imageUrl: null, activeFrom: null, activeTo: null, weekdays: [] }
