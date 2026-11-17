import { useGameScores } from '@core/scores'
import type { CpuLevel, Mode, Side } from './logic'
import { GAME_ID } from './meta'

/** Récord: el rally más largo (en cualquier modo). Además, victorias y derrotas. */
export const RALLY_MODE = 'rally'

export function usePingPongScores() {
  const scores = useGameScores(GAME_ID)
  return {
    bestRally: scores.best[RALLY_MODE] ?? 0,
    /** Guarda el partido. Devuelve si el rally más largo es récord. */
    submit: (opts: { mode: Mode; cpuLevel: CpuLevel; winner: Side; bestRally: number }) => {
      if (opts.mode === 'cpu') {
        scores.increment(`cpu:${opts.cpuLevel}:${opts.winner === 'bottom' ? 'wins' : 'losses'}`)
      } else {
        scores.increment(`pvp:${opts.winner}`)
      }
      return scores.recordBest(opts.bestRally, RALLY_MODE).isRecord
    },
  }
}
