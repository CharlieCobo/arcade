import { lazy } from 'react'
import { defineGame } from '@core/game'
import { HangmanIcon } from './Icon'
import { locales } from './locales'
import { GAME_ID } from './meta'

export default defineGame({
  id: GAME_ID,
  accent: '#ff5d8f',
  Icon: HangmanIcon,
  Component: lazy(() => import('./Hangman')),
  locales,
})
