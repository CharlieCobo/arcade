import { useEffect } from 'react'
import { useGameScores } from '@core/scores'
import type { Player } from './logic'
import { GAME_ID } from './meta'

export type Mode = 'pvp' | 'cpu'

/** Clave del contador de victorias: "pvp:X", "cpu:O"… */
export const winsKey = (mode: Mode, player: Player) => `${mode}:${player}`

/** Puntos del tres en raya, ya ligados a su id en el store compartido. */
export function useTicTacToeScores(mode: Mode) {
  const scores = useGameScores(GAME_ID)
  const wins: Record<Player, number> = {
    X: scores.counters[winsKey(mode, 'X')] ?? 0,
    O: scores.counters[winsKey(mode, 'O')] ?? 0,
  }

  useMigrateLegacyScore(scores.increment)

  return {
    wins,
    addWin: (player: Player) => scores.increment(winsKey(mode, player)),
    resetWins: () => scores.resetCounters(`${mode}:`),
  }
}

/**
 * Hasta la v0.2 el marcador se guardaba en localStorage como "ittt:score" (sin modo).
 * Lo pasamos una sola vez al store compartido. Se lee y se borra en el mismo paso,
 * así que es seguro aunque el efecto se ejecute dos veces (StrictMode).
 */
const LEGACY_SCORE_KEY = 'ittt:score'
const LEGACY_MODE_KEY = 'ittt:mode'

function useMigrateLegacyScore(increment: (key: string, by?: number) => void) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEGACY_SCORE_KEY)
      if (!raw) return
      localStorage.removeItem(LEGACY_SCORE_KEY)

      const legacy = JSON.parse(raw) as Partial<Record<Player, number>>
      const mode: Mode = JSON.parse(localStorage.getItem(LEGACY_MODE_KEY) ?? '"pvp"') === 'cpu' ? 'cpu' : 'pvp'
      for (const player of ['X', 'O'] as const) {
        const n = legacy[player]
        if (typeof n === 'number' && n > 0) increment(winsKey(mode, player), n)
      }
    } catch {
      // Datos antiguos corruptos o sin acceso a localStorage: no hay nada que migrar.
    }
  }, [increment])
}
