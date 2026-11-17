import { lazy } from 'react'
import { defineGame } from '@core/game'
import { SnakeIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#4cc9f0',
  Icon: SnakeIcon,
  Component: lazy(() => import('./Snake')),
  locales,
})
