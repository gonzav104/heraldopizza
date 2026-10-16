import type { ReactNode } from 'react'

/**
 * Keeps hyphenated words together ("Coca-Cola" never breaks after the hyphen).
 * Plain words stay in one text node, so the accessible name keeps its spaces.
 */
export function ProductName({ name }: { name: string }) {
  const parts: ReactNode[] = []
  let text = ''
  name.split(' ').forEach((word, index, words) => {
    const space = index < words.length - 1 ? ' ' : ''
    if (!word.includes('-')) {
      text += word + space
      return
    }
    if (text) parts.push(text)
    parts.push(
      <span key={index} className="whitespace-nowrap">
        {word}
      </span>,
    )
    text = space
  })
  if (text) parts.push(text)
  return <>{parts}</>
}
