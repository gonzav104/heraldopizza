// One representative graphic per category (D5: no product photos in this version).
// Lucide where an icon truly fits; otherwise our own icons drawn on lucide's grid
// (24 × 24, 2 px stroke, round caps and joins) so the family stays consistent.
// Later, the admin chooses the icon: a `categorias.icono` key will replace this name-based mapping.
import {
  Blender,
  CakeSlice,
  Coffee,
  CupSoda,
  Hamburger,
  Martini,
  Pizza,
  Sandwich,
  UtensilsCrossed,
  Wine,
  createLucideIcon,
  type LucideIcon,
} from 'lucide-react'

/** Half-moon pastry with a crimped edge (repulgue). */
const Empanada = createLucideIcon('Empanada', [
  ['path', { d: 'M3 17a9 9 0 0 1 18 0Z', key: 'shell' }],
  ['path', { d: 'M4.2 12.5 6.4 13.8', key: 'crimp-1' }],
  ['path', { d: 'M7.5 9.2 8.8 11.4', key: 'crimp-2' }],
  ['path', { d: 'M12 8v2.5', key: 'crimp-3' }],
  ['path', { d: 'm16.5 9.2-1.3 2.2', key: 'crimp-4' }],
  ['path', { d: 'm19.8 12.5-2.2 1.3', key: 'crimp-5' }],
])

/** Fries carton with sticks. */
const Fries = createLucideIcon('Fries', [
  ['path', { d: 'M5 10h14l-2 11H7Z', key: 'carton' }],
  ['path', { d: 'm8 10-1-6', key: 'stick-1' }],
  ['path', { d: 'M11 10V3', key: 'stick-2' }],
  ['path', { d: 'M14 10V4', key: 'stick-3' }],
  ['path', { d: 'm17 10 1-5', key: 'stick-4' }],
])

/** Ravioli: a filled square with crimped edges. */
const Ravioli = createLucideIcon('Ravioli', [
  ['rect', { x: '4', y: '4', width: '16', height: '16', rx: '2', key: 'pasta' }],
  ['circle', { cx: '12', cy: '12', r: '3', key: 'filling' }],
  ['path', { d: 'M9 4v2M15 4v2M9 18v2M15 18v2M4 9h2M4 15h2M18 9h2M18 15h2', key: 'crimps' }],
])

/** Board with a cheese wedge and a cube. */
const Picada = createLucideIcon('Picada', [
  ['rect', { x: '2', y: '14', width: '16', height: '6', rx: '2', key: 'board' }],
  ['path', { d: 'M18 17h4', key: 'handle' }],
  ['path', { d: 'M4 14 11 8v6', key: 'cheese' }],
  ['rect', { x: '13', y: '10', width: '4', height: '4', rx: '1', key: 'cube' }],
])

/** Keyed by normalized category name (see categoryGraphicKey). */
const graphics: Partial<Record<string, LucideIcon>> = {
  pizzas: Pizza,
  empanadas: Empanada,
  hamburguesas: Hamburger,
  'milanesas y sandwiches': Sandwich,
  picadas: Picada,
  'papas fritas': Fries,
  pastas: Ravioli,
  postres: CakeSlice,
  // "Licuado" comes from "licuadora": the blender says it better than another glass with a straw.
  licuados: Blender,
  cafeteria: Coffee,
  bebidas: CupSoda,
  'tragos clasicos': Wine,
  'tragos de autor': Martini,
}

/** "Cafetería" → "cafeteria": lower case, no accents, single spaces. */
export function categoryGraphicKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .trim()
    .replace(/\s+/g, ' ')
}

export function categoryGraphic(name: string): { Icon: LucideIcon; fallback: boolean } {
  const Icon = graphics[categoryGraphicKey(name)]
  return Icon ? { Icon, fallback: false } : { Icon: UtensilsCrossed, fallback: true }
}
