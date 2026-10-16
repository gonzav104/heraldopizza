import { useState } from 'react'
import { zoneOptions } from './prototype-order'

interface ZonePickerProps {
  value: string | null
  onChange: (zoneId: string) => void
  error?: string
  firstInputId: string
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')

/**
 * Searchable zone list (RF-63). The search box appears once there are barrios and fábricas to search;
 * today the list only holds the pinned "Otra zona (a consultar)" because the real list is missing.
 */
export function ZonePicker({ value, onChange, error, firstInputId }: ZonePickerProps) {
  const [query, setQuery] = useState('')
  const searchable = zoneOptions.filter((zone) => !zone.pinned)
  const pinned = zoneOptions.filter((zone) => zone.pinned)
  const matches = searchable.filter((zone) => normalize(zone.label).includes(normalize(query)))
  const visible = [...matches, ...pinned]
  const errorId = error ? 'zona-error' : undefined

  return (
    <fieldset aria-describedby={errorId}>
      <legend className="mb-2 text-[1rem] font-bold">Zona</legend>
      {searchable.length > 0 ? (
        <>
          <label htmlFor="zona-busqueda" className="sr-only">
            Buscá tu barrio o fábrica
          </label>
          <input
            id="zona-busqueda"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscá tu barrio o fábrica"
            enterKeyHint="search"
            className="mb-2 min-h-12 w-full rounded-xl bg-chapa px-3.5 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0"
          />
        </>
      ) : null}
      <div className="flex flex-col gap-1.5">
        {visible.map((zone, index) => {
          const checked = zone.id === value
          return (
            <label
              key={zone.id}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3.5 ring-1 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-mostaza ${
                checked ? 'bg-heraldo/15 ring-heraldo' : 'bg-chapa ring-chapa-edge hover:ring-crema-muted/60'
              } ${error && !value ? 'ring-mostaza' : ''}`}
            >
              <input
                type="radio"
                id={index === 0 ? firstInputId : undefined}
                name="zona"
                value={zone.id}
                checked={checked}
                onChange={() => onChange(zone.id)}
                className="size-5 accent-heraldo"
              />
              <span className="font-semibold">{zone.label}</span>
            </label>
          )
        })}
      </div>
      <p className="mt-2 text-[0.875rem] leading-snug text-crema-muted">La lista de barrios y fábricas se suma cuando el local la confirme.</p>
      {error ? (
        <p id={errorId} className="mt-1 text-[0.875rem] font-semibold text-mostaza">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
