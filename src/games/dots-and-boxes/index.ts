import { lazy } from 'react'
import { defineGame } from '@core/game'
import { DotsIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#a35cf0',
  Icon: DotsIcon,
  Component: lazy(() => import('./DotsAndBoxes')),
  locales,
})
