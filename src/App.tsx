import { useEffect, useState } from 'react'
import type { Promotion } from '@/domain/catalog'
import { prototypeCategories, prototypeProducts } from '@/data/prototype-catalog'
import { Storefront } from '@/app/Storefront'
import { DesignSystemView } from '@/features/design-system/DesignSystemView'

// Temporary hash switch so the design reference can be reviewed without adding a router (routes arrive in U9).
const DESIGN_SYSTEM_HASH = '#sistema'

// The SQL fixture has no promotions; U10 brings real ones. Never invent them.
const noPromotions: Promotion[] = []

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function App() {
  const hash = useHash()

  if (hash === DESIGN_SYSTEM_HASH) return <DesignSystemView />
  return <Storefront categories={prototypeCategories} products={prototypeProducts} promotions={noPromotions} />
}

export default App
