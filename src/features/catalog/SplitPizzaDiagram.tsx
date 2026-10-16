interface SplitPizzaDiagramProps {
  /** Left half filled (red) when true. */
  first?: boolean
  /** Right half filled (mustard) when true. */
  second?: boolean
  className?: string
}

const LEFT = 'M48 4 A46 46 0 0 0 48 96 Z'
const RIGHT = 'M52 4 A46 46 0 0 1 52 96 Z'

function Half({ path, filled, color }: { path: string; filled: boolean; color: string }) {
  return (
    <>
      {/* Dashed outline only while the half is empty; a filled half is solid. */}
      {filled ? null : <path d={path} fill="none" stroke="var(--color-crema-muted)" strokeWidth={2} strokeDasharray="5 5" />}
      <path
        d={path}
        fill={color}
        className={`origin-center transition-[opacity,scale] duration-200 ease-[var(--ease-out-expo)] [transform-box:fill-box] motion-reduce:transition-none ${
          filled ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      />
    </>
  )
}

/** Half pizza / half-and-half as a plain split circle (not a food illustration): left half red, right half mustard. */
export function SplitPizzaDiagram({ first = false, second = false, className = '' }: SplitPizzaDiagramProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={`block ${className}`}>
      <Half path={LEFT} filled={first} color="var(--color-heraldo)" />
      <Half path={RIGHT} filled={second} color="var(--color-mostaza)" />
    </svg>
  )
}
