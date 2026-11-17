import { lazy } from 'react'
import { defineGame } from '@core/game'
import { FollowTheLightIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#5ad65a',
  Icon: FollowTheLightIcon,
  Component: lazy(() => import('./FollowTheLight')),
  locales,
})
