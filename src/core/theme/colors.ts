/** Colores del tema activo, para lo que se pinta en canvas o SVG. */
export interface ThemeColors {
  bg: string
  panel: string
  cell: string
  text: string
  muted: string
  x: string
  o: string
  font: string
}

export function readThemeColors(el: Element = document.documentElement): ThemeColors {
  const css = getComputedStyle(el)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    bg: v('--bg', '#0f1020'),
    panel: v('--panel', '#1a1b33'),
    cell: v('--cell', '#23244a'),
    text: v('--text', '#eef0ff'),
    muted: v('--muted', '#8b8fb8'),
    x: v('--x', '#ff5d8f'),
    o: v('--o', '#4cc9f0'),
    font: v('--font', "'Space Grotesk', system-ui, sans-serif"),
  }
}

/** Un color hexadecimal con transparencia, en formato rgb() para canvas. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return hex
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`
}
