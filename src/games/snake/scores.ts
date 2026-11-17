import { useGameScores } from '@core/scores'
import type { Mode } from './logic'
import { GAME_ID } from './meta'

/** Puntos del Snake sobre el store compartido: un récord por modo. */
export function useSnakeScores(mode: Mode) {
  const scores = useGameScores(GAME_ID)
  return {
    best: scores.best[mode] ?? 0,
    /** Guarda la partida y devuelve si es récord. */
    submit: (score: number) => {
      scores.increment(`played:${mode}`)
      return scores.submitScore(score, mode)
    },
  }
}
