import { lazy } from 'react'
import { defineGame } from '@core/game'
import { FourInARowIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#3b6ff0',
  Icon: FourInARowIcon,
  Component: lazy(() => import('./FourInARow')),
  locales,
})
