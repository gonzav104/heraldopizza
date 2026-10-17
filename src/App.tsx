import { useEffect, useState } from 'react'
import { PublicMenu } from '@/app/PublicMenu'
import { createPublicCatalogRepository } from '@/data/supabase-catalog-repository'
import type { CatalogRepository } from '@/domain/catalog'
import { DesignSystemView } from '@/features/design-system/DesignSystemView'

// Temporary hash switch so the design reference can be reviewed without adding a router (routes arrive in U9).
const DESIGN_SYSTEM_HASH = '#sistema'

// The public menu reads the catalog from Supabase; tests pass their own repository.
const publicCatalog = createPublicCatalogRepository()

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return hash
}

function App({ repository = publicCatalog }: { repository?: CatalogRepository }) {
  const hash = useHash()

  if (hash === DESIGN_SYSTEM_HASH) return <DesignSystemView />

  return <PublicMenu repository={repository} />
}

export default App
