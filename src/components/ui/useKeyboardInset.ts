import { useEffect, type RefObject } from 'react'

/**
 * Keeps a bottom sheet above the on-screen keyboard.
 *
 * iOS leaves the layout viewport at full height when the keyboard opens, so a fixed bottom sheet ends up under it.
 * The visual viewport knows the real visible area: this hook publishes the keyboard height as `--kb-inset` (the sheet
 * rides above it) and the visible height as `--vv-h` (the sheet never grows past it).
 * Where Chrome already resizes the layout viewport (`interactive-widget=resizes-content`) the inset stays 0.
 */
export function useKeyboardInset(active: boolean, ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const viewport = window.visualViewport
    const element = ref.current
    if (!active || !viewport || !element) return

    const update = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      element.style.setProperty('--kb-inset', `${Math.round(inset)}px`)
      element.style.setProperty('--vv-h', `${Math.round(viewport.height)}px`)
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      element.style.removeProperty('--kb-inset')
      element.style.removeProperty('--vv-h')
    }
  }, [active, ref])
}
