import { AdminApp } from '@/features/admin/AdminApp'
import { SupabaseAdminCatalog } from '@/features/admin/catalog/supabase-admin-catalog'
import { SupabaseAdminAuth, createAdminClient } from '@/features/admin/supabase-admin-auth'

// Created once, when this lazy module loads: one Supabase client per page, shared by authentication and the catalog,
// even under StrictMode's double render.
const services = createServices()

function createServices() {
  try {
    const client = createAdminClient()
    return { auth: new SupabaseAdminAuth(client), catalog: new SupabaseAdminCatalog(client) }
  } catch (error) {
    console.error('The admin panel is not configured', error)
    return null
  }
}

/**
 * Entry of the lazily loaded `/admin` chunk: the only module that imports supabase-js, so the public menu's initial
 * bundle never carries it (U4, S5). `App` loads it with React.lazy when the path starts with `/admin`.
 */
export default function AdminRoute() {
  if (!services) {
    return (
      <main className="admin-theme admin-access">
        <p role="alert" className="admin-status-title">
          El panel no está configurado: faltan los datos de conexión con Supabase.
        </p>
      </main>
    )
  }

  return <AdminApp auth={services.auth} catalog={services.catalog} />
}
