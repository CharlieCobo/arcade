import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { scoresStorage } from './storage'

export const DEFAULT_MODE = 'default'
export const HISTORY_LIMIT = 20

export interface ScoreEntry {
  score: number
  mode: string
  /** Fecha en ms (Date.now()) */
  at: number
}

/** Puntos de un juego. Cada juego usa las partes que necesite. */
export interface GameScores {
  /** Récord por modo de juego (p. ej. Snake: classic, no-walls) */
  best: Record<string, number>
  /** Contadores libres (p. ej. tres en raya: "pvp:X" → victorias de X en 2 jugadores) */
  counters: Record<string, number>
  /** Últimas partidas, la más reciente primero */
  history: ScoreEntry[]
}

export interface SubmitResult {
  isRecord: boolean
  previousBest: number
}

interface ScoresState {
  games: Record<string, GameScores>
  /** Guarda una partida en el historial y actualiza el récord del modo si lo supera. */
  submitScore: (gameId: string, score: number, mode?: string) => SubmitResult
  /** Actualiza el récord del modo si lo supera, sin añadir nada al historial (p. ej. rachas). */
  recordBest: (gameId: string, score: number, mode?: string) => SubmitResult
  increment: (gameId: string, key: string, by?: number) => void
  setCounter: (gameId: string, key: string, value: number) => void
  /** Pone a cero los contadores del juego (solo los que empiezan por `prefix`, si se indica). */
  resetCounters: (gameId: string, prefix?: string) => void
  /** Borra todos los puntos de un juego. */
  resetGame: (gameId: string) => void
}

export const EMPTY_SCORES: GameScores = Object.freeze({
  best: {},
  counters: {},
  history: [],
}) as GameScores

const STORE_VERSION = 1

export const useScoresStore = create<ScoresState>()(
  persist(
    (set, get) => {
      const update = (gameId: string, fn: (g: GameScores) => GameScores) =>
        set((s) => ({ games: { ...s.games, [gameId]: fn(s.games[gameId] ?? EMPTY_SCORES) } }))

      return {
        games: {},

        recordBest: (gameId, score, mode = DEFAULT_MODE) => {
          const previousBest = get().games[gameId]?.best[mode] ?? 0
          const isRecord = score > previousBest
          if (isRecord) update(gameId, (g) => ({ ...g, best: { ...g.best, [mode]: score } }))
          return { isRecord, previousBest }
        },

        submitScore: (gameId, score, mode = DEFAULT_MODE) => {
          const result = get().recordBest(gameId, score, mode)
          update(gameId, (g) => ({
            ...g,
            history: [{ score, mode, at: Date.now() }, ...g.history].slice(0, HISTORY_LIMIT),
          }))
          return result
        },

        increment: (gameId, key, by = 1) =>
          update(gameId, (g) => ({
            ...g,
            counters: { ...g.counters, [key]: (g.counters[key] ?? 0) + by },
          })),

        setCounter: (gameId, key, value) =>
          update(gameId, (g) => ({ ...g, counters: { ...g.counters, [key]: value } })),

        resetCounters: (gameId, prefix) =>
          update(gameId, (g) => ({
            ...g,
            counters: prefix
              ? Object.fromEntries(Object.entries(g.counters).filter(([k]) => !k.startsWith(prefix)))
              : {},
          })),

        resetGame: (gameId) =>
          set((s) => {
            const games = { ...s.games }
            delete games[gameId]
            return { games }
          }),
      }
    },
    {
      name: 'arcade:scores',
      version: STORE_VERSION,
      storage: createJSONStorage(() => scoresStorage),
      partialize: (s) => ({ games: s.games }),
      // Cuando cambie el formato: sube STORE_VERSION y transforma aquí los datos antiguos.
      migrate: (persisted) => persisted as { games: Record<string, GameScores> },
    },
  ),
)
