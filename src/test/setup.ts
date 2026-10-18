import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Vitest runs without globals, so Testing Library cannot register its automatic cleanup.
afterEach(() => {
  cleanup()
})

// jsdom does not implement modal dialogs; this minimal stand-in only toggles `open`.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
  }
}

// Vitest runs in development mode, where the menu would lazy-load the prototype promotions on its own and render them
// whenever that import settles. Tests start with none; a test that wants promotions injects its own loader.
vi.mock('@/data/dev-promotions', () => ({ loadDevPromotions: () => new Promise(() => undefined) }))
