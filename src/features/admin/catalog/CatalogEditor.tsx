import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import {
  AdminSaveError,
  type AdminCatalogRepository,
  type AdminCategory,
  type AdminProduct,
  type AdminVariant,
  type SaveFailure,
} from '@/features/admin/catalog/admin-catalog'
import { parsePrice, validateName, validateProductEdit } from '@/features/admin/catalog/catalog-edits'

/**
 * Catalog editor of the admin panel (U5): names, descriptions, made-to-order, stock, visibility, and prices of the
 * existing catalog. Every save shows the row the database returned; nothing is updated optimistically. The public
 * menu reads the catalog when it loads, so changes appear there on reload.
 */

const FAILURE_MESSAGE: Record<SaveFailure, string> = {
  validation: 'La base no aceptó el cambio. Revisá los datos.',
  conflict: 'Otro cambio llegó antes. Recargá el catálogo para ver lo último.',
  'not-found': 'Ese dato ya no existe. Recargá el catálogo.',
  forbidden: 'Tu cuenta no puede guardar cambios.',
  unavailable: 'No pudimos guardar. Revisá tu conexión e intentá de nuevo.',
}

type Feedback =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'failed'; reason: SaveFailure; retry: () => void }

const inputClass =
  'min-h-11 w-full rounded-xl bg-chapa px-3 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0 disabled:opacity-50 aria-invalid:ring-mostaza'
const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full px-4 font-semibold ring-1 ring-chapa-edge hover:bg-chapa-edge disabled:cursor-not-allowed disabled:opacity-50'
const primaryClass =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-heraldo px-5 font-bold text-white hover:bg-heraldo-deep disabled:cursor-not-allowed disabled:bg-chapa-edge disabled:text-crema-muted'

function Unsaved({ children }: { children: ReactNode }) {
  return <p className="text-[0.875rem] font-semibold text-mostaza">{children}</p>
}

const formatPrice = (price: number) => String(price).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

function failureReason(error: unknown): SaveFailure {
  return error instanceof AdminSaveError ? error.reason : 'unavailable'
}

/** Runs one save and reports it through the shared feedback of a card or a category. */
function useSave(onReload: () => void) {
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
  const clear = useCallback(() => setFeedback((current) => (current.kind === 'saving' ? current : { kind: 'idle' })), [])
  const view = <SaveFeedback feedback={feedback} onReload={onReload} />
  return { run, clear, view, saving: feedback.kind === 'saving' }
}

function SaveFeedback({ feedback, onReload }: { feedback: Feedback; onReload: () => void }) {
  if (feedback.kind === 'idle') return null
  if (feedback.kind === 'saving' || feedback.kind === 'saved') {
    return (
      <p role="status" className="text-[0.9375rem] font-semibold text-crema-muted">
        {feedback.kind === 'saving' ? 'Guardando…' : 'Guardado'}
      </p>
    )
  }
  const reload = feedback.reason === 'conflict' || feedback.reason === 'not-found'
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="alert" className="text-[0.9375rem] font-semibold text-mostaza">
        {FAILURE_MESSAGE[feedback.reason]}
      </p>
      {reload ? (
        <button type="button" onClick={onReload} className={buttonClass}>
          Recargar catálogo
        </button>
      ) : feedback.reason === 'unavailable' ? (
        <button type="button" onClick={feedback.retry} className={buttonClass}>
          Reintentar
        </button>
      ) : null}
    </div>
  )
}

/**
 * A checkbox that saves on change. While the save runs it shows the requested state, so the tap visibly registers;
 * when the save ends it shows the saved row again (the new state, or the old one if the save failed).
 */
function Toggle({ label, checked, disabled, onChange, description }: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => Promise<unknown>
  description?: ReactNode
}) {
  const descriptionId = useId()
  const [pending, setPending] = useState<boolean | null>(null)
  const change = async (next: boolean) => {
    setPending(next)
    try {
      await onChange(next)
    } finally {
      setPending(null)
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <input
          type="checkbox"
          aria-label={label}
          aria-describedby={description ? descriptionId : undefined}
          checked={pending ?? checked}
          disabled={disabled}
          onChange={(event) => void change(event.target.checked)}
          className="size-5 accent-[var(--color-heraldo)]"
        />
        <span aria-hidden="true">{label.split(':')[0]}</span>
      </label>
      {description ? (
        <p id={descriptionId} className="text-[0.875rem] text-crema-muted">
          {description}
        </p>
      ) : null}
    </div>
  )
}

interface PriceDraft {
  text: string
  consult: boolean
}

function PriceEditor({ product, saving, onEdit, onSave }: {
  product: AdminProduct
  saving: boolean
  onEdit: () => void
  onSave: (changes: { variant: AdminVariant; price: number | null }[]) => void
}) {
  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>(() =>
    Object.fromEntries(
      product.variants.map((variant) => [
        variant.id,
        { text: variant.price === null ? '' : formatPrice(variant.price), consult: variant.price === null },
      ]),
    ),
  )

  const rows = product.variants.map((variant) => {
    const draft = drafts[variant.id]
    const parsed = draft.consult ? null : parsePrice(draft.text)
    const price = draft.consult ? null : parsed?.ok ? parsed.price : undefined
    return { variant, draft, error: parsed && !parsed.ok ? parsed.error : null, price }
  })
  const changes = rows
    .filter((row) => row.price !== undefined && row.price !== row.variant.price)
    .map((row) => ({ variant: row.variant, price: row.price as number | null }))
  const valid = rows.every((row) => row.error === null)

  const update = (id: string, next: Partial<PriceDraft>) => {
    onEdit()
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...next } }))
  }
  const modified = changes.length > 0 || !valid

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ variant, draft, error }) => {
          const label = `${variant.name} de ${product.name}`
          return (
            <div key={variant.id} className="flex flex-col gap-1.5 rounded-xl bg-chapa-high/60 p-3 ring-1 ring-chapa-edge">
              <span className="font-bold">{variant.name}</span>
              <input
                type="text"
                inputMode="numeric"
                aria-label={`Precio ${label}`}
                aria-invalid={error ? true : undefined}
                value={draft.text}
                disabled={draft.consult || saving}
                onChange={(event) => update(variant.id, { text: event.target.value })}
                className={inputClass}
              />
              <label className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem]">
                <input
                  type="checkbox"
                  aria-label={`Consultar en barra: ${label}`}
                  checked={draft.consult}
                  disabled={saving}
                  onChange={(event) => update(variant.id, { consult: event.target.checked })}
                  className="size-5 accent-[var(--color-heraldo)]"
                />
                <span aria-hidden="true">Consultar en barra</span>
              </label>
              {error ? <p className="text-[0.875rem] font-semibold text-mostaza">{error}</p> : null}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryClass} disabled={saving || !valid || changes.length === 0} onClick={() => onSave(changes)}>
          Guardar precios
        </button>
        {modified ? <Unsaved>Cambios sin guardar</Unsaved> : null}
      </div>
    </div>
  )
}

function ProductDataForm({ product, saving, onEdit, onCancel, onSave }: {
  product: AdminProduct
  saving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (changes: { name: string; description: string | null; madeToOrder: boolean; madeToOrderNotice: string | null }) => void
}) {
  const ids = { name: useId(), description: useId(), notice: useId() }
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? '',
    madeToOrder: product.madeToOrder,
    madeToOrderNotice: product.madeToOrderNotice ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<'name' | 'madeToOrderNotice', string>>>({})
  const edit = (next: Partial<typeof form>) => {
    onEdit()
    setForm({ ...form, ...next })
  }
  const modified =
    form.name !== product.name ||
    form.description !== (product.description ?? '') ||
    form.madeToOrder !== product.madeToOrder ||
    form.madeToOrderNotice !== (product.madeToOrderNotice ?? '')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = validateProductEdit(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    onSave(result.changes)
  }

  return (
    <form aria-label={`Datos de ${product.name}`} onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-chapa-high/60 p-3 ring-1 ring-chapa-edge">
      <div>
        <label htmlFor={ids.name} className="font-bold">
          Nombre
        </label>
        <input id={ids.name} value={form.name} onChange={(event) => edit({ name: event.target.value })} className={`${inputClass} mt-1`} aria-invalid={errors.name ? true : undefined} />
        {errors.name ? <p className="text-[0.875rem] font-semibold text-mostaza">{errors.name}</p> : null}
      </div>
      <div>
        <label htmlFor={ids.description} className="font-bold">
          Descripción
        </label>
        <textarea
          id={ids.description}
          rows={2}
          value={form.description}
          onChange={(event) => edit({ description: event.target.value })}
          className="mt-1 w-full rounded-xl bg-chapa px-3 py-2 text-[1rem] ring-1 ring-chapa-edge focus-visible:ring-0"
        />
      </div>
      <label className="inline-flex min-h-11 items-center gap-2 font-semibold">
        <input
          type="checkbox"
          checked={form.madeToOrder}
          onChange={(event) => edit({ madeToOrder: event.target.checked })}
          className="size-5 accent-[var(--color-heraldo)]"
        />
        Solo por encargo
      </label>
      <div>
        <label htmlFor={ids.notice} className="font-bold">
          Aviso de anticipación
        </label>
        <input id={ids.notice} value={form.madeToOrderNotice} onChange={(event) => edit({ madeToOrderNotice: event.target.value })} className={`${inputClass} mt-1`} aria-invalid={errors.madeToOrderNotice ? true : undefined} />
        {errors.madeToOrderNotice ? <p className="text-[0.875rem] font-semibold text-mostaza">{errors.madeToOrderNotice}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryClass} disabled={saving}>
          Guardar datos
        </button>
        <button type="button" className={buttonClass} onClick={onCancel}>
          Cancelar
        </button>
        {modified ? <Unsaved>Cambios sin guardar</Unsaved> : null}
      </div>
    </form>
  )
}

function ProductCard({ product, repository, onSaved, onReload }: {
  product: AdminProduct
  repository: AdminCatalogRepository
  onSaved: (product: AdminProduct) => void
  onReload: () => void
}) {
  const headingId = useId()
  const [editing, setEditing] = useState(false)
  const { run, clear, view, saving } = useSave(onReload)

  const saveFields = (changes: Parameters<AdminCatalogRepository['updateProduct']>[1]) =>
    run(async () => {
      const saved = await repository.updateProduct(product.id, changes, product.updatedAt)
      onSaved({ ...saved, variants: product.variants })
    })

  const savePrices = (changes: { variant: AdminVariant; price: number | null }[]) =>
    void run(async () => {
      const saved = await repository.updatePrices(
        product.id,
        changes.map(({ variant, price }) => ({ variantId: variant.id, price, updatedAt: variant.updatedAt })),
      )
      const byId = new Map(saved.map((variant) => [variant.id, variant]))
      onSaved({ ...product, variants: product.variants.map((variant) => ({ ...variant, ...byId.get(variant.id) })) })
    })

  const priceKey = product.variants.map((variant) => `${variant.id}:${variant.updatedAt}`).join('|')

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-2xl bg-chapa-high/40 p-4 ring-1 ring-chapa-edge">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="text-[1.125rem] font-bold">
          {product.name}
        </h3>
        {!product.visible ? <span className="rounded-full bg-chapa px-2.5 py-0.5 text-[0.8125rem] text-mostaza ring-1 ring-chapa-edge">Oculto en la carta</span> : null}
        {product.outOfStock ? <span className="rounded-full bg-chapa px-2.5 py-0.5 text-[0.8125rem] text-crema-muted ring-1 ring-chapa-edge">Sin stock</span> : null}
      </div>
      <div className="flex flex-wrap gap-x-6">
        <Toggle label={`Sin stock: ${product.name}`} checked={product.outOfStock} disabled={saving} onChange={(outOfStock) => saveFields({ outOfStock })} />
        <Toggle label={`Visible: ${product.name}`} checked={product.visible} disabled={saving} onChange={(visible) => saveFields({ visible })} />
      </div>
      <PriceEditor key={priceKey} product={product} saving={saving} onEdit={clear} onSave={savePrices} />
      {editing ? (
        <ProductDataForm
          product={product}
          saving={saving}
          onEdit={clear}
          onCancel={() => setEditing(false)}
          onSave={(changes) =>
            void saveFields(changes).then((ok) => {
              if (ok) setEditing(false)
            })
          }
        />
      ) : (
        <div>
          <button type="button" className={buttonClass} onClick={() => setEditing(true)}>
            Editar datos de {product.name}
          </button>
        </div>
      )}
      {view}
    </section>
  )
}

function CategorySection({ category, repository, onSaved, onProductSaved, onReload }: {
  category: AdminCategory
  repository: AdminCatalogRepository
  onSaved: (category: Omit<AdminCategory, 'products'>) => void
  onProductSaved: (product: AdminProduct) => void
  onReload: () => void
}) {
  const nameId = useId()
  const [name, setName] = useState(category.name)
  const { run, clear, view, saving } = useSave(onReload)
  const checked = validateName(name)
  const dirty = checked.ok && checked.value !== category.name
  const count = category.products.length

  const save = (changes: { name?: string; visible?: boolean }) =>
    run(async () => {
      const saved = await repository.updateCategory(category.id, changes, category.updatedAt)
      onSaved(saved)
      setName(saved.name)
    })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-chapa-edge pb-4">
        <h2 className="type-display text-[1.5rem]">{category.name}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor={nameId} className="text-[0.9375rem] font-bold">
              Nombre
            </label>
            <input
              id={nameId}
              aria-label={`Nombre de la categoría ${category.name}`}
              value={name}
              onChange={(event) => {
                clear()
                setName(event.target.value)
              }}
              aria-invalid={checked.ok ? undefined : true}
              className={`${inputClass} mt-1`}
            />
            {!checked.ok ? <p className="text-[0.875rem] font-semibold text-mostaza">{checked.error}</p> : null}
          </div>
          <button
            type="button"
            aria-label={`Guardar nombre de ${category.name}`}
            className={primaryClass}
            disabled={saving || !dirty}
            onClick={() => checked.ok && void save({ name: checked.value })}
          >
            Guardar nombre
          </button>
          {name !== category.name ? <Unsaved>Nombre sin guardar</Unsaved> : null}
        </div>
        <Toggle
          label={`Visible: categoría ${category.name}`}
          checked={category.visible}
          disabled={saving}
          onChange={(visible) => save({ visible })}
          description={
            category.visible
              ? `Si la ocultás, también se ocultan sus ${count} productos.`
              : `Oculta: sus ${count} productos no se ven en la carta.`
          }
        />
        {view}
      </div>
      <div className="flex flex-col gap-3">
        {category.products.map((product) => (
          <ProductCard key={product.id} product={product} repository={repository} onSaved={onProductSaved} onReload={onReload} />
        ))}
      </div>
    </section>
  )
}

type LoadState = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; categories: AdminCategory[] }

export function CatalogEditor({ repository }: { repository: AdminCatalogRepository }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    repository.load().then(
      (categories) => {
        if (active) setState({ kind: 'ready', categories })
      },
      (error: unknown) => {
        if (!active) return
        console.error('The admin catalog could not be loaded', error)
        setState({ kind: 'failed' })
      },
    )
    return () => {
      active = false
    }
  }, [repository, attempt])

  const reload = useCallback(() => {
    setState({ kind: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  const patchCategory = (saved: Omit<AdminCategory, 'products'>) =>
    setState((current) =>
      current.kind === 'ready'
        ? { ...current, categories: current.categories.map((category) => (category.id === saved.id ? { ...category, ...saved } : category)) }
        : current,
    )

  const patchProduct = (saved: AdminProduct) =>
    setState((current) =>
      current.kind === 'ready'
        ? {
            ...current,
            categories: current.categories.map((category) => ({
              ...category,
              products: category.products.map((product) => (product.id === saved.id ? saved : product)),
            })),
          }
        : current,
    )

  if (state.kind === 'loading') {
    return (
      <p role="status" className="font-semibold">
        Cargando catálogo…
      </p>
    )
  }
  if (state.kind === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="font-semibold text-mostaza">
          No pudimos cargar el catálogo.
        </p>
        <button type="button" className={buttonClass} onClick={reload}>
          Reintentar
        </button>
      </div>
    )
  }
  if (state.categories.length === 0) {
    return <p className="text-crema-muted">El catálogo está vacío.</p>
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <button type="button" className={buttonClass} onClick={reload}>
          Recargar catálogo
        </button>
      </div>
      {state.categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          repository={repository}
          onSaved={patchCategory}
          onProductSaved={patchProduct}
          onReload={reload}
        />
      ))}
    </div>
  )
}

