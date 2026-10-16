import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useKeyboardInset } from './useKeyboardInset'

class FakeViewport extends EventTarget {
  height = 800
  offsetTop = 0
}

function Probe({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useKeyboardInset(active, ref)
  return <div ref={ref} data-testid="sheet" />
}

const probe = () => document.querySelector<HTMLElement>('[data-testid="sheet"]')!
const vars = () => [probe().style.getPropertyValue('--kb-inset'), probe().style.getPropertyValue('--vv-h')]

describe('useKeyboardInset', () => {
  let viewport: FakeViewport

  beforeEach(() => {
    viewport = new FakeViewport()
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 })
  })

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null })
  })

  it('does nothing while the sheet is closed', () => {
    render(<Probe active={false} />)

    expect(vars()).toEqual(['', ''])
  })

  it('reports no inset and the full height when no keyboard is open', () => {
    render(<Probe active />)

    expect(vars()).toEqual(['0px', '800px'])
  })

  it('lifts the sheet by the keyboard height and limits it to the visible area', () => {
    render(<Probe active />)
    act(() => {
      viewport.height = 480
      viewport.dispatchEvent(new Event('resize'))
    })

    expect(vars()).toEqual(['320px', '480px'])
  })

  it('accounts for the pan iOS applies when it scrolls a focused field into view', () => {
    render(<Probe active />)
    act(() => {
      viewport.height = 440
      viewport.offsetTop = 40
      viewport.dispatchEvent(new Event('scroll'))
    })

    expect(vars()).toEqual(['320px', '440px'])
  })

  it('removes its variables when the sheet closes', () => {
    const { rerender } = render(<Probe active />)
    rerender(<Probe active={false} />)

    expect(vars()).toEqual(['', ''])
  })

  it('does not break where visualViewport does not exist', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })

    expect(() => render(<Probe active />)).not.toThrow()
    expect(vars()).toEqual(['', ''])
  })
})
