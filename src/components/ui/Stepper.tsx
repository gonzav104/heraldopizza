import { Minus, Plus } from 'lucide-react'

interface StepperProps {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  /** What is being counted, for assistive tech: "Sumar Carne picada". */
  itemLabel: string
  min?: number
  max?: number
  /** At zero, show only the "+" button (empanada board). */
  collapseAtZero?: boolean
  tone?: 'chapa' | 'pino'
  disabled?: boolean
}

const buttonBase =
  'grid size-11 shrink-0 place-items-center rounded-xl transition-[background-color,transform] duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 motion-reduce:active:scale-100'

/** Quantity control with 44 px buttons. */
export function Stepper({
  value,
  onIncrement,
  onDecrement,
  itemLabel,
  min = 0,
  max = 99,
  collapseAtZero = false,
  tone = 'chapa',
  disabled = false,
}: StepperProps) {
  const pino = tone === 'pino'
  const plusClass = `${buttonBase} bg-heraldo text-white hover:bg-heraldo-deep ${pino ? 'focus-visible:outline-pino-ink' : ''}`
  const minusClass = `${buttonBase} ${
    pino ? 'bg-pino-ink/12 text-pino-ink hover:bg-pino-ink/20 focus-visible:outline-pino-ink' : 'bg-chapa ring-1 ring-chapa-edge hover:bg-chapa-edge'
  }`

  if (collapseAtZero && value === 0) {
    return (
      <button type="button" onClick={onIncrement} disabled={disabled} aria-label={`Sumar ${itemLabel}`} className={plusClass}>
        <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />
      </button>
    )
  }

  return (
    <div role="group" aria-label={`Cantidad de ${itemLabel}`} className="flex items-center gap-1">
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled || value <= min}
        aria-label={`Quitar ${itemLabel}`}
        className={minusClass}
      >
        <Minus aria-hidden="true" className="size-5" strokeWidth={2.5} />
      </button>
      <span
        className={`type-price min-w-8 text-center text-[1.125rem] ${pino ? 'text-pino-ink' : 'text-mostaza'}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled || value >= max}
        aria-label={`Sumar ${itemLabel}`}
        className={plusClass}
      >
        <Plus aria-hidden="true" className="size-5" strokeWidth={2.5} />
      </button>
    </div>
  )
}
