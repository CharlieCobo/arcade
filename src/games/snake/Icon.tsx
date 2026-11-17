/** Serpiente pixelada, como en las pantallas de los móviles de antes. */
export function SnakeIcon({ size = 56 }: { size?: number }) {
  const px = (x: number, y: number, opacity = 1) => (
    <rect key={`${x}-${y}`} x={x * 9 + 6} y={y * 9 + 6} width={7.5} height={7.5} rx={2} fill="var(--o)" opacity={opacity} />
  )
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {px(0, 4, 0.5)}
      {px(1, 4, 0.6)}
      {px(2, 4, 0.7)}
      {px(2, 3, 0.8)}
      {px(2, 2, 0.9)}
      {px(3, 2)}
      <rect x={48.5} y={24} width={7.5} height={7.5} rx={3.75} fill="var(--x)" />
    </svg>
  )
}
