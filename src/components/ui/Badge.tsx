import type { ReactNode } from 'react'

type BadgeTone = 'made-to-order' | 'out-of-stock'

const toneClasses: Record<BadgeTone, string> = {
  'made-to-order': 'bg-mostaza text-pino-ink',
  'out-of-stock': 'bg-crema text-chapa',
}

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
