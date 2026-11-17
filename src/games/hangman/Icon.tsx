/** Horca con la cabeza dibujada y casillas de letras. */
export function HangmanIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" strokeLinecap="round" aria-hidden="true">
      <path d="M10 44 H30 M16 44 V8 H38 V14" stroke="var(--muted)" strokeWidth={3} />
      <circle cx={38} cy={20} r={5.5} stroke="var(--x)" strokeWidth={3} />
      <path d="M38 26 V36" stroke="var(--x)" strokeWidth={3} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${8 + i * 10} 56 H${15 + i * 10}`} stroke={i === 1 || i === 3 ? 'var(--o)' : 'var(--cell-active)'} strokeWidth={3} />
      ))}
    </svg>
  )
}
