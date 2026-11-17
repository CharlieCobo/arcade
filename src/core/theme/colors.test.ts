import { describe, expect, it } from 'vitest'
import { withAlpha } from './colors'
import { THEMES, isThemeId } from './themes'

describe('withAlpha', () => {
  it('convierte hex de 6 y 3 cifras', () => {
    expect(withAlpha('#ff5d8f', 0.5)).toBe('rgb(255 93 143 / 0.5)')
    expect(withAlpha('#fff', 0.1)).toBe('rgb(255 255 255 / 0.1)')
  })
  it('devuelve el valor tal cual si no es hex', () => {
    expect(withAlpha('red', 0.2)).toBe('red')
  })
})

describe('themes', () => {
  it('ids únicos y validación', () => {
    const ids = THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(isThemeId('kawaii')).toBe(true)
    expect(isThemeId('nope')).toBe(false)
  })
})
