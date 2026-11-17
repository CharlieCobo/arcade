import { useGameScores } from '@core/scores'
import type { Difficulty, Mode } from './logic'
import { GAME_ID } from './meta'

/** Récord por modo: rondas completadas. */
export function useFollowTheLightScores(mode: Mode) {
  const scores = useGameScores(GAME_ID)
  return {
    best: scores.best[mode] ?? 0,
    submit: (rounds: number, difficulty: Difficulty) => {
      scores.increment(`played:${mode}:${difficulty}`)
      return scores.submitScore(rounds, mode)
    },
  }
}
