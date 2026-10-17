import { lazy, Suspense, useEffect, useState } from 'react'
import { LazyChunkBoundary } from '@/app/LazyChunkBoundary'
import { PublicMenu } from '@/app/PublicMenu'
import { StatusScreen } from '@/components/ui/StatusScreen'
import { createPublicCatalogRepository } from '@/data/supabase-catalog-repository'
import type { CatalogRepository } from '@/domain/catalog'
import { DesignSystemView } from '@/features/design-system/DesignSystemView'

// Temporary hash switch so the design reference can be reviewed without adding a router (routes arrive in U9).
const DESIGN_SYSTEM_HASH = '#sistema'

// The public menu reads the catalog from Supabase; tests pass their own repository.
const publicCatalog = createPublicCatalogRepository()

// The admin panel is its own chunk, loaded only on /admin: supabase-js never reaches the public menu's bundle (U4).
const AdminRoute = lazy(() => import('@/features/admin/AdminRoute'))

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

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

  if (isAdminPath(window.location.pathname)) {
    return (
      <LazyChunkBoundary what="el panel">
        <Suspense
          fallback={
            <StatusScreen>
              <p role="status" className="text-[1.0625rem] font-semibold">
                Cargando…
              </p>
            </StatusScreen>
          }
        >
          <AdminRoute />
        </Suspense>
      </LazyChunkBoundary>
    )
  }

  if (hash === DESIGN_SYSTEM_HASH) return <DesignSystemView />

  return <PublicMenu repository={repository} />
}

export default App
