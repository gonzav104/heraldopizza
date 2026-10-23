import { describe, expect, it } from 'vitest'
import { argentinaToday, msUntilArgentinaMidnight } from './argentina-time'

describe('msUntilArgentinaMidnight', () => {
  it.each([
    ['2026-10-25T02:55:00.000Z', 5 * 60 * 1000], // 23:55 in Argentina
    ['2026-10-25T02:59:59.999Z', 1],
    ['2026-10-25T03:00:00.000Z', 24 * 60 * 60 * 1000], // exactly midnight: a whole new day ahead
    ['2026-10-24T15:00:00.000Z', 12 * 60 * 60 * 1000], // noon in Argentina
  ])('at %s there are %i ms left in the Argentine day', (instant, ms) => {
    expect(msUntilArgentinaMidnight(new Date(instant))).toBe(ms)
  })

  it('lands exactly on the next Argentine date', () => {
    const now = new Date('2026-10-24T22:17:43.250Z')
    const midnight = new Date(now.getTime() + msUntilArgentinaMidnight(now))
    expect(argentinaToday(midnight).date).toBe('2026-10-25')
    expect(argentinaToday(new Date(midnight.getTime() - 1)).date).toBe('2026-10-24')
  })
})
