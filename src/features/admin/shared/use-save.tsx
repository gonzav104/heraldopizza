import { useCallback, useState } from 'react'
import { CATALOG_SCOPE, failureReason, type ReloadScope } from '@/features/admin/shared/admin-save'
import { SaveFeedback, type Feedback } from '@/features/admin/shared/SaveFeedback'

/** Runs one save and reports it through the shared feedback of a card or a group. */
export function useSave(onReload: () => void, label = '', scope: ReloadScope = CATALOG_SCOPE) {
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' })
  const run = useCallback(async function save(action: () => Promise<void>): Promise<boolean> {
    setFeedback({ kind: 'saving' })
    try {
      await action()
      setFeedback({ kind: 'saved' })
      return true
    } catch (error) {
      const reason = failureReason(error)
      setFeedback({ kind: 'failed', reason, retry: () => void save(action) })
      return false
    }
  }, [])
  // A new edit makes the last «Guardado» or error stale; a save in progress keeps its status.
  const clear = useCallback(
    () => setFeedback((current) => (current.kind === 'saving' ? current : { kind: 'idle' })),
    [],
  )
  const view = <SaveFeedback feedback={feedback} onReload={onReload} label={label} scope={scope} />
  return { run, clear, view, failed: feedback.kind === 'failed', saving: feedback.kind === 'saving' }
}
