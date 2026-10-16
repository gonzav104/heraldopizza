import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Sheet } from './Sheet'

function Demo({ open }: { open: boolean }) {
  return (
    <Sheet open={open} onClose={() => {}} labelledBy="demo-titulo" header={<h2 id="demo-titulo">Demo</h2>}>
      contenido
    </Sheet>
  )
}

const root = document.documentElement

describe('Sheet page scroll lock (S4)', () => {
  afterEach(() => {
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 0 })
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  })

  it('locks the page while open and releases it on close', () => {
    const { rerender } = render(<Demo open={false} />)
    expect(root.style.overflow).toBe('')

    rerender(<Demo open />)
    expect(root.style.overflow).toBe('hidden')

    rerender(<Demo open={false} />)
    expect(root.style.overflow).toBe('')
  })

  it('adds back the width of a classic scrollbar so the page does not jump sideways', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 1265 })
    const { rerender } = render(<Demo open />)
    expect(root.style.paddingRight).toBe('15px')

    rerender(<Demo open={false} />)
    expect(root.style.paddingRight).toBe('')
  })

  it('adds nothing where scrollbars overlay the page, as on phones', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 390 })
    render(<Demo open />)

    expect(root.style.paddingRight).toBe('')
  })
})
