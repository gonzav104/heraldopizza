// Drawn for Heraldo in lucide's stroke style (24 grid, 2 px, round joins): a half-moon with a scalloped edge and the
// inner fold of the repulgue. Lucide has no empanada.
const SHELL =
  'M2.5 16.5A2.22 2.22 0 0 1 3.44 12.38A2.22 2.22 0 0 1 6.08 9.07A2.22 2.22 0 0 1 9.89 7.24A2.22 2.22 0 0 1 14.11 7.24A2.22 2.22 0 0 1 17.92 9.07A2.22 2.22 0 0 1 20.56 12.38A2.22 2.22 0 0 1 21.5 16.5Q12 19 2.5 16.5Z'
const FOLD = 'M5.8 16.2A6.2 6.2 0 0 1 18.2 16.2'

/** Empanada glyph that sits beside lucide's Pizza and CupSoda. Decorative: the text next to it names the item. */
export function EmpanadaIcon({ className = '', strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={SHELL} />
      <path d={FOLD} strokeDasharray="1.6 2.2" />
    </svg>
  )
}
