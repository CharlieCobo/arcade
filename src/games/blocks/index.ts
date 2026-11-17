import { lazy } from 'react'
import { defineGame } from '@core/game'
import { BlocksIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#a35cf0',
  Icon: BlocksIcon,
  Component: lazy(() => import('./Blocks')),
  locales,
})
