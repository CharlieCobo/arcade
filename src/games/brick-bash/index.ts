import { lazy } from 'react'
import { defineGame } from '@core/game'
import { BrickBashIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#f59a3a',
  Icon: BrickBashIcon,
  Component: lazy(() => import('./BrickBash')),
  locales,
})
