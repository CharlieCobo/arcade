import { useGameScores } from '@core/scores'
import { GAME_ID } from './meta'

/** Un único récord: la puntuación no depende del nivel inicial elegido. */
const MODE = 'marathon'

export function useBlocksScores() {
  const scores = useGameScores(GAME_ID)
  return {
    best: scores.best[MODE] ?? 0,
    submit: (score: number) => {
      scores.increment('played')
      return scores.submitScore(score, MODE)
    },
  }
}
