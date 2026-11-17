import type { GameState } from './logic'

/**
 * Racha invicto contra la CPU: victorias seguidas.
 * Perder, o abandonar una partida ya empezada, la devuelve a 0
 * (si no, bastaría con empezar de nuevo cada vez que vas perdiendo).
 */
export type CpuOutcome = 'win' | 'loss'

export const nextStreak = (current: number, outcome: CpuOutcome): number =>
  outcome === 'win' ? current + 1 : 0

/** Partida empezada y sin terminar: abandonarla cuenta como derrota para la racha. */
export const isRoundInProgress = (state: Pick<GameState, 'moves' | 'winner'>): boolean =>
  state.moves > 0 && state.winner === null
