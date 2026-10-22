import { create } from 'zustand'
import { emptyCheckout, withMode, type CheckoutDetails, type FulfillmentMode } from './prototype-order'

// Checkout details for the prototype, kept outside the sheet so closing it never loses what was typed.
// In memory only, like the order; U8 replaces the form with React Hook Form + Zod.

type TextField = 'name' | 'address' | 'note'

interface CheckoutState {
  details: CheckoutDetails
  setText: (field: TextField, value: string) => void
  setMode: (mode: FulfillmentMode) => void
  setPayment: (payment: CheckoutDetails['payment']) => void
}

export const useCheckoutStore = create<CheckoutState>()((set) => ({
  details: emptyCheckout,
  setText: (field, value) => set((state) => ({ details: { ...state.details, [field]: value } })),
  setMode: (mode) => set((state) => ({ details: withMode(state.details, mode) })),
  setPayment: (payment) => set((state) => ({ details: { ...state.details, payment } })),
}))

/** Test helper: clears the form between tests. */
export function resetCheckoutStore() {
  useCheckoutStore.setState({ details: emptyCheckout })
}

/** Whether anything was typed: the sheet then ignores stray backdrop taps. */
export function hasTypedText(details: CheckoutDetails): boolean {
  return [details.name, details.address, details.note].some((value) => value.trim() !== '')
}
