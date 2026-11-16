import { useMemo } from 'react'
import { DEFAULT_MODE, EMPTY_SCORES, useScoresStore, type GameScores } from './store'

export interface GameScoresApi extends GameScores {
  submitScore: (score: number, mode?: string) => ReturnType<ReturnType<typeof useScoresStore.getState>['submitScore']>
  increment: (key: string, by?: number) => void
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
      submitScore: (score: number, mode: string = DEFAULT_MODE) => store().submitScore(gameId, score, mode),
      increment: (key: string, by?: number) => store().increment(gameId, key, by),
      resetCounters: (prefix?: string) => store().resetCounters(gameId, prefix),
      reset: () => store().resetGame(gameId),
    }
  }, [gameId])

  return useMemo(() => ({ ...scores, ...actions }), [scores, actions])
}

/** Mejor puntuación de un juego: la de un modo concreto o la máxima entre todos. */
export function useBestScore(gameId: string, mode?: string): number | null {
  return useScoresStore((s) => {
    const best = s.games[gameId]?.best
    if (!best) return null
    if (mode) return best[mode] ?? null
    const values = Object.values(best)
    return values.length ? Math.max(...values) : null
  })
}
