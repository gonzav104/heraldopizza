import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useKeyboardInset } from './useKeyboardInset'

let scrollLocks = 0

/**
 * Locks the page scroll under a sheet. Removing a classic scrollbar widens the page and makes it jump sideways, so the
 * width it occupied is added back as padding (0 with the overlay scrollbars of phones, where nothing jumps).
 */
function lockScroll() {
  if (scrollLocks === 0) {
    const root = document.documentElement
    const scrollbar = root.clientWidth > 0 ? window.innerWidth - root.clientWidth : 0
    root.style.paddingRight = scrollbar > 0 ? `${scrollbar}px` : ''
    root.style.overflow = 'hidden'
  }
  scrollLocks += 1
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) {
    document.documentElement.style.overflow = ''
    document.documentElement.style.paddingRight = ''
  }
}

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'tel', 'url', 'number'])

/** Once the on-screen keyboard has opened, scroll a focused text field back into the visible part of the sheet. */
function keepFieldInView(target: EventTarget) {
  const field =
    target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && TEXT_INPUTS.has(target.type)) ? target : null
  if (!field) return
  window.setTimeout(() => field.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 300)
}

interface SheetProps {
  open: boolean
  onClose: () => void
  /** Id of the element that names the dialog (the sheet's heading). */
  labelledBy: string
  /** Header bar content (title, back control). Without it, the close button floats over the content. */
  header?: ReactNode
  headerTone?: 'chapa' | 'pino'
  children: ReactNode
  /** Sticky bottom area for the primary action. */
  footer?: ReactNode
  /** False while the sheet holds typed text, so a stray backdrop tap does not dismiss it. */
  dismissOnBackdrop?: boolean
  /** Runs once the dialog has closed (e.g. to scroll to a section chosen inside it). */
  onAfterClose?: () => void
  width?: 'md' | 'lg'
}

/**
 * Native modal <dialog> used by every sheet: bottom sheet on phones, centered from 640 px.
 * Closes with the × button, Esc, a backdrop tap, and (through useSheetHistory) the phone's Back button.
 * Locks page scroll while open, rides above the on-screen keyboard, and returns focus to the control that opened it.
 */
export function Sheet({
  open,
  onClose,
  labelledBy,
  header,
  headerTone = 'chapa',
  children,
  footer,
  dismissOnBackdrop = true,
  onAfterClose,
  width = 'md',
}: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)
  const afterClose = useRef(onAfterClose)
  useKeyboardInset(open, dialog)

  useEffect(() => {
    afterClose.current = onAfterClose
  }, [onAfterClose])

  useLayoutEffect(() => {
    const element = dialog.current
    if (!element || !open) return
    opener.current = document.activeElement
    if (!element.open) element.showModal()
    lockScroll()
    return () => {
      if (element.open) element.close()
      unlockScroll()
      const target = opener.current
      if (target instanceof HTMLElement && target.isConnected) target.focus({ preventScroll: true })
      afterClose.current?.()
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissOnBackdrop) onClose()
      }}
      onFocus={(event) => keepFieldInView(event.target)}
      className={`sheet fixed inset-x-0 top-auto bottom-[var(--kb-inset,0px)] m-0 w-full max-w-none overflow-hidden rounded-t-[1.75rem] bg-chapa-high p-0 text-crema shadow-[0_-24px_60px_-12px_rgb(0_0_0/0.85)] ring-1 ring-chapa-edge sm:inset-0 sm:m-auto sm:rounded-[1.75rem] ${
        width === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg'
      }`}
    >
      {/* Never taller than what is visible: with the keyboard open, --vv-h is the space above it. */}
      <div className="flex max-h-[min(92svh,calc(var(--vv-h,100svh)-0.75rem))] flex-col sm:max-h-[min(90svh,48rem,calc(var(--vv-h,100svh)-1.5rem))]">
        {header ? (
          <div
            className={`flex min-h-16 shrink-0 items-center gap-2 py-2 pr-2 pl-4 ${
              headerTone === 'pino' ? 'texture-pino text-pino-ink' : 'border-b border-chapa-edge'
            }`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1">{header}</div>
            <CloseButton onClose={onClose} tone={headerTone} />
          </div>
        ) : null}
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {header ? null : (
            <div className="sticky top-0 z-10 flex h-0 justify-end">
              <CloseButton onClose={onClose} tone="chapa" floating />
            </div>
          )}
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-chapa-edge bg-chapa-high px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  )
}

function CloseButton({ onClose, tone, floating = false }: { onClose: () => void; tone: 'chapa' | 'pino'; floating?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Cerrar"
      className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors ${
        tone === 'pino'
          ? 'text-pino-ink hover:bg-pino-ink/10 focus-visible:outline-pino-ink'
          : 'bg-chapa/85 text-crema ring-1 ring-chapa-edge hover:bg-chapa'
      } ${floating ? 'mt-3 mr-3' : ''}`}
    >
      <X aria-hidden="true" className="size-5" />
    </button>
  )
}
