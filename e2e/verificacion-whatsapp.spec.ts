import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './local-admin.ts'

// P6, end to end against the local Supabase (reset by global-setup.ts): «Ver mensaje» checks the order with a fresh
// catalog, a price changed in /admin meanwhile must be accepted, a network failure blocks with «Reintentar», and the
// WhatsApp action stays disabled (VITE_WHATSAPP_ENABLED is not set). Any request to WhatsApp is intercepted and
// counted: no test ever reaches it.

async function guardWhatsApp(context: BrowserContext) {
  const hits: string[] = []
  await context.route(/https:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//, async (route) => {
    hits.push(route.request().url())
    await route.fulfill({ status: 204, body: '' })
  })
  return hits
}

/** The Muzzarella entera as the menu prices it now (other specs may have changed it in /admin). */
async function menuPrice(page: Page): Promise<string> {
  const label = (await page.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }).getAttribute('aria-label')) ?? ''
  return /\$\s?([\d.]+)/.exec(label)?.[1] ?? ''
}

async function toDetails(page: Page) {
  await page.goto('/')
  const price = await menuPrice(page)
  await page.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }).click()
  await page.getByRole('button', { name: /^Ver tu pedido/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Tu pedido' })
  await sheet.getByRole('button', { name: 'Continuar' }).click()
  const details = page.getByRole('dialog', { name: 'Tus datos' })
  await details.getByLabel('Nombre y apellido').fill('Ana Gómez')
  await details.getByRole('radio', { name: 'Retiro' }).check({ force: true })
  await details.getByRole('radio', { name: 'Efectivo' }).check({ force: true })
  return { details, price }
}

const preview = (page: Page) => page.getByRole('dialog', { name: 'Revisá el mensaje' })
const bubble = (page: Page) => preview(page).getByTestId('mensaje-whatsapp')

async function setMuzzaPrice(context: BrowserContext, price: string) {
  const admin = await context.newPage()
  await admin.goto('/admin')
  // The session survives in this browser context: sign in only when the panel asks for it.
  const email = admin.getByLabel('Email', { exact: true })
  const catalog = admin.getByRole('heading', { level: 2, name: 'Pizzas', exact: true })
  await expect(email.or(catalog)).toBeVisible()
  if (await email.isVisible()) {
    await email.fill(ADMIN_EMAIL)
    await admin.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD)
    await admin.getByRole('button', { name: 'Ingresar' }).click()
  }
  const muzza = admin.getByRole('region', { name: 'Muzzarella', exact: true })
  await muzza.getByRole('button', { name: 'Editar precios de Muzzarella', exact: true }).click()
  await muzza.getByLabel('Precio Entera de Muzzarella').fill(price)
  await muzza.getByRole('button', { name: 'Guardar precios' }).click()
  await expect(muzza.getByRole('status').filter({ hasText: 'Precios: Guardado' })).toBeVisible()
  await admin.close()
}

test('a valid order is checked and shows the message; the WhatsApp action stays disabled and nothing reaches it', async ({
  page,
  context,
}) => {
  const hits = await guardWhatsApp(context)
  const { price } = await toDetails(page)
  await page.getByRole('button', { name: /^Ver mensaje/ }).click()

  await expect(bubble(page)).toContainText(`1 × Muzzarella (Entera): $ ${price}`)
  await expect(bubble(page)).toContainText('Modalidad: Retiro')
  const action = page.getByRole('button', { name: 'Continuar en WhatsApp' })
  await expect(action).toBeDisabled()
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0)
  await action.click({ force: true })
  expect(hits).toEqual([])
})

test('a price changed in /admin before «Ver mensaje» is shown before and after, and must be accepted', async ({
  page,
  context,
}) => {
  await guardWhatsApp(context)
  const { price } = await toDetails(page)
  await setMuzzaPrice(context, '17.500')
  try {
    await page.getByRole('button', { name: /^Ver mensaje/ }).click()
    const changes = preview(page).getByRole('region', { name: 'Cambiaron precios' })
    await expect(changes).toContainText(`1 × Muzzarella (Entera): $ ${price} → $ 17.500`)
    await expect(changes).toContainText(`Total orientativo: $ ${price} → $ 17.500`)
    await expect(bubble(page)).toHaveCount(0)
    await preview(page).getByRole('button', { name: 'Aceptar el total actualizado' }).click()
    await expect(bubble(page)).toContainText('1 × Muzzarella (Entera): $ 17.500')
  } finally {
    await setMuzzaPrice(context, price)
  }
})

test('a network failure during the check blocks with «Reintentar» and keeps what was typed', async ({ page, context }) => {
  await guardWhatsApp(context)
  const { details } = await toDetails(page)
  await page.route('**/rest/v1/promociones*', (route) => route.abort('internetdisconnected'))
  await page.getByRole('button', { name: /^Ver mensaje/ }).click()

  await expect(preview(page).getByRole('alert')).toHaveText(
    'No pudimos verificar tu pedido. Revisá tu conexión e intentá de nuevo.',
  )
  await expect(bubble(page)).toHaveCount(0)
  // The menu behind stays as it was: no global error screen.
  await expect(page.getByText('No pudimos cargar la carta.')).toHaveCount(0)

  await preview(page).getByRole('button', { name: 'Volver al paso anterior' }).click()
  await expect(details.getByLabel('Nombre y apellido')).toHaveValue('Ana Gómez')
  await page.unroute('**/rest/v1/promociones*')
  await page.getByRole('button', { name: /^Ver mensaje/ }).click()
  await expect(bubble(page)).toContainText('Nombre: Ana Gómez')
})
