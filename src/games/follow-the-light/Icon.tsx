import { PAD_COLORS } from './colors'

/** Cuatro luces redondas en cuadrícula, con una encendida. */
export function FollowTheLightIcon({ size = 56 }: { size?: number }) {
  const spots: [number, number, 0 | 1 | 2 | 3][] = [
    [20, 20, 0],
    [44, 20, 1],
    [20, 44, 2],
    [44, 44, 3],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x={4} y={4} width={56} height={56} rx={14} fill="var(--cell)" />
      {spots.map(([cx, cy, pad]) => (
        <circle key={pad} cx={cx} cy={cy} r={9.5} fill={PAD_COLORS[pad]} opacity={pad === 0 ? 1 : 0.4} />
      ))}
    </svg>
  )
}
