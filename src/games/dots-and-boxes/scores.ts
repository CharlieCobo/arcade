import { useGameScores } from '@core/scores'
import type { Level, Player } from './logic'
import { GAME_ID } from './meta'

export type Mode = 'pvp' | 'cpu'
export type Outcome = 'win' | 'loss' | 'draw'

const streakKey = (level: Level) => `streak:${level}`
const bestKey = (level: Level) => `streak-${level}`

/** Victorias por modo y racha invicto contra la CPU por dificultad (la mejor es el récord). */
export function useDotsScores(mode: Mode, level: Level) {
  const scores = useGameScores(GAME_ID)
  const prefix = mode === 'cpu' ? `cpu:${level}` : 'pvp'
  return {
    wins: {
      1: scores.counters[`${prefix}:1`] ?? 0,
      2: scores.counters[`${prefix}:2`] ?? 0,
    } as Record<Player, number>,
    streak: scores.counters[streakKey(level)] ?? 0,
    bestStreak: scores.best[bestKey(level)] ?? 0,
    addWin: (p: Player) => scores.increment(`${prefix}:${p}`),
    recordCpu: (outcome: Outcome): boolean => {
      if (outcome === 'draw') return false
      const next = outcome === 'win' ? scores.getCounter(streakKey(level)) + 1 : 0
      scores.setCounter(streakKey(level), next)
      return outcome === 'win' && scores.recordBest(next, bestKey(level)).isRecord
    },
  }
}
