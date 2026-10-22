import { TriangleAlert, X } from 'lucide-react'
import { useOrderStorageStatus, type OrderStorageIssue } from './order-storage'

function orderStorageMessage(issue: OrderStorageIssue): string {
  switch (issue.kind) {
    case 'partial':
      return issue.discarded === 1
        ? 'Recuperamos tu pedido, pero 1 producto no se pudo recuperar. Revisalo antes de enviarlo.'
        : `Recuperamos tu pedido, pero ${issue.discarded} productos no se pudieron recuperar. Revisalo antes de enviarlo.`
    case 'corrupt':
    case 'incompatible':
      return 'No pudimos recuperar tu pedido anterior. Si tenías productos elegidos, volvé a agregarlos desde la carta.'
    case 'unavailable':
      return 'Este navegador no permite guardar tu pedido: si recargás o cerrás la página, se pierde.'
  }
}

/**
 * Says when the saved order could not be fully recovered or cannot be saved (RF-17), so nothing is lost in silence.
 * `page`: first on the page, where it is seen on load, and announced. `cart`: the same notice inside the cart, where a
 * save that fails mid-visit is seen even when the top of the page is scrolled away; not announced twice.
 * Closing either one closes both.
 */
export function OrderStorageNotice({ placement = 'page' }: { placement?: 'page' | 'cart' }) {
  const issue = useOrderStorageStatus((state) => state.issue)
  const dismiss = useOrderStorageStatus((state) => state.dismiss)
  if (!issue) return null

  const notice = (
    <div
      role={placement === 'page' ? 'alert' : undefined}
      className="flex items-start gap-3 rounded-2xl bg-chapa-high py-2 pr-1 pl-4 ring-1 ring-mostaza/70 sm:items-center"
    >
      <TriangleAlert aria-hidden="true" className="mt-2.5 size-5 shrink-0 text-mostaza sm:mt-0" strokeWidth={2.5} />
      <p className="min-w-0 flex-1 py-2 text-[0.9375rem] leading-snug font-semibold text-crema">{orderStorageMessage(issue)}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="grid size-11 shrink-0 place-items-center rounded-full text-crema-muted transition-colors hover:bg-crema/10 hover:text-crema"
      >
        <X aria-hidden="true" className="size-5" strokeWidth={2.5} />
      </button>
    </div>
  )

  return placement === 'page' ? <div className="mx-auto max-w-6xl px-3 pt-3 md:px-6">{notice}</div> : <div className="pt-4">{notice}</div>
}
