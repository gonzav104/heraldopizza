import { categoryGraphic } from './category-graphics'

/**
 * The category's mark, pyrographed on pine: a 44 px tile of the venue's real wood with a dark line icon.
 * Decorative: the category name always sits next to it.
 */
export function CategoryStamp({ name }: { name: string }) {
  const { Icon } = categoryGraphic(name)
  return (
    <span
      aria-hidden="true"
      className="texture-pino grid size-11 shrink-0 place-items-center rounded-xl text-pino-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-2px_0_rgb(58_34_16/0.25),0_4px_10px_-4px_rgb(0_0_0/0.8)]"
    >
      <Icon className="size-6" strokeWidth={2} />
    </span>
  )
}
