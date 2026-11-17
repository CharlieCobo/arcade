import { useGameScores } from '@core/scores'
import type { Difficulty } from './logic'
import { GAME_ID } from './meta'

/** Un récord por dificultad. */
export function useBrickBashScores(difficulty: Difficulty) {
  const scores = useGameScores(GAME_ID)
  return {
    best: scores.best[difficulty] ?? 0,
    submit: (score: number) => {
      scores.increment(`played:${difficulty}`)
      return scores.submitScore(score, difficulty)
    },
  }
}
