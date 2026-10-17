import type { ReactNode } from 'react'

/**
 * Full-screen notice on the black sheet with the logo: menu loading or errors, the admin chunk loading, and the admin
 * panel's own states. One component, so moving from one of these screens to another never makes the layout jump.
 */
export function StatusScreen({ children }: { children: ReactNode }) {
  return (
    <main className="texture-chapa grid min-h-dvh place-items-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <span className="texture-pino size-20 rounded-full p-[3px] shadow-[0_10px_22px_-6px_rgb(0_0_0/0.9)]">
          <span className="grid size-full place-items-center rounded-full bg-chapa">
            <img src="/images/logo-heraldo-pizza.webp" alt="" width={80} height={80} className="size-[88%]" />
          </span>
        </span>
        {children}
      </div>
    </main>
  )
}
