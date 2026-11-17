import { PAD_COLORS } from './colors'

/** Las cuatro luces en círculo, con una encendida. */
export function FollowTheLightIcon({ size = 56 }: { size?: number }) {
  const r = 24
  const c = 32
  const gap = 2.2
  const quad = (sx: 1 | -1, sy: 1 | -1) =>
    `M${c + sx * gap} ${c + sy * gap} H${c + sx * r} A${r} ${r} 0 0 ${sx * sy > 0 ? 1 : 0} ${c + sx * gap} ${c + sy * r} Z`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d={quad(-1, -1)} fill={PAD_COLORS[0]} />
      <path d={quad(1, -1)} fill={PAD_COLORS[1]} opacity={0.45} />
      <path d={quad(-1, 1)} fill={PAD_COLORS[2]} opacity={0.45} />
      <path d={quad(1, 1)} fill={PAD_COLORS[3]} opacity={0.45} />
      <circle cx={c} cy={c} r={8} fill="var(--cell)" />
    </svg>
  )
}
