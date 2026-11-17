import { useGameScores } from '@core/scores'
import type { Difficulty } from './logic'
import { GAME_ID } from './meta'

/** Récord: mejor tiempo (segundos) por dificultad. */
export function useMinesScores(difficulty: Difficulty) {
  const scores = useGameScores(GAME_ID)
  return {
    bestTime: scores.best[difficulty] ?? null,
    submit: (won: boolean, seconds: number) => {
      scores.increment(`${difficulty}:${won ? 'wins' : 'losses'}`)
      return won ? scores.submitScore(seconds, difficulty, { lowerIsBetter: true }) : null
    },
  }
}
