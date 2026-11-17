import { ROW_COLORS } from './levels'

/** Fila de ladrillos, bola y pala. */
export function BrickBashIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {[0, 1, 2, 3].map((c) => (
        <rect key={`a${c}`} x={6 + c * 13.5} y={8} width={12} height={6} rx={2} fill={ROW_COLORS[0]} />
      ))}
      {[0, 1, 3].map((c) => (
        <rect key={`b${c}`} x={6 + c * 13.5} y={16} width={12} height={6} rx={2} fill={ROW_COLORS[1]} />
      ))}
      {[0, 2, 3].map((c) => (
        <rect key={`c${c}`} x={6 + c * 13.5} y={24} width={12} height={6} rx={2} fill={ROW_COLORS[4]} />
      ))}
      <circle cx={30} cy={42} r={4} fill="var(--text)" />
      <circle cx={26} cy={46} r={2.5} fill="var(--text)" opacity={0.35} />
      <rect x={18} y={52} width={28} height={6} rx={3} fill="var(--x)" />
    </svg>
  )
}
