import { beforeEach, describe, expect, it } from 'vitest'
import { scoresStorage } from './storage'
import { HISTORY_LIMIT, useScoresStore } from './store'

const store = () => useScoresStore.getState()

beforeEach(() => {
  useScoresStore.setState({ games: {} })
})

describe('submitScore', () => {
  it('guarda el primer resultado como récord', () => {
    expect(store().submitScore('snake', 12, 'classic')).toEqual({ isRecord: true, previousBest: 0 })
    expect(store().games.snake?.best.classic).toBe(12)
  })

  it('solo actualiza el récord si se supera', () => {
    store().submitScore('snake', 12, 'classic')
    expect(store().submitScore('snake', 8, 'classic').isRecord).toBe(false)
    expect(store().submitScore('snake', 12, 'classic').isRecord).toBe(false)
    expect(store().submitScore('snake', 20, 'classic')).toEqual({ isRecord: true, previousBest: 12 })
    expect(store().games.snake?.best.classic).toBe(20)
  })

  it('lleva un récord independiente por modo', () => {
    store().submitScore('snake', 30, 'classic')
    store().submitScore('snake', 5, 'no-walls')
    expect(store().games.snake?.best).toEqual({ classic: 30, 'no-walls': 5 })
  })

  it('una puntuación de 0 no es récord', () => {
    expect(store().submitScore('snake', 0).isRecord).toBe(false)
  })

  it('guarda el historial, más reciente primero y limitado', () => {
    for (let i = 1; i <= HISTORY_LIMIT + 5; i++) store().submitScore('snake', i)
    const history = store().games.snake!.history
    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history[0]!.score).toBe(HISTORY_LIMIT + 5)
  })
})

describe('recordBest', () => {
  it('actualiza el récord sin tocar el historial', () => {
    expect(store().recordBest('ttt', 3, 'cpu-streak')).toEqual({ isRecord: true, previousBest: 0 })
    expect(store().recordBest('ttt', 2, 'cpu-streak').isRecord).toBe(false)
    expect(store().games.ttt?.best['cpu-streak']).toBe(3)
    expect(store().games.ttt?.history).toEqual([])
  })
})

describe('contadores', () => {
  it('setCounter fija un valor', () => {
    store().increment('ttt', 'streak', 4)
    store().setCounter('ttt', 'streak', 0)
    expect(store().games.ttt?.counters.streak).toBe(0)
  })

  it('incrementa y resetea por prefijo', () => {
    store().increment('ttt', 'pvp:X')
    store().increment('ttt', 'pvp:X')
    store().increment('ttt', 'cpu:O', 3)
    expect(store().games.ttt?.counters).toEqual({ 'pvp:X': 2, 'cpu:O': 3 })

    store().resetCounters('ttt', 'pvp:')
    expect(store().games.ttt?.counters).toEqual({ 'cpu:O': 3 })

    store().resetCounters('ttt')
    expect(store().games.ttt?.counters).toEqual({})
  })
})

describe('aislamiento entre juegos', () => {
  it('los puntos de un juego no afectan a otro', () => {
    store().submitScore('snake', 10)
    store().increment('ttt', 'pvp:X')
    store().resetGame('snake')
    expect(store().games.snake).toBeUndefined()
    expect(store().games.ttt?.counters['pvp:X']).toBe(1)
  })
})

describe('persistencia', () => {
  it('escribe el estado en el almacenamiento con versión', async () => {
    store().submitScore('snake', 42, 'classic')
    const raw = await scoresStorage.getItem('arcade:scores')
    const saved = JSON.parse(raw as string)
    expect(saved.version).toBe(1)
    expect(saved.state.games.snake.best.classic).toBe(42)
    expect(saved.state.submitScore).toBeUndefined() // solo datos, no acciones
  })
})
