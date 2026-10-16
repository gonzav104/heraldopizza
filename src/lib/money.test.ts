import { describe, expect, it } from 'vitest'
import { formatArs } from '@/lib/money'

describe('formatArs', () => {
  it('formats whole pesos with Argentine thousands separator and no decimals', () => {
    expect(formatArs(16000).replace(/\s/g, ' ')).toBe('$ 16.000')
    expect(formatArs(3000).replace(/\s/g, ' ')).toBe('$ 3.000')
  })
})
