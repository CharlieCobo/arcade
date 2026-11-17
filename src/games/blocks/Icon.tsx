import { PIECE_COLORS } from './logic'

/** Unas piezas encajadas, con la paleta de la app. */
export function BlocksIcon({ size = 56 }: { size?: number }) {
  const cells: [number, number, keyof typeof PIECE_COLORS][] = [
    [1, 0, 'T'], [0, 1, 'T'], [1, 1, 'T'], [2, 1, 'T'],
    [3, 0, 'I'], [3, 1, 'I'], [3, 2, 'I'], [3, 3, 'I'],
    [0, 2, 'L'], [0, 3, 'L'], [1, 3, 'L'], [2, 3, 'L'],
    [1, 2, 'O'], [2, 2, 'O'],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {cells.map(([x, y, type]) => (
        <rect key={`${x}-${y}`} x={8 + x * 12} y={8 + y * 12} width={11} height={11} rx={4.5} fill={PIECE_COLORS[type]} />
      ))}
    </svg>
  )
}
