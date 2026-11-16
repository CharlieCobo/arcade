export function InfiniteTicTacToeIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g strokeLinecap="round" strokeWidth={5} fill="none">
        <path d="M12 12 L26 26 M26 12 L12 26" stroke="var(--x)" />
        <circle cx="45" cy="19" r="7.5" stroke="var(--o)" />
        <circle cx="19" cy="45" r="7.5" stroke="var(--o)" opacity={0.35} />
        <path d="M38 38 L52 52 M52 38 L38 52" stroke="var(--x)" />
      </g>
    </svg>
  )
}
