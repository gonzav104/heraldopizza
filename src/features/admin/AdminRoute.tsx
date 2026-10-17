import { useState } from 'react'
import { AdminApp } from '@/features/admin/AdminApp'
import { createSupabaseAdminAuth, type SupabaseAdminAuth } from '@/features/admin/supabase-admin-auth'

function createAuth(): SupabaseAdminAuth | null {
  try {
    return createSupabaseAdminAuth()
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
  const [auth] = useState(createAuth)

  if (!auth) {
    return (
      <main className="texture-chapa grid min-h-dvh place-items-center px-4">
        <p role="alert" className="max-w-sm text-center font-semibold">
          El panel no está configurado: faltan los datos de conexión con Supabase.
        </p>
      </main>
    )
  }

  return <AdminApp auth={auth} />
}
