import { lazy } from 'react'
import type { GameDefinition } from './types'
import { InfiniteTicTacToeIcon } from './infinite-tic-tac-toe/Icon'

/**
 * Baúl de juegos. Para añadir uno nuevo:
 * 1. Crea su carpeta en src/games/<id>/ con un componente por defecto.
 * 2. Añade su entrada aquí.
 */
export const games: GameDefinition[] = [
  {
    id: 'infinite-tic-tac-toe',
    title: 'Tres en raya infinito',
    description: 'Solo 3 fichas por jugador: al poner la cuarta, desaparece la más antigua.',
    tags: ['2 jugadores', 'vs CPU'],
    accent: '#ff5d8f',
    Icon: InfiniteTicTacToeIcon,
    Component: lazy(() => import('./infinite-tic-tac-toe/InfiniteTicTacToe')),
  },
]

export const findGame = (id: string | undefined) => games.find((g) => g.id === id)
