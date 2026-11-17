import { BOARD_COLOR, DISC_COLORS } from './colors'

/** Trozo de tablero azul con cuatro fichas en diagonal. */
export function FourInARowIcon({ size = 56 }: { size?: number }) {
  const cells: (0 | 1 | 2)[][] = [
    [0, 0, 0, 1],
    [0, 2, 1, 2],
    [2, 1, 2, 1],
    [1, 2, 1, 2],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x={4} y={6} width={56} height={54} rx={10} fill={BOARD_COLOR} />
      {cells.map((row, r) =>
        row.map((p, c) => (
          <circle key={`${r}-${c}`} cx={13 + c * 12.7} cy={15 + r * 12.2} r={4.6} fill={p === 0 ? 'var(--bg)' : DISC_COLORS[p]} />
        )),
      )}
    </svg>
  )
}
