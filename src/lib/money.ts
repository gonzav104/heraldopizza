import type { Ars } from '@/domain/catalog'

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

/** Formats whole pesos the local way, e.g. `$ 16.000`. */
export function formatArs(amount: Ars): string {
  return arsFormatter.format(amount)
}
