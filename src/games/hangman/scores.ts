import { useGameScores } from '@core/scores'
import type { Difficulty } from './logic'
import { GAME_ID } from './meta'

/** Racha de palabras acertadas seguidas en modo solo: actual (contador) y mejor (récord). */
const STREAK_KEY = 'streak'
const STREAK_BEST = 'streak'

export function useHangmanScores() {
  const scores = useGameScores(GAME_ID)
  return {
    streak: scores.counters[STREAK_KEY] ?? 0,
    bestStreak: scores.best[STREAK_BEST] ?? 0,
    /** Guarda una palabra en modo solo. Devuelve la nueva racha y si es récord. */
    recordSolo: (won: boolean, difficulty: Difficulty) => {
      scores.increment(`solo:${difficulty}:${won ? 'wins' : 'losses'}`)
      const streak = won ? scores.getCounter(STREAK_KEY) + 1 : 0
      scores.setCounter(STREAK_KEY, streak)
      return { streak, isRecord: won && scores.recordBest(streak, STREAK_BEST).isRecord }
    },
    recordFriend: (won: boolean) => scores.increment(`friend:${won ? 'wins' : 'losses'}`),
  }
}
