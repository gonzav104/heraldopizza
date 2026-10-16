interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Small trailing note, e.g. "+8 %". */
  note?: string
}

interface SegmentedControlProps<T extends string> {
  name: string
  legend: string
  options: SegmentedOption<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string
  /** Id given to the first radio, so a form can focus it. */
  firstInputId?: string
}

/**
 * Single choice as native radios styled like segments: keyboard and screen readers work as for any radio group.
 * Always two columns: it lives in a sheet capped at 32 rem, so the viewport width says nothing about the room it has
 * (four columns at a 430 px phone left 92 px per option and broke "Transferencia" and "+8 %").
 */
export function SegmentedControl<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  firstInputId,
}: SegmentedControlProps<T>) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <fieldset aria-describedby={errorId}>
      <legend className="mb-2 text-[1rem] font-bold">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option, index) => {
          const checked = option.value === value
          return (
            <label
              key={option.value}
              className={`flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-center leading-tight font-semibold ring-1 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-mostaza ${
                checked ? 'bg-heraldo text-white ring-heraldo' : 'bg-chapa text-crema ring-chapa-edge hover:ring-crema-muted/60'
              } ${error && !value ? 'ring-mostaza' : ''}`}
            >
              <input
                type="radio"
                id={index === 0 ? firstInputId : undefined}
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
              {option.note ? <span className={`text-[0.8125rem] whitespace-nowrap ${checked ? 'text-white' : 'text-mostaza'}`}>{option.note}</span> : null}
            </label>
          )
        })}
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-[0.875rem] font-semibold text-mostaza">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
