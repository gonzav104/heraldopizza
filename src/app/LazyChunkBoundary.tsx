import { Component, type ReactNode } from 'react'
import { StatusScreen } from '@/components/ui/StatusScreen'

interface Props {
  /** What failed to load, for the message («el panel»). */
  what: string
  children: ReactNode
}

/**
 * Catches a lazily loaded chunk that fails to load (offline, or a stale chunk hash after a redeploy) and offers a
 * reload, instead of letting React unmount the whole page into a blank screen.
 */
export class LazyChunkBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`Could not load ${this.props.what}`, error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <StatusScreen>
        <p role="alert" className="type-display text-[1.375rem]">
          No pudimos cargar {this.props.what}.
        </p>
        <p className="text-crema-muted">Revisá tu conexión e intentá de nuevo.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-12 items-center rounded-full bg-heraldo px-6 font-bold text-white hover:bg-heraldo-deep"
        >
          Reintentar
        </button>
      </StatusScreen>
    )
  }
}
