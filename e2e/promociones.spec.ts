import { expect, test, type Page } from '@playwright/test'
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './local-admin.ts'
import { localStackEnv } from './local-stack.ts'

// P5a, end to end: the public menu shows the eight promotions read from the local Supabase (reset from the seed by
// global-setup.ts), a cart saved on the device keeps them across a reload, and a promotion the administrator switches
// off disappears from the menu while the saved line stays, flagged, and blocks the checkout.

const stack = localStackEnv()

const PROMOTIONS = [
  'Muzza + 6 empanadas surtidas',
  'Especial + Pizza Muzzarella',
  'Especial + Coca-Cola 1,75 + 6 empanadas de JyQ',
  'Docena de empanadas surtidas',
  'Docena de empanadas a elección',
  'Muzza + Especial + 6 empanadas de JyQ',
  'Tres pizzas Muzzarella',
  'Pizza Napolitana + Pizza Especial',
]

/** Switches a promotion on or off the way the administrator would: signed in, through the API and row level security. */
async function setVisible(codigo: string, visible: boolean) {
  const auth = await fetch(new URL('/auth/v1/token?grant_type=password', stack.VITE_SUPABASE_URL), {
    method: 'POST',
    headers: { apikey: stack.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  expect(auth.ok).toBe(true)
  const { access_token: token } = (await auth.json()) as { access_token: string }
  const response = await fetch(new URL(`/rest/v1/promociones?codigo=eq.${codigo}`, stack.VITE_SUPABASE_URL), {
    method: 'PATCH',
    headers: {
      apikey: stack.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ visible }),
  })
  expect(response.ok).toBe(true)
  expect(await response.json()).toHaveLength(1)
}

const openCart = async (page: Page) => {
  await page.getByRole('button', { name: /^Ver tu pedido/ }).click()
  return page.getByRole('dialog', { name: 'Tu pedido' })
}

test('the public menu shows the eight promotions from Supabase, and a saved cart survives one being switched off', async ({ page }) => {
  await page.goto('/')
  const rail = page.getByRole('region', { name: 'Promos' })
  for (const title of PROMOTIONS) await expect(rail.getByRole('article', { name: title, exact: true })).toBeVisible()

  // A closed combo and a dozen to choose, saved on the device.
  await rail.getByRole('button', { name: /^Sumar Tres pizzas Muzzarella/ }).click()
  await rail.getByRole('button', { name: /^Elegir los gustos de Docena de empanadas a elección/ }).click()
  const builder = page.getByRole('dialog', { name: 'Elegí tus 12 empanadas' })
  for (let i = 0; i < 12; i++) await builder.getByRole('button', { name: 'Sumar Carne picada' }).click()
  await builder.getByRole('button', { name: /^Agregar docena/ }).click()
  await expect(builder).toBeHidden()

  await page.reload()
  let cart = await openCart(page)
  await expect(cart.getByRole('listitem').filter({ hasText: 'Tres pizzas Muzzarella' })).toContainText('42.000')
  await expect(cart.getByRole('list', { name: 'Gustos' })).toHaveText('12 Carne picada')
  await expect(cart.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  await page.keyboard.press('Escape')

  await setVisible('promo-tres-muzzarella', false)
  try {
    await page.reload()
    await expect(page.getByRole('region', { name: 'Promos' }).getByRole('article', { name: 'Tres pizzas Muzzarella' })).toHaveCount(0)
    cart = await openCart(page)
    const review = cart.getByRole('region', { name: 'Revisá estos productos' })
    await expect(review.getByRole('listitem')).toHaveCount(1)
    await expect(review.getByRole('listitem')).toContainText('Esta promoción ya no está disponible.')
    await expect(cart.getByRole('list', { name: 'Gustos' })).toHaveText('12 Carne picada')
    await expect(cart.getByRole('button', { name: 'Continuar' })).toBeDisabled()

    await review.getByRole('button', { name: /^Quitar Una promoción/ }).click()
    await expect(cart.getByRole('region', { name: 'Revisá estos productos' })).toHaveCount(0)
    await expect(cart.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  } finally {
    await setVisible('promo-tres-muzzarella', true)
  }
})
