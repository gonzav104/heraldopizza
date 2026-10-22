import { expect, test, type Browser, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './local-admin.ts'

// P5b, end to end: the administrator manages promotions in /admin against the local Supabase (reset from the seed by
// global-setup.ts), and the public menu shows what the database publishes when it loads again.

async function openPromotions(page: Page) {
  await page.goto('/admin')
  await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Pizzas', exact: true })).toBeVisible()
  await showPromotions(page)
}

async function showPromotions(page: Page) {
  await page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('button', { name: 'Promociones' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Promociones' })).toBeVisible()
}

/** Reads the promotions again from the database: the session stays, the panel loads from scratch. */
async function reloadPanel(page: Page) {
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Pizzas', exact: true })).toBeVisible()
  await showPromotions(page)
}

const card = (page: Page, title: string) => page.getByRole('region', { name: title, exact: true })
const publicRail = (page: Page) => page.getByRole('region', { name: 'Promos' })

async function publicMenu(browser: Browser) {
  const page = await browser.newPage()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2, name: 'Pizzas' })).toBeVisible()
  return page
}

async function create(page: Page, kind: 'Combo cerrado' | 'Docena de empanadas a elección (12)', title: string, price: string) {
  await page.getByRole('button', { name: 'Nueva promoción' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nueva promoción' })
  await sheet.getByRole('radio', { name: kind }).check()
  await sheet.getByRole('textbox', { name: 'Título' }).fill(title)
  await sheet.getByRole('textbox', { name: 'Precio' }).fill(price)
  await sheet.getByRole('button', { name: 'Crear promoción' }).click()
  await expect(sheet).toBeHidden()
  await expect(card(page, title).getByText('Desactivada', { exact: true })).toBeVisible()
}

async function setVisible(page: Page, title: string, visible: boolean) {
  if (!visible) page.once('dialog', (dialog) => void dialog.accept())
  const toggle = card(page, title).getByRole('checkbox', { name: `Visible en la carta: ${title}` })
  await toggle.click()
  await expect(card(page, title).getByRole('status').filter({ hasText: 'Estado:' })).toHaveText('Estado: Guardado')
  await expect(toggle).toBeChecked({ checked: visible })
}

test('a new promotion is saved switched off, published on activation, repriced, and withdrawn on deactivation', async ({
  page,
  browser,
}) => {
  await openPromotions(page)
  await create(page, 'Combo cerrado', 'Promo de prueba E2E', '25.000')
  await expect(card(page, 'Promo de prueba E2E').getByText(/^promo-[0-9a-f]{32}$/)).toBeVisible()

  let menu = await publicMenu(browser)
  await expect(publicRail(menu).getByRole('article', { name: 'Promo de prueba E2E' })).toHaveCount(0)

  // Read back from the database, not from the screen: reload the panel.
  await reloadPanel(page)
  await setVisible(page, 'Promo de prueba E2E', true)
  await menu.reload()
  await expect(publicRail(menu).getByRole('article', { name: 'Promo de prueba E2E' })).toContainText('25.000')

  await card(page, 'Promo de prueba E2E').getByRole('button', { name: 'Editar Promo de prueba E2E' }).click()
  const sheet = page.getByRole('dialog', { name: 'Promo de prueba E2E' })
  await sheet.getByRole('textbox', { name: 'Precio' }).fill('26.500')
  await sheet.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(sheet).toBeHidden()
  await menu.reload()
  await expect(publicRail(menu).getByRole('article', { name: 'Promo de prueba E2E' })).toContainText('26.500')

  await setVisible(page, 'Promo de prueba E2E', false)
  await menu.reload()
  await expect(publicRail(menu).getByRole('article', { name: 'Promo de prueba E2E' })).toHaveCount(0)
  await menu.close()

  // A new dozen opens the 12-empanada configurator on the public menu.
  await create(page, 'Docena de empanadas a elección (12)', 'Docena E2E', '33.000')
  await expect(card(page, 'Docena E2E').getByText('Docena a elección: 12 empanadas')).toBeVisible()
  await setVisible(page, 'Docena E2E', true)
  menu = await publicMenu(browser)
  await publicRail(menu).getByRole('button', { name: /^Elegir los gustos de Docena E2E/ }).click()
  await expect(menu.getByRole('dialog', { name: 'Elegí tus 12 empanadas' })).toBeVisible()
  await menu.close()
  await setVisible(page, 'Docena E2E', false)
})

test('the order changes on the public menu, and a stale tab never overwrites a newer change', async ({ page, browser }) => {
  await openPromotions(page)
  const other = await browser.newPage()
  await openPromotions(other)

  // Move «Tres pizzas Muzzarella» above «Muzza + Especial + 6 empanadas de JyQ».
  await card(page, 'Tres pizzas Muzzarella').getByRole('button', { name: 'Subir Tres pizzas Muzzarella' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Orden: Guardado' })).toBeVisible()
  const menu = await publicMenu(browser)
  const titles = await publicRail(menu)
    .getByRole('article')
    .evaluateAll((items) => items.map((item) => item.ownerDocument.getElementById(item.getAttribute('aria-labelledby') ?? '')?.textContent))
  expect(titles.indexOf('Tres pizzas Muzzarella')).toBe(titles.indexOf('Muzza + Especial + 6 empanadas de JyQ') - 1)
  await menu.close()

  // The other tab still has the old order and tokens: its move and its price edit are refused, not applied.
  await card(other, 'Tres pizzas Muzzarella').getByRole('button', { name: 'Bajar Tres pizzas Muzzarella' }).click()
  await expect(other.getByRole('alert')).toHaveText('Otro cambio llegó antes. Recargá las promociones para ver lo último.')
  await card(other, 'Tres pizzas Muzzarella').getByRole('button', { name: 'Editar Tres pizzas Muzzarella' }).click()
  const sheet = other.getByRole('dialog', { name: 'Tres pizzas Muzzarella' })
  await sheet.getByRole('textbox', { name: 'Precio' }).fill('1')
  await sheet.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(sheet.getByRole('alert')).toHaveText('Otro cambio llegó antes. Recargá las promociones para ver lo último.')
  await other.close()

  await reloadPanel(page)
  await expect(card(page, 'Tres pizzas Muzzarella').getByText('$ 42.000')).toBeVisible()
  // Put it back for the other specs.
  await card(page, 'Tres pizzas Muzzarella').getByRole('button', { name: 'Bajar Tres pizzas Muzzarella' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Orden: Guardado' })).toBeVisible()
})

test('a create whose answer is lost is never sent twice: the owner refreshes the list and finds it', async ({ page }) => {
  await openPromotions(page)
  // The insert reaches the database, then the connection drops before the answer arrives.
  let inserts = 0
  await page.route('**/rest/v1/promociones*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    inserts++
    await route.fetch()
    await route.abort('connectionreset')
  })
  await page.getByRole('button', { name: 'Nueva promoción' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Nueva promoción' })
  await sheet.getByRole('textbox', { name: 'Título' }).fill('Promo sin respuesta')
  await sheet.getByRole('textbox', { name: 'Precio' }).fill('21.000')
  await sheet.getByRole('button', { name: 'Crear promoción' }).click()

  await expect(sheet.getByRole('alert')).toHaveText(
    'No pudimos confirmar si se creó la promoción. Actualizá la lista antes de volver a intentarlo.',
  )
  await expect(sheet.getByRole('button', { name: 'Crear promoción' })).toBeDisabled()
  await sheet.getByRole('button', { name: 'Actualizar la lista' }).click()
  await expect(sheet.getByRole('status')).toHaveText(
    'La lista se actualizó: apareció 1 promoción nueva. Revisá si es la que intentabas crear antes de volver a intentarlo.',
  )
  await expect(sheet.getByRole('textbox', { name: 'Título' })).toHaveValue('Promo sin respuesta')
  await sheet.getByRole('button', { name: 'Descartar' }).click()
  await sheet.getByRole('button', { name: 'Cerrar' }).click()
  await expect(card(page, 'Promo sin respuesta').getByText('Desactivada', { exact: true })).toBeVisible()
  expect(inserts).toBe(1)
})
