import { afterEach, describe, expect, it, vi } from 'vitest'
import { prototypePromotions } from '@/data/prototype-promotions'

// The global setup mocks this module for every other test; here the real loader runs.
vi.unmock('@/data/dev-promotions')
const { loadDevPromotions } = await vi.importActual<typeof import('@/data/dev-promotions')>('@/data/dev-promotions')

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('loadDevPromotions', () => {
  it('loads the owner’s prototype promotions in development', async () => {
    vi.stubEnv('DEV', true)
    await expect(loadDevPromotions()).resolves.toEqual(prototypePromotions)
  })

  it('loads none in a production build', async () => {
    vi.stubEnv('DEV', false)
    await expect(loadDevPromotions()).resolves.toEqual([])
  })
})
