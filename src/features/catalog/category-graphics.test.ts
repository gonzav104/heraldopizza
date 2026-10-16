import { describe, expect, it } from 'vitest'
import { prototypeCategories } from '@/data/prototype-catalog'
import { categoryGraphic, categoryGraphicKey } from './category-graphics'

describe('category graphics (D5)', () => {
  it('gives every fixture category its own graphic, never the fallback', () => {
    for (const category of prototypeCategories) {
      expect(categoryGraphic(category.name).fallback, category.name).toBe(false)
    }
  })

  it('never repeats a graphic across categories', () => {
    const icons = prototypeCategories.map((category) => categoryGraphic(category.name).Icon)
    expect(new Set(icons).size).toBe(prototypeCategories.length)
  })

  it('normalizes accents and case when looking up a category', () => {
    expect(categoryGraphicKey('Cafetería')).toBe('cafeteria')
    expect(categoryGraphicKey(' Milanesas y Sándwiches ')).toBe('milanesas y sandwiches')
    expect(categoryGraphic('cafeteria').Icon).toBe(categoryGraphic('Cafetería').Icon)
  })

  it('falls back to a neutral graphic for an unknown category', () => {
    expect(categoryGraphic('Categoría nueva').fallback).toBe(true)
  })
})
