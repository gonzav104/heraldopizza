// Third-party brand logos. Only files supplied by the brand owner belong here; never a redrawn imitation.

export interface BrandLogo {
  /** Path under /public. */
  src: string
  width: number
  height: number
}

/**
 * PedidosYa's official logo. `null` until the owner provides the file from PedidosYa's partner portal:
 * save it as `public/images/brands/pedidosya.svg` and replace this with
 * `{ src: '/images/brands/pedidosya.svg', width: <w>, height: <h> }`. Until then the link shows the name as text.
 */
export const pedidosYaLogo: BrandLogo | null = null
