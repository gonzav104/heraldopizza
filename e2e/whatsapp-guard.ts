import type { BrowserContext } from '@playwright/test'

/**
 * Intercepts every request to WhatsApp's domains for the whole context, popups included, and answers it locally. No
 * test ever reaches WhatsApp, so no order or page request can arrive at the store's number. Returns what was asked.
 */
export async function guardWhatsApp(context: BrowserContext): Promise<{ method: string; url: string }[]> {
  const hits: { method: string; url: string }[] = []
  await context.route(/^https:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp\.com|www\.whatsapp\.com)\//, async (route) => {
    hits.push({ method: route.request().method(), url: route.request().url() })
    // A page, not «204 No Content»: a 204 makes the browser skip opening the new tab, and the tab is what the specs check.
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>WhatsApp (interceptado)</title>' })
  })
  return hits
}
