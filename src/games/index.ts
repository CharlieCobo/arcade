import infiniteTicTacToe from './infinite-tic-tac-toe'
import snake from './snake'
import blocks from './blocks'
import brickBash from './brick-bash'
import pingPong from './ping-pong'
import hangman from './hangman'
import simon from './simon'

/**
 * Baúl de juegos. Para añadir uno nuevo:
 * 1. Crea su módulo en src/games/<id>/ con un index.ts que exporte `defineGame({...})`.
 * 2. Añádelo a esta lista. Ruta, tarjeta y traducciones se configuran solas.
 *
 * Regla: un juego solo puede importar de @core, nunca de otro juego ni de @app.
 */
export const games = [infiniteTicTacToe, snake, blocks, brickBash, pingPong, hangman, simon] as const

export type Game = (typeof games)[number]
export type GameId = Game['id']

export const findGame = (id: string | undefined): Game | undefined =>
  games.find((g) => g.id === id)
