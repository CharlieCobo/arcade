import { describe, expect, it } from 'vitest'
import { matchesQuery, normalize } from './search'

describe('búsqueda de juegos', () => {
  it('ignora mayúsculas, tildes y espacios alrededor', () => {
    expect(normalize('  Tres en Raya ')).toBe('tres en raya')
    expect(matchesQuery('Jogo da velha infinito', 'VÉLHA')).toBe(true)
    expect(matchesQuery('Tres en raya infinito', 'raya')).toBe(true)
  })

  it('una búsqueda vacía muestra todos los juegos', () => {
    expect(matchesQuery('Snake', '')).toBe(true)
    expect(matchesQuery('Snake', '   ')).toBe(true)
  })

  it('no encuentra lo que no está en el nombre', () => {
    expect(matchesQuery('Snake', 'brick')).toBe(false)
  })
})
