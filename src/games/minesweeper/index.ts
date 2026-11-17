import { lazy } from 'react'
import { defineGame } from '@core/game'
import { MinesweeperIcon } from './Icon'
import { locales } from './locales'
import { formatTime } from './logic'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#8b8fb8',
  Icon: MinesweeperIcon,
  Component: lazy(() => import('./Minesweeper')),
  locales,
  // El récord es el mejor tiempo: cuanto menos, mejor
  score: { lowerIsBetter: true, format: formatTime },
})
