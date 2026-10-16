import { useCallback, useEffect, useState } from 'react'

const STATE_KEY = 'heraldoSheet'

function currentSheet(): unknown {
  return (window.history.state as Record<string, unknown> | null)?.[STATE_KEY]
}

/**
 * Open/close state for a sheet, tied to browser history so the phone's Back button closes it (NN/g).
 * Each sheet has its own key; only one sheet is open at a time.
 */
export function useSheetHistory<T>(key: string) {
  const [value, setValue] = useState<T | null>(null)

  const open = useCallback(
    (next: T) => {
      setValue(next)
      if (currentSheet() === key) window.history.replaceState({ [STATE_KEY]: key }, '')
      else window.history.pushState({ [STATE_KEY]: key }, '')
    },
    [key],
  )

  const close = useCallback(() => {
    if (currentSheet() === key) window.history.back()
    else setValue(null)
  }, [key])

  useEffect(() => {
    const onPopState = () => {
      if (currentSheet() !== key) setValue(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [key])

  return { value, open, close }
}

/**
 * Keeps the last value shown while a sheet animates closed, and counts openings so the content
 * can be keyed on them (fresh quantity and note every time the sheet opens).
 */
export function useSheetContent<T>(value: T | null): { shown: T | null; session: number } {
  const [shown, setShown] = useState(value)
  const [wasOpen, setWasOpen] = useState(value !== null)
  const [session, setSession] = useState(value !== null ? 1 : 0)

  if ((value !== null) !== wasOpen || (value !== null && value !== shown)) {
    setWasOpen(value !== null)
    if (value !== null) {
      setShown(value)
      setSession((count) => count + 1)
    }
  }

  return { shown, session }
}
