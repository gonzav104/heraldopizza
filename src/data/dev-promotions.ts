import type { Promotion } from '@/domain/catalog'

/**
 * Promotions to show while there is no real source (until U9): the owner's prototype promotions in development, none
 * in production. Vite replaces import.meta.env.DEV with false in a production build, so the lazy import below is dead
 * code there and the prototype data never ships (npm run check:bundle verifies it).
 */
export function loadDevPromotions(): Promise<Promotion[]> {
  if (!import.meta.env.DEV) return Promise.resolve([])
  return import('@/data/prototype-promotions').then((module) => module.prototypePromotions)
}
