import { PLAYER_COLORS } from './colors'

/** Rejilla de puntos con una caja cerrada de cada color. */
export function DotsIcon({ size = 56 }: { size?: number }) {
  const p = [10, 27, 44]
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" aria-hidden="true" strokeLinecap="round">
      <rect x={10} y={10} width={17} height={17} rx={2} fill={PLAYER_COLORS[1]} opacity={0.3} />
      <rect x={27} y={27} width={17} height={17} rx={2} fill={PLAYER_COLORS[2]} opacity={0.3} />
      <path d="M10 10 H27 V27 H10 Z" fill="none" stroke={PLAYER_COLORS[1]} strokeWidth={3} />
      <path d="M27 27 H44 V44 H27 Z M27 10 H44" fill="none" stroke={PLAYER_COLORS[2]} strokeWidth={3} />
      {p.flatMap((y) => p.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={3.2} fill="var(--text)" />))}
    </svg>
  )
}
