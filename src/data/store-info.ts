// TEMPORARY store facts for the prototype. Source: docs/requerimientos.pdf, section 6 ("Datos del local").
// U4 moves this to the typed data adapter; the admin edits it later (RF-45, RF-46).

export const storeInfo = {
  name: 'Heraldo Pizza',
  address: 'Av. Mitre 1130',
  city: 'Campana',
  hours: 'Todos los días, de 11 a 14 y de 19 a 00 h',
  /** Orders number in international format (RF-20), confirmed by the owner as the official one (2026-10-22). */
  whatsappNumber: '5491170582325',
  whatsappDisplay: '11 7058-2325',
  instagram: 'heraldopizza',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Av.+Mitre+1130,+Campana,+Buenos+Aires',
} as const

/** The restaurant page on PedidosYa: a secondary channel, shown only in the footer and the info sheet. */
export const pedidosYaUrl =
  'https://www.pedidosya.com.ar/restaurantes/campana/heraldo-pizza-ef6d3a30-7cd3-4842-924a-ecc9b7fdf69b-menu'

export const instagramUrl = `https://www.instagram.com/${storeInfo.instagram}/`
