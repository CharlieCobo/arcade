import { useMemo } from 'react'
import { DEFAULT_MODE, EMPTY_SCORES, useScoresStore, type GameScores, type RecordOptions } from './store'

export interface GameScoresApi extends GameScores {
  submitScore: (score: number, mode?: string, opts?: RecordOptions) => ReturnType<ReturnType<typeof useScoresStore.getState>['submitScore']>
  recordBest: (score: number, mode?: string, opts?: RecordOptions) => ReturnType<GameScoresApi['submitScore']>
  increment: (key: string, by?: number) => void
  setCounter: (key: string, value: number) => void
  /** Lee el valor actual de un contador directamente del store (sin esperar al render). */
  getCounter: (key: string) => number
  resetCounters: (prefix?: string) => void
  reset: () => void
}

/**
 * Puntos de UN juego. Las acciones ya llevan el gameId: un juego no puede
 * tocar los puntos de otro por error.
 */
export function useGameScores(gameId: string): GameScoresApi {
  const scores = useScoresStore((s) => s.games[gameId] ?? EMPTY_SCORES)

  const actions = useMemo(() => {
    const store = () => useScoresStore.getState()
    return {
      submitScore: (score: number, mode: string = DEFAULT_MODE, opts?: RecordOptions) => store().submitScore(gameId, score, mode, opts),
      recordBest: (score: number, mode: string = DEFAULT_MODE, opts?: RecordOptions) => store().recordBest(gameId, score, mode, opts),
      increment: (key: string, by?: number) => store().increment(gameId, key, by),
      setCounter: (key: string, value: number) => store().setCounter(gameId, key, value),
      getCounter: (key: string) => store().games[gameId]?.counters[key] ?? 0,
      resetCounters: (prefix?: string) => store().resetCounters(gameId, prefix),
      reset: () => store().resetGame(gameId),
    }
  }, [gameId])

  return useMemo(() => ({ ...scores, ...actions }), [scores, actions])
}

/**
 * Mejor puntuación de un juego: la de un modo concreto o la mejor entre todos
 * (la más alta, o la más baja si `lowerIsBetter`, p. ej. para tiempos).
 */
export function useBestScore(gameId: string, mode?: string, opts?: RecordOptions): number | null {
  return useScoresStore((s) => {
    const best = s.games[gameId]?.best
    if (!best) return null
    if (mode) return best[mode] ?? null
    const values = Object.values(best)
    if (!values.length) return null
    return opts?.lowerIsBetter ? Math.min(...values) : Math.max(...values)
  })
}
