import type { Pad } from './logic'

/** Colores clásicos (verde, rojo, amarillo, azul) ajustados a la paleta de la app. */
export const PAD_COLORS: Record<Pad, string> = {
  0: '#5ad65a',
  1: '#f0505a',
  2: '#f7d038',
  3: '#3b6ff0',
}
export const PAD_KEYS = ['green', 'red', 'yellow', 'blue'] as const
