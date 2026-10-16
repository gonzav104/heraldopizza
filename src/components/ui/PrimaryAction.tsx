import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface PrimaryActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  /** What pressing it does ("Agregar mitad y mitad"). Wraps on its own line before it can crowd the amount. */
  label: ReactNode
  /** Formatted amount shown at the right edge ("$ 25.000"). */
  amount?: string | null
}

/**
 * The full-width red action in every sheet footer and in the order panel: label on the left, amount on the right.
 * Keeping the amount in its own element (instead of "label · $ X" in one centered line) means a long label on a 320 px
 * phone wraps cleanly beside the price rather than leaving a dangling dot.
 */
export function PrimaryAction({ label, amount, type = 'button', ...buttonProps }: PrimaryActionProps) {
  return (
    <button
      type={type}
      {...buttonProps}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl bg-heraldo px-5 text-[1.0625rem] leading-tight font-bold text-white shadow-[0_12px_24px_-12px_rgb(215_25_31/0.9),inset_0_1px_0_rgb(255_255_255/0.22)] transition-[background-color,transform] duration-150 hover:bg-heraldo-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-chapa-edge disabled:text-crema-muted disabled:shadow-none motion-reduce:active:scale-100 ${
        amount ? 'justify-between' : 'justify-center'
      }`}
    >
      <span className={amount ? 'min-w-0 text-left text-balance' : undefined}>{label}</span>
      {amount ? <span className="type-price shrink-0">{amount}</span> : null}
    </button>
  )
}
