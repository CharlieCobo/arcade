import { lazy } from 'react'
import type { GameDefinition } from './types'
import { InfiniteTicTacToeIcon } from './infinite-tic-tac-toe/Icon'

/**
 * Baúl de juegos. Para añadir uno nuevo:
 * 1. Crea su carpeta en src/games/<id>/ con un componente por defecto y sus locales.
 * 2. Registra sus locales en src/i18n/resources.ts con el namespace <id>.
 * 3. Añade su entrada aquí.
 */
export const games: GameDefinition[] = [
  {
    id: 'infinite-tic-tac-toe',
    accent: '#ff5d8f',
    Icon: InfiniteTicTacToeIcon,
    Component: lazy(() => import('./infinite-tic-tac-toe/InfiniteTicTacToe')),
  },
]

export const findGame = (id: string | undefined) => games.find((g) => g.id === id)
