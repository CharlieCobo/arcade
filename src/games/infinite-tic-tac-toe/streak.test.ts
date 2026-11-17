import { describe, expect, it } from 'vitest'
import { applyMove, initialState } from './logic'
import { isRoundInProgress, nextStreak } from './streak'

describe('nextStreak', () => {
  it('suma 1 con cada victoria', () => {
    expect(nextStreak(0, 'win')).toBe(1)
    expect(nextStreak(4, 'win')).toBe(5)
  })

  it('vuelve a 0 al perder', () => {
    expect(nextStreak(7, 'loss')).toBe(0)
  })
})

describe('isRoundInProgress', () => {
  it('una partida sin jugadas no está en curso', () => {
    expect(isRoundInProgress(initialState())).toBe(false)
  })

  it('con alguna jugada y sin ganador, sí', () => {
    expect(isRoundInProgress(applyMove(initialState(), 4)!)).toBe(true)
  })

  it('una partida terminada no está en curso', () => {
    const won = [0, 3, 1, 4, 2].reduce((s, i) => applyMove(s, i)!, initialState())
    expect(won.winner).toBe('X')
    expect(isRoundInProgress(won)).toBe(false)
  })
})
