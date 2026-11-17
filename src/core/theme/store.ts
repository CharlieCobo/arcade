import { useSyncExternalStore } from 'react'
import { DEFAULT_THEME, LEGACY_THEMES, THEMES, THEME_STORAGE_KEY, isThemeId, type ThemeId } from './themes'

const listeners = new Set<() => void>()

function read(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    const stored = raw ? (LEGACY_THEMES[raw] ?? raw) : raw
    return isThemeId(stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

let current: ThemeId = read()

/** Pone el tema en <html> y ajusta el color de la barra del sistema. */
export function applyTheme(id: ThemeId) {
  const root = document.documentElement
  root.dataset.theme = id
  const theme = THEMES.find((t) => t.id === id)
  if (theme) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg)
}

export function getTheme(): ThemeId {
  return current
}

export function setTheme(id: ThemeId) {
  current = id
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    // Modo privado: el tema dura lo que dure la sesión
  }
  applyTheme(id)
  listeners.forEach((l) => l())
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getTheme,
    getTheme,
  )
}
