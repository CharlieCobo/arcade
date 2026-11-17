/**
 * Diseños de nivel: 10 columnas por fila.
 *   .  vacío
 *   1  ladrillo normal (1 golpe)
 *   2  ladrillo duro (2 golpes)
 *   3  ladrillo muy duro (3 golpes)
 *   #  metal: irrompible (no cuenta para superar el nivel)
 *
 * El color de cada ladrillo sale de su fila (arcoíris con la paleta de la app).
 */
export interface LevelDef {
  /** Clave del nombre en las traducciones (levels.<key>) */
  key: string
  rows: string[]
}

export const LEVELS: LevelDef[] = [
  {
    key: 'warmup',
    rows: ['1111111111', '1111111111', '1111111111', '1111111111', '1111111111'],
  },
  {
    key: 'pyramid',
    rows: ['....11....', '...1111...', '..111111..', '.11111111.', '1111111111', '2222222222'],
  },
  {
    key: 'checkers',
    rows: ['1.1.1.1.1.', '.1.1.1.1.1', '2.2.2.2.2.', '.2.2.2.2.2', '1.1.1.1.1.', '.1.1.1.1.1'],
  },
  {
    key: 'fortress',
    rows: ['2222222222', '1111111111', '#.##..##.#', '1111111111', '2222222222', '1111111111'],
  },
  {
    key: 'heart',
    rows: ['.22....22.', '2222..2222', '2111111112', '.21111112.', '..211112..', '...2112...', '....22....'],
  },
  {
    key: 'invader',
    rows: ['..2....2..', '...2..2...', '..222222..', '.22.22.22.', '2222222222', '2.222222.2', '2.2....2.2', '...22.22..'],
  },
  {
    key: 'wall',
    rows: ['3333333333', '2222222222', '#.#.#.#.#.', '2222222222', '1111111111', '.#.#.#.#.#', '1111111111'],
  },
  {
    key: 'maze',
    rows: ['3333333333', '2222222222', '#########.', '2222222222', '.#########', '1111111111', '1111111111'],
  },
]

/** Colores por fila: la paleta de la app en orden de arcoíris. */
export const ROW_COLORS = ['#ff5d8f', '#f59a3a', '#f7d038', '#5ad65a', '#4cc9f0', '#3b6ff0', '#a35cf0', '#ff5d8f']
export const METAL_COLOR = '#8b8fb8'
