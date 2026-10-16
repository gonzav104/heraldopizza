import { useCallback, useEffect, useRef, useState } from 'react'

const CLICK_LOCK_MS = 1200

/**
 * Tracks which menu section is under the sticky category rail.
 * - After a rail tap, the chosen section stays active while the page scrolls to it.
 * - At the bottom of the page the last section wins, even if it is too short to reach the rail.
 * Falls back to the first section where IntersectionObserver is unavailable (tests, old browsers).
 */
export function useActiveSection(sectionIds: string[]): [string | undefined, (id: string) => void] {
  const [activeId, setActiveId] = useState<string | undefined>(sectionIds[0])
  const lockedUntil = useRef(0)

  const select = useCallback((id: string) => {
    lockedUntil.current = Date.now() + CLICK_LOCK_MS
    setActiveId(id)
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || sectionIds.length === 0) return

    const visible = new Set<string>()
    const isLocked = () => Date.now() < lockedUntil.current
    const atPageBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        if (isLocked() || atPageBottom()) return
        const firstVisible = sectionIds.find((id) => visible.has(id))
        if (firstVisible) setActiveId(firstVisible)
      },
      // A thin band just below the rail decides the active section.
      { rootMargin: '-72px 0px -70% 0px' },
    )

    const onScroll = () => {
      if (!isLocked() && atPageBottom()) setActiveId(sectionIds[sectionIds.length - 1])
    }

    for (const id of sectionIds) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [sectionIds])

  return [activeId, select]
}
