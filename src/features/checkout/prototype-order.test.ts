import { describe, expect, it } from 'vitest'
import type { Product } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { prototypePromotions } from '@/data/prototype-promotions'
import { indexCatalog, reconcileOrder } from '@/features/cart/line-pricing'
import type { OrderLine } from '@/features/cart/order-lines'
import {
  buildOrderMessage,
  computeTotals,
  emptyCheckout,
  paymentOptions,
  totalsSummary,
  validateCheckout,
  withMode,
  type CheckoutDetails,
  type OrderTotals,
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
const products = (productsSubtotal: number) => ({ productsSubtotal })
// Intl uses a no-break space after "$"; compare with plain spaces.
const plain = (text: string) => text.replace(/\u00a0/g, ' ')

const delivery: CheckoutDetails = {
  name: 'Ana Gómez',
  mode: 'envio',
  address: 'Rivadavia 100, Barrio Centro',
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

  it('requires the address only for delivery, and never a zone', () => {
    expect(validateCheckout({ ...delivery, address: ' ' })).toEqual({ address: 'Escribí la dirección para el envío.' })
    expect(validateCheckout({ ...delivery, mode: 'retiro', address: '' })).toEqual({})
    expect(validateCheckout(delivery)).toEqual({})
  })

  it('validates the four fields by mode: name, mode, payment, and the address for delivery', () => {
    expect(validateCheckout({ ...emptyCheckout, mode: 'envio' })).toEqual({
      name: 'Escribí tu nombre y apellido.',
      address: 'Escribí la dirección para el envío.',
      payment: 'Elegí cómo vas a pagar.',
    })
    expect(validateCheckout({ ...emptyCheckout, mode: 'retiro' })).toEqual({
      name: 'Escribí tu nombre y apellido.',
      payment: 'Elegí cómo vas a pagar.',
    })
  })

  it('rejects a card payment on delivery', () => {
    expect(validateCheckout({ ...delivery, payment: 'credito' }).payment).toBeDefined()
  })

  it('accepts a complete delivery order', () => {
    expect(validateCheckout(delivery)).toEqual({})
  })
})

describe('computeTotals', () => {
  it('charges the same products for pickup and delivery: no per-pizza surcharge, no shipping in the total', () => {
    expect(computeTotals(products(47000), delivery)).toEqual({ products: 47000, creditSurcharge: null, delivery: true, total: 47000 })
    expect(computeTotals(products(47000), { ...delivery, mode: 'retiro' })).toEqual({
      products: 47000,
      creditSurcharge: null,
      delivery: false,
      total: 47000,
    })
  })

  it('applies the 8 % credit surcharge on products only, for pickup, rounded to the nearest peso (RN-17)', () => {
    const pickup = { ...delivery, mode: 'retiro' as const, payment: 'credito' as const }
    expect(computeTotals(products(10010), pickup)).toMatchObject({ creditSurcharge: 801, total: 10811 })
    // 10.006 × 8 % = 800,48 → 800; 10.025 × 8 % = 802 exactly.
    expect(computeTotals(products(10006), pickup).creditSurcharge).toBe(800)
    expect(computeTotals(products(10025), pickup).creditSurcharge).toBe(802)
  })

  it('adds nothing for debit, cash, or transfer', () => {
    for (const payment of ['debito', 'efectivo', 'transferencia'] as const) {
      expect(computeTotals(products(20000), { ...delivery, mode: 'retiro', payment }).total).toBe(20000)
    }
  })

  it('never applies the credit surcharge on delivery, even if a stale state still says credit', () => {
    expect(computeTotals(products(20000), { ...delivery, payment: 'credito' })).toMatchObject({ creditSurcharge: null, total: 20000 })
  })

  it('switching to delivery and back keeps the totals consistent with the mode', () => {
    let details: CheckoutDetails = { ...delivery, mode: 'retiro', payment: 'credito' }
    expect(computeTotals(products(20000), details).total).toBe(21600)
    details = withMode(details, 'envio')
    expect(details.payment).toBeNull()
    expect(computeTotals(products(20000), details).total).toBe(20000)
  })
})

describe('totalsSummary: the rows shared by the summary card and the message', () => {
  const rows = (totals: OrderTotals) => totalsSummary(totals).rows.map(({ label, value }) => plain(`${label}: ${value}`))

  it('for delivery, lists the products and says the motito is paid apart, outside the total', () => {
    const summary = totalsSummary(computeTotals(products(60500), delivery))
    expect(rows(computeTotals(products(60500), delivery))).toEqual(['Productos: $ 60.500', 'Reparto en motito: Se paga aparte'])
    expect(summary.total).toEqual({ label: 'Total orientativo', value: expect.stringContaining('60.500') })
    expect(summary.notes).toEqual([
      'No incluye el reparto en motito: se paga aparte, con tarifa según el destino, y lo confirma el local.',
      'El local confirma el total.',
    ])
  })

  it('for pickup with credit, lists the products and the 8 %, with nothing paid apart', () => {
    const summary = totalsSummary(computeTotals(products(35000), { ...delivery, mode: 'retiro', payment: 'credito' }))
    expect(summary.rows.map((row) => row.label)).toEqual(['Productos', 'Recargo crédito 8 %'])
    expect(summary.notes).toEqual(['El local confirma el total.'])
  })

  it('adds up to the total: the rows with an amount are exactly what the total holds', () => {
    for (const details of [delivery, { ...delivery, mode: 'retiro' as const, payment: 'credito' as const }]) {
      const totals = computeTotals(products(43210), details)
      expect(totalsSummary(totals).rows.reduce((total, row) => total + (row.amount ?? 0), 0)).toBe(totals.total)
    }
  })
})

describe('buildOrderMessage', () => {
  it('writes a delivery order with the full address, notes, and the motito paid apart, with no surcharges', () => {
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
        'Dirección: Rivadavia 100, Barrio Centro',
        '',
        '*Productos*',
        '• 1 × Muzzarella (Entera): $ 16.000',
        '  Aclaración: sin aceitunas',
        '• 1 × Media pizza de Especial: $ 13.500',
        '• 1 × Pizza mitad y mitad (Muzzarella + Napolitana Heraldo): $ 25.000',
        '• 2 × Empanada de carne picada: $ 6.000',
        '',
        'Productos: $ 60.500',
        'Reparto en motito: Se paga aparte',
        '',
        'Pago: Efectivo',
        '',
        '*Total orientativo: $ 60.500*',
        'No incluye el reparto en motito: se paga aparte, con tarifa según el destino, y lo confirma el local.',
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

  it('lists the flavors of each dozen to choose under it, the same ones the cart shows (P4)', () => {
    const dozen = prototypePromotions.find((item) => item.title === 'Docena de empanadas a elección')
    if (!dozen) throw new Error('dozen')
    const id = (name: string) => product(name).id
    const lines: OrderLine[] = [
      {
        id: 'd1',
        kind: 'promotion',
        promotionId: dozen.id,
        quantity: 1,
        note: 'bien calientes',
        flavors: [
          { productId: id('Empanada de carne picada'), quantity: 5 },
          { productId: id('Empanada de jamón y queso'), quantity: 4 },
          { productId: id('Empanada de pollo'), quantity: 3 },
        ],
      },
    ]
    const summary = reconcileOrder(lines, indexCatalog(prototypeCategories, prototypeProducts, prototypePromotions))
    const details = { ...delivery, mode: 'retiro' as const }
    const message = plain(buildOrderMessage(details, summary, computeTotals(summary, details)))

    expect(message).toContain(
      [
        '• 1 × Docena de empanadas a elección (Promo): $ 36.000',
        '  5 Carne picada',
        '  3 Pollo',
        '  4 Jamón y queso',
        '  Aclaración: bien calientes',
      ].join('\n'),
    )
    expect(summary.lines[0].parts).toEqual(['5 Carne picada', '3 Pollo', '4 Jamón y queso'])
  })
})
