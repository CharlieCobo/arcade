import { lazy } from 'react'
import { defineGame } from '@core/game'
import { PingPongIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#4cc9f0',
  Icon: PingPongIcon,
  Component: lazy(() => import('./PingPong')),
  locales,
})
