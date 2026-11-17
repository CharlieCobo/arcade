import { lazy } from 'react'
import { defineGame } from '@core/game'
import { SimonIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#5ad65a',
  Icon: SimonIcon,
  Component: lazy(() => import('./Simon')),
  locales,
})
