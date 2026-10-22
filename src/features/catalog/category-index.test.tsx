import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Storefront } from '@/app/Storefront'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'

// Chromium drops a scroll requested while the modal category sheet is closing, so the page never reached the chosen
// section. jsdom does not scroll at all: these tests pin what the page asks for, and when.

// Frames run only when the test says so; ids are never reused, so a cancel can only drop its own frame.
let frames = new Map<number, FrameRequestCallback>()
let lastFrameId = 0
const runFrames = () => {
  const pending = [...frames.values()]
  frames = new Map()
  for (const frame of pending) frame(performance.now())
}

const scrollIntoView = vi.fn()

beforeEach(() => {
  frames = new Map()
  scrollIntoView.mockClear()
  Element.prototype.scrollIntoView = scrollIntoView
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    lastFrameId += 1
    frames.set(lastFrameId, callback)
    return lastFrameId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
})

afterEach(() => vi.restoreAllMocks())

async function pickFromIndex(label: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Categorías' }))
  const sheet = screen.getByRole('dialog', { name: 'Categorías' })
  fireEvent.click(within(sheet).getByRole('button', { name: new RegExp(`^${label}`) }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Categorías' })).not.toBeInTheDocument())
}

describe('category index sheet', () => {
  it('scrolls to the chosen section once the sheet has closed, one frame later, not while it closes', async () => {
    render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)

    await pickFromIndex('Postres')
    expect(scrollIntoView).not.toHaveBeenCalled()

    runFrames()

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    const section = scrollIntoView.mock.contexts[0] as HTMLElement
    expect(section.tagName).toBe('SECTION')
    expect(within(section).getByRole('heading', { level: 2, name: 'Postres' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Categorías de la carta' })).getByRole('link', { name: /Postres/ })).toHaveAttribute(
      'aria-current',
    )
  })

  it('cancels the pending scroll if the menu goes away before that frame', async () => {
    const { unmount } = render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)

    await pickFromIndex('Postres')
    const pending = [...frames.keys()]
    expect(pending).toHaveLength(1)
    unmount()

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(pending[0])
    expect(frames.size).toBe(0)
  })

  it('scrolls once, to the latest pick, when a newer pick arrives before the frame', async () => {
    render(<Storefront categories={prototypeCategories} products={prototypeProducts} promotions={[]} />)

    await pickFromIndex('Postres')
    await pickFromIndex('Pizzas')
    runFrames()

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    const section = scrollIntoView.mock.contexts[0] as HTMLElement
    expect(within(section).getByRole('heading', { level: 2, name: 'Pizzas' })).toBeInTheDocument()
  })
})
