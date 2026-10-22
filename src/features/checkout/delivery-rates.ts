import type { DeliveryRateGroup } from '@/data/delivery-rates'

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .trim()

/** The rates whose place name contains the query, ignoring case and accents; empty tiers and groups are left out. */
export function searchDeliveryRates(groups: DeliveryRateGroup[], query: string): DeliveryRateGroup[] {
  const wanted = normalize(query)
  if (!wanted) return groups
  return groups
    .map((group) => ({
      ...group,
      tiers: group.tiers
        .map((tier) => ({ ...tier, places: tier.places.filter((place) => normalize(place).includes(wanted)) }))
        .filter((tier) => tier.places.length > 0),
    }))
    .filter((group) => group.tiers.length > 0)
}
