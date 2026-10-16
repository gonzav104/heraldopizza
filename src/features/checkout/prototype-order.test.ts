import { describe, expect, it } from 'vitest'
import type { Product } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { indexCatalog, summarizeOrder } from '@/features/cart/line-pricing'
import type { OrderLine } from '@/features/cart/order-lines'
import {
  OTHER_ZONE,
  buildOrderMessage,
  computeTotals,
  emptyCheckout,
  paymentOptions,
  validateCheckout,
  withMode,
  zoneOptions,
  type CheckoutDetails,
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
    expect(computeTotals({ productsSubtotal: 47000, pizzaCount: 2 }, delivery)).toEqual({
      products: 47000,
      pizzaSurcharge: { count: 2, unit: 1000, amount: 2000 },
      shippingToConfirm: true,
      creditSurcharge: null,
      total: 49000,
    })
  })

  it('adds no pizza surcharge on delivery without pizzas', () => {
    expect(computeTotals({ productsSubtotal: 6000, pizzaCount: 0 }, delivery).pizzaSurcharge).toBeNull()
  })

  it('adds no delivery charges for pickup', () => {
    expect(computeTotals({ productsSubtotal: 16000, pizzaCount: 1 }, { ...delivery, mode: 'retiro' })).toEqual({
      products: 16000,
      pizzaSurcharge: null,
      shippingToConfirm: false,
      creditSurcharge: null,
      total: 16000,
    })
  })

  it('applies the 8 % credit surcharge on products only, in whole pesos (RN-17)', () => {
    const totals = computeTotals({ productsSubtotal: 10010, pizzaCount: 1 }, { ...delivery, mode: 'retiro', payment: 'credito' })
    expect(totals.creditSurcharge).toBe(801)
    expect(totals.total).toBe(10811)
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
    const summary = summarizeOrder(lines, index)
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
        'Recargo por pizza (3 × $ 1.000): $ 3.000',
        'Envío: a confirmar',
        'Pago: Efectivo',
        '',
        '*Total orientativo: $ 63.500*',
        'El local confirma el total.',
      ].join('\n'),
    )
  })

  it('writes a pickup order with credit, made-to-order notice, and general note (RN-07)', () => {
    const details: CheckoutDetails = { ...emptyCheckout, name: ' Ana Gómez ', mode: 'retiro', payment: 'credito', note: 'Paso a las 21' }
    const lines: OrderLine[] = [
      { id: 'a', kind: 'product', productId: product('Ensaimada').id, variantId: variantId('Ensaimada', 'Grande'), quantity: 1, note: '' },
    ]
    const summary = summarizeOrder(lines, index)
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
        'Recargo crédito 8 %: $ 2.800',
        'Pago: Crédito',
        'Por encargo: Ensaimada. Pedir con 1 o 2 días de anticipación.',
        'Nota: Paso a las 21',
        '',
        '*Total orientativo: $ 37.800*',
        'El local confirma el total.',
      ].join('\n'),
    )
  })
})
