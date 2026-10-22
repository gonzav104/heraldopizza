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

// Vitest runs in development mode, where the #sistema reference view lazy-loads the prototype promotions. Tests get
// none at once; a test that wants them mocks the loader. The public menu never uses it: its promotions come from the
// catalog repository (P5a).
vi.mock('@/data/dev-promotions', () => ({ loadDevPromotions: () => Promise.resolve([]) }))
