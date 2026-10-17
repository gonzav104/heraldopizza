import { expect, test, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './local-admin.ts'
import { localStackEnv } from './local-stack.ts'

// U5, end to end: the administrator changes the catalog in /admin, Supabase persists it, and the public menu shows it
// on reload. Runs against the local stack, reset from the seed by global-setup.ts. Region names are matched exactly:
// the seed has «Napolitana» and «Napolitana Heraldo», «Fugazzeta» and «Fugazzeta 4 Quesos».

const stack = localStackEnv()

/** Reads the Data API as the public menu does: publishable key only, so row level security applies. */
async function publicRead<T>(path: string): Promise<T> {
  const response = await fetch(new URL(path, stack.VITE_SUPABASE_URL), {
    headers: { apikey: stack.VITE_SUPABASE_PUBLISHABLE_KEY },
  })
  expect(response.ok).toBe(true)
  return (await response.json()) as T
}

async function publicPrice(product: string, variant: string): Promise<number | null> {
  const rows = await publicRead<{ precio: number | null }[]>(
    `/rest/v1/variantes?select=precio,productos!inner(nombre)&nombre=eq.${encodeURIComponent(variant)}` +
      `&productos.nombre=eq.${encodeURIComponent(product)}`,
  )
  expect(rows).toHaveLength(1)
  return rows[0].precio
}

async function productId(name: string): Promise<string> {
  const rows = await publicRead<{ id: string }[]>(`/rest/v1/productos?select=id&nombre=eq.${encodeURIComponent(name)}`)
  expect(rows).toHaveLength(1)
  return rows[0].id
}

async function signIn(page: Page) {
  await page.goto('/admin')
  await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Pizzas', exact: true })).toBeVisible()
}

const card = (page: Page, name: string) => page.getByRole('region', { name, exact: true })

test('a price saved in /admin is persisted and shown by the public menu', async ({ page, context }) => {
  await signIn(page)
  const muzza = card(page, 'Muzzarella')

  await muzza.getByLabel('Precio Entera de Muzzarella').fill('18.750')
  await muzza.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(muzza.getByRole('status')).toHaveText('Guardado')

  expect(await publicPrice('Muzzarella', 'Entera')).toBe(18750)

  const menu = await context.newPage()
  await menu.goto('/')
  await expect(menu.getByRole('button', { name: /^Sumar Muzzarella, Entera, \$\s?18\.750/ })).toBeVisible()
})

test('an out-of-stock product stays on the menu but cannot be ordered', async ({ page, context }) => {
  await signIn(page)
  const fugazzeta = card(page, 'Fugazzeta')

  await fugazzeta.getByRole('checkbox', { name: 'Sin stock: Fugazzeta', exact: true }).check()
  await expect(fugazzeta.getByRole('status')).toHaveText('Guardado')

  const menu = await context.newPage()
  await menu.goto('/')
  await expect(menu.getByRole('button', { name: /^Sumar Fugazzeta, Entera/ })).toBeDisabled()
})

test('a hidden product disappears from the menu, and comes back when shown again', async ({ page, context }) => {
  await signIn(page)
  const napolitana = card(page, 'Napolitana')
  const visible = napolitana.getByRole('checkbox', { name: 'Visible: Napolitana', exact: true })

  await visible.uncheck()
  await expect(napolitana.getByRole('status')).toHaveText('Guardado')
  const menu = await context.newPage()
  await menu.goto('/')
  await expect(menu.getByRole('heading', { level: 2, name: 'Pizzas', exact: true })).toBeVisible()
  await expect(menu.getByRole('button', { name: /^Sumar Napolitana, Entera/ })).toHaveCount(0)
  await expect(menu.getByRole('button', { name: /^Sumar Napolitana Heraldo, Entera/ })).toBeVisible()

  await visible.check()
  await expect(napolitana.getByRole('status')).toHaveText('Guardado')
  await menu.reload()
  await expect(menu.getByRole('button', { name: /^Sumar Napolitana, Entera/ })).toBeVisible()
})

test('a renamed product keeps its id, and the menu shows the new name', async ({ page, context }) => {
  await signIn(page)
  const idBefore = await productId('Especial')

  await card(page, 'Especial').getByRole('button', { name: 'Editar datos de Especial' }).click()
  const form = page.getByRole('form', { name: 'Datos de Especial' })
  await form.getByLabel('Nombre', { exact: true }).fill('  Especial de la casa  ')
  await form.getByRole('button', { name: 'Guardar datos' }).click()
  await expect(card(page, 'Especial de la casa').getByRole('status')).toHaveText('Guardado')

  expect(await productId('Especial de la casa')).toBe(idBefore)

  const menu = await context.newPage()
  await menu.goto('/')
  await expect(menu.getByRole('button', { name: /^Sumar Especial de la casa, Entera/ })).toBeVisible()
})

test('two tabs editing the same price: the second save is refused as a conflict', async ({ page, context }) => {
  await signIn(page)
  const other = await context.newPage()
  await other.goto('/admin')
  await expect(other.getByRole('heading', { level: 2, name: 'Pizzas', exact: true })).toBeVisible()

  const first = card(page, 'Muzzarella')
  await first.getByLabel('Precio Media de Muzzarella').fill('11.100')
  await first.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(first.getByRole('status')).toHaveText('Guardado')

  const second = card(other, 'Muzzarella')
  await second.getByLabel('Precio Media de Muzzarella').fill('11.900')
  await second.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(second.getByRole('alert')).toHaveText('Otro cambio llegó antes. Recargá el catálogo para ver lo último.')

  expect(await publicPrice('Muzzarella', 'Media')).toBe(11100)
})
