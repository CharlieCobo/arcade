/** Temas disponibles. Los colores de cada uno viven en global.css ([data-theme]). */
export const THEMES = [
  { id: 'arcade', scheme: 'dark', bg: '#0f1020', panel: '#1a1b33', x: '#ff5d8f', o: '#4cc9f0' },
  { id: 'retro', scheme: 'dark', bg: '#000000', panel: '#141414', x: '#ff55ff', o: '#55ffff' },
  { id: 'light', scheme: 'light', bg: '#f3f4fa', panel: '#ffffff', x: '#e23d73', o: '#1597c9' },
  { id: 'kawaii', scheme: 'light', bg: '#fff0f6', panel: '#ffffff', x: '#ff5fa2', o: '#7b8cff' },
  { id: 'cyberpunk', scheme: 'dark', bg: '#0a0614', panel: '#160d26', x: '#ff2a6d', o: '#05d9e8' },
  { id: 'forest', scheme: 'dark', bg: '#0e1913', panel: '#15251c', x: '#ff8a5b', o: '#79e0a6' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export const DEFAULT_THEME: ThemeId = 'arcade'
export const THEME_STORAGE_KEY = 'arcade:theme'

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value)
}
