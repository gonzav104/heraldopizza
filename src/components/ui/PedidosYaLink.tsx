import { ExternalLink } from 'lucide-react'
import { pedidosYaLogo, type BrandLogo } from '@/data/brand-assets'
import { pedidosYaUrl } from '@/data/store-info'

interface PedidosYaLinkProps {
  /** Words before the brand, so the link reads as an alternative: "También en", "También podés pedir en". */
  lead: string
  /** Defaults to the official logo in `brand-assets.ts`; `null` shows the name as plain text. */
  logo?: BrandLogo | null
  className?: string
}

/**
 * Secondary channel (WhatsApp is the main one): a quiet pill that opens the restaurant on PedidosYa in a new tab.
 * Shown only in the footer and the info sheet. The logo is the owner-supplied official file, never a redrawn one;
 * until it exists the brand is written as text. The accessible name is the same either way.
 */
export function PedidosYaLink({ lead, logo = pedidosYaLogo, className = '' }: PedidosYaLinkProps) {
  return (
    <a
      href={pedidosYaUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${lead} PedidosYa`}
      className={`flex min-h-11 w-fit items-center gap-2 rounded-full bg-chapa-high px-5 text-[0.9375rem] font-semibold ring-1 ring-chapa-edge transition-colors hover:bg-chapa-edge ${className}`}
    >
      <span>{lead}</span>
      {logo ? (
        <img src={logo.src} width={logo.width} height={logo.height} alt="PedidosYa" className="h-5 w-auto" />
      ) : (
        <span className="font-[800] [font-stretch:108%]">PedidosYa</span>
      )}
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-crema-muted" />
    </a>
  )
}
