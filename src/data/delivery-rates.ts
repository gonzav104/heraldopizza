import type { Ars } from '@/domain/catalog'

/**
 * The owner's official motito rates (2026-10-22), copied verbatim. The customer pays the motito apart from the order:
 * the checkout never computes it from the address and never asks for a zone. This list is for reference only, and the
 * store confirms the final price.
 */

export interface DeliveryRateTier {
  price: Ars
  places: string[]
}

export interface DeliveryRateGroup {
  id: 'barrios' | 'fabricas'
  title: string
  tiers: DeliveryRateTier[]
}

export const deliveryRateGroups: DeliveryRateGroup[] = [
  {
    id: 'barrios',
    title: 'Barrios y localidades',
    tiers: [
      { price: 2500, places: ['Centro', 'Del Pino', 'Urquiza', 'Petrolero'] },
      {
        price: 3000,
        places: ['Dallera', 'Villanueva', '9 de Julio', 'Lubo', 'La Argentina', 'Romano', 'Siderca', 'San Felipe', 'Don Francisco', 'Destino', 'Vitramu'],
      },
      { price: 3500, places: ['Las Acacias', 'Portal', 'Puertas del Sol', 'Los Nogales'] },
      { price: 4000, places: ['La Josefa', 'Ariel del Plata', 'Las Campanas', 'Federal', 'Santa Florentina', 'Malvinas'] },
      { price: 4500, places: ['Albisola'] },
      { price: 5000, places: ['San Jacinto'] },
      { price: 5500, places: ['Otamendi', 'San Cayetano', 'Santa Lucía'] },
      { price: 7000, places: ['Las Praderas', 'Los Pioneros', 'Bosch', 'Saavedra'] },
      { price: 7500, places: ['Country del Bosque'] },
      { price: 8500, places: ['Sofitel'] },
      { price: 10000, places: ['Zárate (hasta Rivadavia)'] },
      { price: 11500, places: ['Zárate (después de Rivadavia)'] },
      { price: 13000, places: ['Zárate (barrios)'] },
      { price: 18000, places: ['Los Cardales'] },
    ],
  },
  {
    id: 'fabricas',
    title: 'Fábricas',
    tiers: [
      { price: 3000, places: ['Axion P. Rivera', 'Euroamérica', 'Ameghino 97', 'Cormela'] },
      { price: 3500, places: ['Siderca', 'Axion P. 14', 'Tréfila', 'Greif', 'Pobater P1', 'Parque PyME'] },
      { price: 4000, places: ['Transol', 'Beraldi'] },
      {
        price: 5000,
        places: [
          'P. Burras',
          'Praxair',
          'Sintermetal',
          'Honda',
          'Parque Industrial',
          'Tecno Dealer',
          'Carbocolor',
          'Maripasa',
          'Pobater P2',
          'Air Liquide',
          'Arenera Lojda',
          'Planta Comercial Axion',
          'Vendaval Arenera',
          'Tecmaco',
        ],
      },
      { price: 6000, places: ['Boshoku', 'Tajiber', 'Termoeléctrica Manuel Belgrano', 'Padilla', 'Bunge'] },
      { price: 6500, places: ['Tagsa', 'Pastoriza', 'QBox', 'Petromini', 'Astillero', 'Tajiber P2'] },
      { price: 7000, places: ['Holcim'] },
      { price: 8000, places: ['Planta Bayer', 'Monsanto'] },
      { price: 10000, places: ['Toyota (Plantas 1, 2, 3 y 4)'] },
    ],
  },
]
