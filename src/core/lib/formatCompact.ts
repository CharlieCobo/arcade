/**
 * Abreviación clásica de puntuaciones: 999 · 2.5K · 12.3K · 250K · 10M · 1.2B · 3T.
 *
 * - Una cifra decimal solo por debajo de 100 en su unidad (12.3K, pero 250K).
 * - Se trunca, no se redondea: un récord nunca aparenta más de lo conseguido
 *   (1999 → 1.9K, no 2K).
 * - Siempre con punto decimal, como en los marcadores de los juegos.
 */
const UNITS = [
  { value: 1e12, suffix: 'T' },
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'K' },
] as const

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(Math.trunc(n))
  if (abs < 1000) return `${sign}${abs}`

  // abs >= 1000, así que siempre hay unidad (como mínimo K)
  const unit = UNITS.find((u) => abs >= u.value) ?? UNITS[3]
  const scaled = abs / unit.value
  const shown = scaled < 100 ? Math.trunc(scaled * 10) / 10 : Math.trunc(scaled)
  // Por encima de 999T seguimos en T (1500T): no hay unidad mayor
  return `${sign}${shown.toString()}${unit.suffix}`
}
