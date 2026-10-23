import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WhatsAppAction } from './MessagePreview'
import { ORDER_CONFIRMATION_NOTICE } from './notices'

const message = '*Pedido para Heraldo Pizza*\nNombre: Ana Gómez'

// Spies (console.error, window.open) and fake timers end with each test, so no test depends on the order they run.
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('WhatsAppAction (P6b-1)', () => {
  it('while the setting is off, is a disabled button with no link, and says why', () => {
    render(<WhatsAppAction enabled={false} message={message} verifiedAt={Date.now()} onStale={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Continuar en WhatsApp' })).toBeDisabled()
    expect(screen.queryByRole('link')).toBeNull()
    expect(document.querySelector('[href]')).toBeNull()
    expect(screen.getByText('Todavía no está habilitado: así no llegan pedidos de prueba al local.')).toBeInTheDocument()
    expect(screen.getByText(ORDER_CONFIRMATION_NOTICE)).toBeInTheDocument()
  })

  it('without a verified order, is a disabled button that can never navigate', () => {
    render(<WhatsAppAction enabled message={message} verifiedAt={null} onStale={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Continuar en WhatsApp' })
    expect(button).toBeDisabled()
    expect(button).not.toHaveAttribute('href')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('with a current verification, is a real link to wa.me with the message, in a new tab, described by the notice', () => {
    const open = vi.spyOn(window, 'open')
    render(<WhatsAppAction enabled message={message} verifiedAt={Date.now()} onStale={vi.fn()} />)
    const link = screen.getByRole('link', { name: 'Continuar en WhatsApp' })
    const url = new URL(link.getAttribute('href')!)
    expect(url.origin + url.pathname).toBe('https://wa.me/5491170582325')
    expect(url.searchParams.get('text')).toBe(message)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleDescription(ORDER_CONFIRMATION_NOTICE)
    const click = fireEvent.click(link)
    expect(click).toBe(true) // the browser follows the link itself, from the tap: no window.open
    expect(open).not.toHaveBeenCalled()
  })

  it('stops the navigation and asks for a new check when the verification expired by the time of the tap', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-24T20:00:00Z'))
    const onStale = vi.fn()
    render(<WhatsAppAction enabled message={message} verifiedAt={Date.now()} onStale={onStale} />)
    vi.setSystemTime(new Date('2026-10-24T20:10:00Z'))
    const followed = fireEvent.click(screen.getByRole('link', { name: 'Continuar en WhatsApp' }))
    expect(followed).toBe(false)
    expect(onStale).toHaveBeenCalledTimes(1)
  })

  it('stops it too when midnight passed in Argentina within the 10 minutes', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T02:58:00Z')) // 23:58 in Argentina
    const onStale = vi.fn()
    render(<WhatsAppAction enabled message={message} verifiedAt={Date.now()} onStale={onStale} />)
    vi.setSystemTime(new Date('2026-10-25T03:01:00Z'))
    expect(fireEvent.click(screen.getByRole('link', { name: 'Continuar en WhatsApp' }))).toBe(false)
    expect(onStale).toHaveBeenCalledTimes(1)
  })
})
