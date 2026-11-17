/** Mesa vertical: pala arriba, red, bola y pala abajo. */
export function PingPongIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x={20} y={8} width={24} height={5} rx={2.5} fill="var(--o)" />
      <path d="M10 32 H54" stroke="var(--muted)" strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" opacity={0.6} />
      <circle cx={38} cy={40} r={4} fill="var(--text)" />
      <circle cx={34} cy={36} r={2.5} fill="var(--text)" opacity={0.35} />
      <rect x={16} y={51} width={24} height={5} rx={2.5} fill="var(--x)" />
    </svg>
  )
}
