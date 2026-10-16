import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '@/App'

describe('App', () => {
  it('opens on the menu: brand, category navigation, and the pizzas up front, with no hero', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Heraldo Pizza' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Categorías de la carta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Pizzas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Sumar Muzzarella, Entera/ })).toBeInTheDocument()
  })
})
