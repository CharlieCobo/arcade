import { describe, expect, it } from 'vitest'
import { formatCompact } from './formatCompact'

describe('formatCompact', () => {
  it('deja tal cual los números menores de 1000', () => {
    expect(formatCompact(0)).toBe('0')
    expect(formatCompact(50)).toBe('50')
    expect(formatCompact(999)).toBe('999')
  })

  it('miles con K', () => {
    expect(formatCompact(1000)).toBe('1K')
    expect(formatCompact(2500)).toBe('2.5K')
    expect(formatCompact(12345)).toBe('12.3K')
    expect(formatCompact(250000)).toBe('250K')
  })

  it('millones, miles de millones y billones', () => {
    expect(formatCompact(10_000_000)).toBe('10M')
    expect(formatCompact(1_250_000)).toBe('1.2M')
    expect(formatCompact(3_400_000_000)).toBe('3.4B')
    expect(formatCompact(2e12)).toBe('2T')
  })

  it('trunca en vez de redondear (no infla el récord)', () => {
    expect(formatCompact(1999)).toBe('1.9K')
    expect(formatCompact(999_999)).toBe('999K')
    expect(formatCompact(99_999)).toBe('99.9K')
  })

  it('no muestra ".0"', () => {
    expect(formatCompact(5000)).toBe('5K')
    expect(formatCompact(5049)).toBe('5K')
  })

  it('negativos y valores raros', () => {
    expect(formatCompact(-2500)).toBe('-2.5K')
    expect(formatCompact(NaN)).toBe('NaN')
  })
})
