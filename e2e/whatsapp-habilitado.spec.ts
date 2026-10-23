import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { guardWhatsApp } from './whatsapp-guard.ts'

// P6b-2, end to end with the real link ON (this project's dev server sets VITE_WHATSAPP_ENABLED=true; every other spec
// runs with it off). Runs as an Android phone, an iPhone (emulated on Chromium), and a desktop. WhatsApp is intercepted
// for the whole context, popups included, and every request is counted: nothing here reaches WhatsApp. Opening
// wa.me never sends a message by itself: the customer sends it from WhatsApp.

const NUMBER = '5491170582325'
const desktop = (testInfo: { project: { name: string } }) => testInfo.project.name === 'whatsapp-escritorio'

/** A tap on a phone, a click on a desktop. */
const press = (locator: Locator, isDesktop: boolean) => (isDesktop ? locator.click() : locator.tap())

/** Builds the order and fills the details; stops before «Ver mensaje». */
async function toDetails(page: Page, isDesktop: boolean) {
  await page.goto('/')
  await page.getByRole('button', { name: /^Sumar Muzzarella, Entera/ }).click()
  if (isDesktop) await page.getByRole('complementary', { name: 'Tu pedido' }).getByRole('button', { name: 'Continuar' }).click()
  else {
    await page.getByRole('button', { name: /^Ver tu pedido/ }).click()
    await page.getByRole('dialog', { name: 'Tu pedido' }).getByRole('button', { name: 'Continuar' }).click()
  }
  const details = page.getByRole('dialog', { name: 'Tus datos' })
  await details.getByLabel('Nombre y apellido').fill('Ana Gómez')
  await details.getByRole('radio', { name: 'Envío' }).check({ force: true })
  await details.getByLabel('Dirección').fill('Rivadavia 100, Campana')
  await details.getByRole('radio', { name: 'Transferencia' }).check({ force: true })
}

async function toMessage(page: Page, isDesktop: boolean) {
  await toDetails(page, isDesktop)
  await page.getByRole('button', { name: /^Ver mensaje/ }).click()
}

const preview = (page: Page) => page.getByRole('dialog', { name: 'Revisá el mensaje' })
const bubble = (page: Page) => preview(page).getByTestId('mensaje-whatsapp')
const link = (page: Page) => page.getByRole('link', { name: 'Continuar en WhatsApp' })

/** Holds the catalog request of the final check until `release()`, so the «verifying» moment can be looked at. */
async function holdCheck(context: BrowserContext) {
  let release!: () => void
  const gate = new Promise<void>((resolve) => (release = resolve))
  await context.route('**/rest/v1/categorias*', async (route) => {
    await gate
    await route.continue()
  })
  return release
}

test('the link exists only once the order is verified, and carries exactly the message on screen', async ({ page, context }, testInfo) => {
  const hits = await guardWhatsApp(context)
  await toDetails(page, desktop(testInfo))
  // The first «Ver mensaje» runs the check: hold its catalog request to look at the moment it is still running.
  const release = await holdCheck(context)
  await page.getByRole('button', { name: /^Ver mensaje/ }).click()

  await expect(preview(page).getByRole('status')).toHaveText('Verificando precios y disponibilidad…')
  await expect(link(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continuar en WhatsApp' })).toBeDisabled()
  release()

  await expect(bubble(page)).toBeVisible()
  await expect(link(page)).toBeVisible()
  const href = (await link(page).getAttribute('href')) ?? ''
  expect(href.startsWith(`https://wa.me/${NUMBER}?text=`)).toBe(true)
  expect([...new URL(href).searchParams.keys()]).toEqual(['text'])
  expect(new URL(href).searchParams.get('text')).toBe(await bubble(page).textContent())
  await expect(link(page)).toHaveAttribute('target', '_blank')
  await expect(link(page)).toHaveAttribute('rel', 'noopener noreferrer')
  const text = new URL(href).searchParams.get('text') ?? ''
  expect(text).toContain('Modalidad: Envío')
  expect(text).toContain('Dirección: Rivadavia 100, Campana')
  expect(text).toContain('Reparto en motito: Se paga aparte')
  expect(text).not.toMatch(/Recargo crédito/)
  expect(hits).toEqual([])
})

test('opening it goes to wa.me in a new tab, keeps the order, sends nothing, and the customer is who sends', async ({ page, context }, testInfo) => {
  const hits = await guardWhatsApp(context)
  await toMessage(page, desktop(testInfo))
  await expect(link(page)).toBeVisible()
  const expected = await bubble(page).textContent()

  const [popup] = await Promise.all([context.waitForEvent('page'), press(link(page), desktop(testInfo))])
  await popup.waitForLoadState()

  expect(hits).toHaveLength(1)
  expect(hits[0].method).toBe('GET')
  const opened = new URL(hits[0].url)
  expect(opened.origin + opened.pathname).toBe(`https://wa.me/${NUMBER}`)
  expect(opened.searchParams.get('text')).toBe(expected)
  // The order and its message are still there: opening WhatsApp empties nothing (RF-21 is F2).
  await expect(bubble(page)).toHaveText(expected ?? '')
  await expect(preview(page).getByText(/El pedido no queda confirmado automáticamente/)).toBeVisible()
  const saved = await page.evaluate(() => localStorage.getItem('heraldo-pedido'))
  expect(JSON.parse(saved ?? '{}').state.lines).toHaveLength(1)
})

test('after 10 minutes the link is gone and a tap never navigates; verifying again brings it back', async ({ page, context }, testInfo) => {
  const hits = await guardWhatsApp(context)
  await page.clock.install({ time: new Date('2026-10-24T20:00:00Z') })
  await toMessage(page, desktop(testInfo))
  await expect(link(page)).toBeVisible()
  const pagesBefore = context.pages().length

  await page.clock.fastForward('10:30')
  await expect(link(page)).toHaveCount(0)
  await expect(preview(page).getByRole('status')).toHaveText('La verificación venció. Verificá tu pedido de nuevo para continuar.')
  await expect(bubble(page)).toHaveCount(0)
  expect(context.pages()).toHaveLength(pagesBefore)

  await press(preview(page).getByRole('button', { name: 'Volver a verificar' }), desktop(testInfo))
  await expect(link(page)).toBeVisible()
  expect(context.pages()).toHaveLength(pagesBefore)
  expect(hits).toEqual([])
})
