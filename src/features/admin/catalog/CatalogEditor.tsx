import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import {
  AdminSaveError,
  type AdminCatalogRepository,
  type AdminCategory,
  type AdminProduct,
  type AdminVariant,
  type SaveFailure,
} from '@/features/admin/catalog/admin-catalog'
import { Sheet } from '@/components/ui/Sheet'
import './catalog-workspace.css'
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
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'failed'; reason: SaveFailure; retry: () => void }

const inputClass = 'admin-input'
const buttonClass = 'admin-button'
const primaryClass = 'admin-button admin-primary'

type Work = { dirty: boolean; saving: boolean; pinned?: boolean }
type ProductUpdate =
  | { kind: 'fields'; row: Omit<AdminProduct, 'variants'> }
  | { kind: 'prices'; productId: string; variants: Pick<AdminVariant, 'id' | 'price' | 'updatedAt'>[] }

type ReportWork = (id: string, work: Work) => void
function useWork(id: string, dirty: boolean, saving: boolean, report: ReportWork, pinned = false) {
  useEffect(() => {
    report(id, { dirty, saving, pinned })
  }, [id, dirty, saving, pinned, report])
}
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
type Filters = { category: string; query: string; visibility: string; stock: string; attention: string }
const emptyFilters: Filters = { category: '', query: '', visibility: '', stock: '', attention: '' }
function matches(product: AdminProduct, category: AdminCategory, filters: Filters, dirty: boolean) {
  return (
    (!filters.category || filters.category === category.id) &&
    normalize(product.name).includes(normalize(filters.query.trim())) &&
    (!filters.visibility ||
      (filters.visibility === 'visible'
        ? product.visible && category.visible
        : !product.visible || !category.visible)) &&
    (!filters.stock || product.outOfStock === (filters.stock === 'out')) &&
    (!filters.attention ||
      (filters.attention === 'pending'
        ? dirty
        : filters.attention === 'order'
          ? product.madeToOrder
          : product.variants.some((v) => v.price === null)))
  )
}

function Unsaved({ children }: { children: ReactNode }) {
  return <p className="text-[0.875rem] font-semibold text-mostaza">{children}</p>
}

const formatPrice = (price: number) => String(price).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

function failureReason(error: unknown): SaveFailure {
  return error instanceof AdminSaveError ? error.reason : 'unavailable'
}

/** Runs one save and reports it through the shared feedback of a card or a category. */
function useSave(onReload: () => void, label = '') {
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
  const clear = useCallback(
    () => setFeedback((current) => (current.kind === 'saving' ? current : { kind: 'idle' })),
    [],
  )
  const view = <SaveFeedback feedback={feedback} onReload={onReload} label={label} />
  return { run, clear, view, failed: feedback.kind === 'failed', saving: feedback.kind === 'saving' }
}

function SaveFeedback({ feedback, onReload, label }: { feedback: Feedback; onReload: () => void; label: string }) {
  if (feedback.kind === 'idle') return null
  if (feedback.kind === 'saving' || feedback.kind === 'saved') {
    return (
      <p role="status" className="text-[0.9375rem] font-semibold text-crema-muted">
        {label ? `${label}: ` : ''}
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
function Toggle({
  label,
  checked,
  disabled,
  onChange,
  description,
}: {
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

function PriceEditor({
  product,
  saving,
  onEdit,
  onSave,
  onDirty,
}: {
  product: AdminProduct
  saving: boolean
  onEdit: () => void
  onSave: (changes: { variant: AdminVariant; price: number | null }[]) => void
  onDirty: (dirty: boolean) => void
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
    const draft = drafts[variant.id] ?? {
      text: variant.price === null ? '' : formatPrice(variant.price),
      consult: variant.price === null,
    }
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
  useEffect(() => {
    onDirty(modified)
  }, [modified, onDirty])
  const discard = () => {
    onEdit()
    setDrafts(
      Object.fromEntries(
        product.variants.map((v) => [
          v.id,
          { text: v.price === null ? '' : formatPrice(v.price), consult: v.price === null },
        ]),
      ),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ variant, draft, error, price }) => {
          const label = `${variant.name} de ${product.name}`
          return (
            <div
              key={variant.id}
              className="admin-price-field"
              data-modified={price !== variant.price || error !== null || undefined}
            >
              <span className="font-bold">{variant.name}</span>
              <span className="admin-current">
                Actual: {variant.price === null ? 'Consultar en barra' : `$${formatPrice(variant.price)}`}
              </span>
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
        <button
          type="button"
          className={primaryClass}
          disabled={saving || !valid || changes.length === 0}
          onClick={() => onSave(changes)}
        >
          Guardar precios
        </button>
        {modified ? (
          <>
            <button type="button" className={buttonClass} disabled={saving} onClick={discard}>
              Descartar precios
            </button>
            <Unsaved>Cambios sin guardar</Unsaved>
          </>
        ) : null}
      </div>
    </div>
  )
}

function ProductDataForm({
  product,
  saving,
  onEdit,
  onCancel,
  onSave,
  onDirty,
}: {
  product: AdminProduct
  saving: boolean
  onEdit: () => void
  onCancel: () => void
  onDirty: (dirty: boolean) => void
  onSave: (changes: {
    name: string
    description: string | null
    madeToOrder: boolean
    madeToOrderNotice: string | null
  }) => void
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

  useEffect(() => {
    onDirty(modified)
  }, [modified, onDirty])

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
    <form aria-label={`Datos de ${product.name}`} onSubmit={submit} className="admin-data-form">
      <fieldset disabled={saving} className="contents">
        <div>
          <label htmlFor={ids.name} className="font-bold">
            Nombre
          </label>
          <input
            id={ids.name}
            data-modified={form.name !== product.name || undefined}
            value={form.name}
            onChange={(event) => edit({ name: event.target.value })}
            className={`${inputClass} mt-1`}
            aria-invalid={errors.name ? true : undefined}
          />
          {errors.name ? <p className="text-[0.875rem] font-semibold text-mostaza">{errors.name}</p> : null}
        </div>
        <div>
          <label htmlFor={ids.description} className="font-bold">
            Descripción
          </label>
          <textarea
            id={ids.description}
            data-modified={form.description !== (product.description ?? '') || undefined}
            rows={2}
            value={form.description}
            onChange={(event) => edit({ description: event.target.value })}
            className="admin-input admin-description"
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
          <input
            id={ids.notice}
            data-modified={form.madeToOrderNotice !== (product.madeToOrderNotice ?? '') || undefined}
            value={form.madeToOrderNotice}
            onChange={(event) => edit({ madeToOrderNotice: event.target.value })}
            className={`${inputClass} mt-1`}
            aria-invalid={errors.madeToOrderNotice ? true : undefined}
          />
          {errors.madeToOrderNotice ? (
            <p className="text-[0.875rem] font-semibold text-mostaza">{errors.madeToOrderNotice}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryClass} disabled={saving}>
            Guardar datos
          </button>
          <button type="button" className={buttonClass} disabled={saving} onClick={onCancel}>
            Descartar cambios
          </button>
          {modified ? <Unsaved>Cambios sin guardar</Unsaved> : null}
        </div>
      </fieldset>
    </form>
  )
}

function ProductCard({
  product,
  category,
  repository,
  onSaved,
  onReload,
  visible,
  report,
}: {
  product: AdminProduct
  category: AdminCategory
  repository: AdminCatalogRepository
  onSaved: (update: ProductUpdate) => void
  onReload: () => void
  visible: boolean
  report: ReportWork
}) {
  const headingId = useId()
  const detailId = useId()
  const [editing, setEditing] = useState(false)
  const [pricing, setPricing] = useState(false)
  const [dataRevision, setDataRevision] = useState(0)
  const [priceDirty, setPriceDirty] = useState(false)
  const [dataDirty, setDataDirty] = useState(false)
  const statusSave = useSave(onReload, 'Estado')
  const priceSave = useSave(onReload, 'Precios')
  const dataSave = useSave(onReload, 'Datos')
  // Serialize saves per product so each request uses the last acknowledged token.
  const saving = statusSave.saving || priceSave.saving || dataSave.saving
  const failed = statusSave.failed || priceSave.failed || dataSave.failed
  useWork(`product:${product.id}`, priceDirty || dataDirty, saving, report, failed || editing || saving)
  const saveFields = (changes: Parameters<AdminCatalogRepository['updateProduct']>[1], data = false) =>
    (data ? dataSave : statusSave).run(async () => {
      const saved = await repository.updateProduct(product.id, changes, product.updatedAt)
      onSaved({ kind: 'fields', row: saved })
      if (data) {
        setDataRevision((value) => value + 1)
        setEditing(false)
      }
    })
  const savePrices = (changes: { variant: AdminVariant; price: number | null }[]) =>
    void priceSave.run(async () => {
      const saved = await repository.updatePrices(
        product.id,
        changes.map(({ variant, price }) => ({ variantId: variant.id, price, updatedAt: variant.updatedAt })),
      )
      onSaved({ kind: 'prices', productId: product.id, variants: saved })
    })
  const priceKey = product.variants.map((variant) => `${variant.id}:${variant.updatedAt}`).join('|')
  return (
    <section
      aria-labelledby={headingId}
      hidden={!visible && !editing && !saving && !failed}
      className="admin-product-card"
    >
      <div className="admin-product-heading">
        <div>
          <span className="admin-eyebrow">{category.name}</span>
          <h3 id={headingId}>{product.name}</h3>
        </div>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setEditing(true)}
          aria-label={`Editar datos de ${product.name}`}
        >
          Editar datos
        </button>
      </div>
      <div className="admin-badges">
        {!product.visible ? <span>Oculto en la carta</span> : null}
        {!category.visible ? <span>Oculto por categoría</span> : null}
        {product.outOfStock ? <span>Sin stock</span> : null}
        {product.madeToOrder ? <span>Por encargo</span> : null}
        {product.visible && category.visible && !product.outOfStock ? (
          <span className="admin-active">Disponible</span>
        ) : null}
        {dataDirty ? <span className="admin-pending">Datos pendientes</span> : null}
        {priceDirty ? <span className="admin-pending">Precios pendientes</span> : null}
      </div>
      <div className="admin-quick-state">
        <Toggle
          label={`Sin stock: ${product.name}`}
          checked={product.outOfStock}
          disabled={saving}
          onChange={(outOfStock) => saveFields({ outOfStock })}
        />
        <Toggle
          label={`Visible: ${product.name}`}
          checked={product.visible}
          disabled={saving}
          onChange={(visible) => saveFields({ visible })}
        />
        <fieldset disabled={saving} className="contents">
          {statusSave.view}
        </fieldset>
      </div>
      <div className="admin-price-summary">
        <div>
          {product.variants.map((variant) => (
            <span key={variant.id}>
              <small>{variant.name}</small>
              <strong>{variant.price === null ? 'Consultar en barra' : `$${formatPrice(variant.price)}`}</strong>
            </span>
          ))}
        </div>
        <button
          type="button"
          className={buttonClass}
          aria-expanded={pricing}
          aria-label={`${pricing ? 'Cerrar' : 'Editar'} precios de ${product.name}`}
          onClick={() => setPricing((value) => !value)}
        >
          {pricing ? 'Cerrar precios' : 'Editar precios'}
        </button>
      </div>
      <div hidden={!pricing} className="admin-inline-prices">
        <PriceEditor
          key={priceKey}
          product={product}
          saving={saving}
          onDirty={setPriceDirty}
          onEdit={priceSave.clear}
          onSave={savePrices}
        />
      </div>
      <fieldset disabled={saving} className="contents">
        {priceSave.view}
      </fieldset>
      <fieldset disabled={saving} className="contents">
        {!editing ? dataSave.view : null}
      </fieldset>
      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        labelledBy={detailId}
        dismissOnBackdrop={false}
        header={
          <div>
            <span className="admin-eyebrow">Datos del producto</span>
            <h2 id={detailId}>{product.name}</h2>
          </div>
        }
      >
        <p className="admin-detail-hint">Los cambios se conservan al cerrar. Guardá cada grupo cuando esté listo.</p>
        <ProductDataForm
          key={dataRevision}
          product={product}
          saving={saving}
          onDirty={setDataDirty}
          onEdit={dataSave.clear}
          onCancel={() => {
            dataSave.clear()
            setDataRevision((value) => value + 1)
          }}
          onSave={(changes) => {
            void saveFields(changes, true)
          }}
        />
        <fieldset disabled={saving} className="admin-detail-feedback">
          {dataSave.view}
        </fieldset>
      </Sheet>
    </section>
  )
}

function CategorySection({
  category,
  repository,
  onSaved,
  onProductSaved,
  onReload,
  filters,
  work,
  report,
}: {
  category: AdminCategory
  repository: AdminCatalogRepository
  onSaved: (category: Omit<AdminCategory, 'products'>) => void
  onProductSaved: (update: ProductUpdate) => void
  filters: Filters
  work: Record<string, Work>
  report: ReportWork
  onReload: () => void
}) {
  const nameId = useId()
  const [name, setName] = useState(category.name)
  const { run, clear, view, saving, failed } = useSave(onReload)
  const checked = validateName(name)
  const dirty = name !== category.name
  useWork(`category:${category.id}`, dirty, saving, report, failed || saving)
  const count = category.products.length
  const hasMatches = category.products.some((product) =>
    matches(product, category, filters, work[`product:${product.id}`]?.dirty ?? false),
  )
  const filtering = Boolean(filters.query.trim() || filters.visibility || filters.stock || filters.attention)
  const keepCategoryDraft = dirty && filters.attention === 'pending'

  const save = (changes: { name?: string; visible?: boolean }) =>
    run(async () => {
      const saved = await repository.updateCategory(category.id, changes, category.updatedAt)
      onSaved(saved)
      // Only a saved name replaces the draft: saving the visibility must not erase a name typed but not yet saved.
      if (changes.name !== undefined) setName(saved.name)
    })

  return (
    <section
      className="admin-category"
      hidden={
        ((!!filters.category && filters.category !== category.id) ||
          (filtering && !hasMatches && !keepCategoryDraft)) &&
        !failed &&
        !saving &&
        !category.products.some((product) => work[`product:${product.id}`]?.pinned)
      }
    >
      <div className="admin-category-heading">
        <h2>{category.name}</h2>
        <span>{count} productos</span>
      </div>
      <details className="admin-category-settings">
        <summary>Editar categoría</summary>
        <div className="admin-category-form">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label htmlFor={nameId} className="text-[0.9375rem] font-bold">
                Nombre
              </label>
              <input
                id={nameId}
                aria-label={`Nombre de la categoría ${category.name}`}
                value={name}
                data-modified={dirty || undefined}
                disabled={saving}
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
              disabled={saving || !dirty || !checked.ok}
              onClick={() => checked.ok && void save({ name: checked.value })}
            >
              Guardar nombre
            </button>
            {dirty ? (
              <>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={saving}
                  onClick={() => {
                    clear()
                    setName(category.name)
                  }}
                >
                  Descartar nombre
                </button>
                <Unsaved>Nombre sin guardar</Unsaved>
              </>
            ) : null}
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
        </div>
      </details>
      <fieldset disabled={saving} className="contents">
        {view}
      </fieldset>
      <div className="admin-product-list">
        {category.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            category={category}
            repository={repository}
            onSaved={onProductSaved}
            onReload={onReload}
            report={report}
            visible={matches(product, category, filters, work[`product:${product.id}`]?.dirty ?? false)}
          />
        ))}
      </div>
    </section>
  )
}

type LoadState = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; categories: AdminCategory[] }

export function CatalogEditor({
  repository,
  onWorkChange,
}: {
  repository: AdminCatalogRepository
  onWorkChange?: (work: Work) => void
}) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersId = useId()
  const [work, setWork] = useState<Record<string, Work>>({})
  const dirty = Object.values(work).some((value) => value.dirty)
  const saving = Object.values(work).some((value) => value.saving)
  const report = useCallback<ReportWork>(
    (id, next) =>
      setWork((current) =>
        current[id]?.dirty === next.dirty && current[id]?.saving === next.saving && current[id]?.pinned === next.pinned
          ? current
          : { ...current, [id]: next },
      ),
    [],
  )
  useEffect(() => {
    onWorkChange?.({ dirty, saving })
  }, [dirty, saving, onWorkChange])
  useEffect(
    () => () => {
      onWorkChange?.({ dirty: false, saving: false })
    },
    [onWorkChange],
  )
  useEffect(() => {
    if (!dirty && !saving) return
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty, saving])

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
    if (saving || (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartarlos y recargar el catálogo?'))) return
    setWork({})
    setState({ kind: 'loading' })
    setAttempt((value) => value + 1)
  }, [dirty, saving])

  const patchCategory = (saved: Omit<AdminCategory, 'products'>) =>
    setState((current) =>
      current.kind === 'ready'
        ? {
            ...current,
            categories: current.categories.map((category) =>
              category.id === saved.id ? { ...category, ...saved } : category,
            ),
          }
        : current,
    )

  const patchProduct = (update: ProductUpdate) =>
    setState((current) =>
      current.kind === 'ready'
        ? {
            ...current,
            categories: current.categories.map((category) => ({
              ...category,
              products: category.products.map((product) => {
                const id = update.kind === 'fields' ? update.row.id : update.productId
                if (product.id !== id) return product
                // A retained retry only owns its response scope, never a sibling save's current state.
                if (update.kind === 'fields') return { ...product, ...update.row, variants: product.variants }
                const byId = new Map(update.variants.map((variant) => [variant.id, variant]))
                return {
                  ...product,
                  variants: product.variants.map((variant) => ({ ...variant, ...byId.get(variant.id) })),
                }
              }),
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

  const resultCount = state.categories.reduce(
    (count, category) =>
      count +
      category.products.filter((product) =>
        matches(product, category, filters, work[`product:${product.id}`]?.dirty ?? false),
      ).length,
    0,
  )
  const setFilter = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }))
  return (
    <div className="admin-catalog">
      <div className="admin-workspace-intro">
        <div>
          <p className="admin-eyebrow">Tu carta, al día</p>
          <h1>Catálogo</h1>
          <p>Encontrá un producto y actualizá lo que necesites.</p>
        </div>
        <button type="button" className={buttonClass} disabled={saving} onClick={reload}>
          Recargar catálogo
        </button>
      </div>
      {dirty ? (
        <p className="admin-work-summary">Tenés cambios pendientes. Se conservan mientras navegás por el catálogo.</p>
      ) : null}
      <div className="admin-workspace-layout">
        <nav aria-label="Categorías del catálogo" className="admin-category-nav">
          <span className="admin-eyebrow">Categorías</span>
          <button
            type="button"
            aria-current={!filters.category ? 'page' : undefined}
            onClick={() => setFilter('category', '')}
          >
            Todos los productos<span>{state.categories.reduce((n, c) => n + c.products.length, 0)}</span>
          </button>
          {state.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-current={filters.category === category.id ? 'page' : undefined}
              onClick={() => setFilter('category', category.id)}
            >
              {category.name}
              <span>{category.products.length}</span>
            </button>
          ))}
        </nav>
        <div className="admin-workspace-main">
          <div className="admin-search-tools">
            <label className="admin-search-label">
              Buscar productos
              <input
                type="search"
                className={inputClass}
                placeholder="Nombre del producto…"
                value={filters.query}
                onChange={(event) => setFilter('query', event.target.value)}
              />
            </label>
            <button
              type="button"
              className="admin-button admin-filter-toggle"
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              Filtros
              {[filters.visibility, filters.stock, filters.attention].filter(Boolean).length > 0
                ? ` (${[filters.visibility, filters.stock, filters.attention].filter(Boolean).length} activos)`
                : ''}
            </button>
            <div id={filtersId} className="admin-filter-row" data-open={filtersOpen}>
              <label>
                Visibilidad
                <select
                  className={inputClass}
                  value={filters.visibility}
                  onChange={(event) => setFilter('visibility', event.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="visible">Visibles</option>
                  <option value="hidden">Ocultos</option>
                </select>
              </label>
              <label>
                Disponibilidad
                <select
                  className={inputClass}
                  value={filters.stock}
                  onChange={(event) => setFilter('stock', event.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="available">Disponibles</option>
                  <option value="out">Sin stock</option>
                </select>
              </label>
              <label>
                Revisar
                <select
                  className={inputClass}
                  value={filters.attention}
                  onChange={(event) => setFilter('attention', event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="pending">Cambios pendientes</option>
                  <option value="order">Por encargo</option>
                  <option value="consult">Consultar en barra</option>
                </select>
              </label>
              <button type="button" className={buttonClass} onClick={() => setFilters(emptyFilters)}>
                Limpiar filtros
              </button>
            </div>
          </div>
          <p className="admin-result-count" aria-live="polite">
            {resultCount} {resultCount === 1 ? 'producto' : 'productos'}
            <span className="admin-result-hint"> · Los cambios se ven al recargar la carta.</span>
          </p>
          {Object.values(work).some((value) => value.pinned) ? (
            <p className="admin-result-count">
              Los productos abiertos, guardándose o con errores permanecen visibles hasta resolverlos.
            </p>
          ) : null}
          {resultCount === 0 ? (
            <div className="admin-empty">
              <h2>No encontramos productos</h2>
              <p>Probá otro nombre o limpiá los filtros.</p>
            </div>
          ) : null}
          {state.categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              repository={repository}
              onSaved={patchCategory}
              onProductSaved={patchProduct}
              onReload={reload}
              filters={filters}
              work={work}
              report={report}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
