/** Casillas descubiertas con números, una bandera y una mina. */
export function MinesweeperIcon({ size = 56 }: { size?: number }) {
  const cell = (x: number, y: number, open: boolean) => (
    <rect key={`${x}-${y}`} x={6 + x * 13.5} y={6 + y * 13.5} width={12} height={12} rx={3} fill={open ? 'var(--bg)' : 'var(--cell-active)'} />
  )
  const cells = []
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) cells.push(cell(x, y, (x + y) % 3 !== 0 && y < 3))
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" fontFamily="'Space Grotesk', sans-serif" fontWeight={700} fontSize={9} textAnchor="middle">
      {cells}
      <text x={25.5} y={15.5} fill="var(--o)">1</text>
      <text x={39} y={29} fill="#5ad65a">2</text>
      <text x={12} y={42.5} fill="var(--x)">3</text>
      <path d="M17 50 V58 M17 50 L23 52.5 L17 55" stroke="var(--x)" strokeWidth={1.8} fill="var(--x)" strokeLinejoin="round" />
      <circle cx={53} cy={53} r={4} fill="var(--text)" />
      <path d="M53 47.5 V58.5 M47.5 53 H58.5" stroke="var(--text)" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  )
}
