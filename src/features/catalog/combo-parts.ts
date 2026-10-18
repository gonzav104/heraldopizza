/** What a part of a combo is, read from its own words, so the card can show it at a glance. */
export type ComboItemKind = 'pizza' | 'empanada' | 'drink'

export interface ComboPart {
  text: string
  /** null when the words do not say: the part then shows no picture rather than a guess. */
  kind: ComboItemKind | null
  /** The quantity the part states («6 empanadas», «Docena», «Tres pizzas»); null when it states none. */
  count: number | null
}

// Whole words only, so «paraguaya» is not «agua». Empanadas first: an empanada flavor may share a word with a pizza.
// A pizza is a part that says «pizza», or one that is only a pizza flavor, with or without a quantity («Muzza»,
// «Especial»): «Milanesa napolitana» or «Milanesa especial» name another dish and show no picture.
const KIND_PATTERNS: [ComboItemKind, RegExp][] = [
  ['empanada', /(^|[^\p{L}])empanadas?($|[^\p{L}])/iu],
  ['drink', /(^|[^\p{L}])(coca-cola|coca|cola|bebidas?|gaseosas?|sprite|fanta|agua|cervezas?|vinos?|jugos?)($|[^\p{L}])/iu],
  ['pizza', /(^|[^\p{L}])pizzas?($|[^\p{L}])|^(\d+\s+|dos\s+|tres\s+)?(muzza|muzzarella|especial|napolitana|fugazzeta|fugazza)$/iu],
]

const NUMBER_WORDS: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 }

function statedCount(text: string): number | null {
  const digits = /^(\d+)\s/.exec(text)
  if (digits) return Number(digits[1])
  if (/^media docena\b/i.test(text)) return 6
  if (/^docena\b/i.test(text)) return 12
  const word = /^(\p{L}+)\s/u.exec(text)?.[1].toLowerCase()
  return word && Object.hasOwn(NUMBER_WORDS, word) ? NUMBER_WORDS[word] : null
}

/** «Muzza + 6 empanadas surtidas» → the two parts, each with what it is and how many it states. */
export function comboParts(title: string): ComboPart[] {
  return title
    .split(' + ')
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      text,
      kind: KIND_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null,
      count: statedCount(text),
    }))
}
