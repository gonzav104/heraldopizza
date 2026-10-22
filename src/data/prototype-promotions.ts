import type { Promotion } from '@/domain/catalog'

/**
 * The owner's real promotions (2026-10-17), as PROTOTYPE data only: they let the Promotions section be designed and
 * tested before a real source exists. The app loads them in development only (see dev-promotions.ts); a production
 * build carries neither this file nor the section until U9 adds the real source, the admin screens, and these rows.
 * Copied verbatim from the owner: titles, prices, and the one clarification. Validity was not given, so it stays null.
 */
export const prototypePromotions: Promotion[] = [
  { id: 'promo-muzza-6-empanadas', title: 'Muzza + 6 empanadas surtidas', description: 'No son a elección.', price: 32000 },
  { id: 'promo-especial-muzzarella', title: 'Especial + Pizza Muzzarella', description: null, price: 35000 },
  { id: 'promo-especial-coca-6-jyq', title: 'Especial + Coca-Cola 1,75 + 6 empanadas de JyQ', description: null, price: 42500 },
  { id: 'promo-docena-surtida', title: 'Docena de empanadas surtidas', description: null, price: 30000 },
  { id: 'promo-docena-eleccion', title: 'Docena de empanadas a elección', description: null, price: 36000 },
  { id: 'promo-muzza-especial-6-jyq', title: 'Muzza + Especial + 6 empanadas de JyQ', description: null, price: 52000 },
  { id: 'promo-tres-muzzarella', title: 'Tres pizzas Muzzarella', description: null, price: 42000 },
  { id: 'promo-napolitana-especial', title: 'Pizza Napolitana + Pizza Especial', description: null, price: 42000 },
].map((promotion) => ({ ...promotion, imageUrl: null, activeFrom: null, activeTo: null, weekdays: [] }))
