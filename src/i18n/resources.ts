import es from './locales/es.json'
import en from './locales/en.json'
import pt from './locales/pt.json'
import { locales as infiniteTicTacToe } from '../games/infinite-tic-tac-toe/locales'

/**
 * Cada juego tiene su propio namespace (igual a su id en el registro).
 * Al añadir un juego, importa sus locales aquí.
 */
export const resources = {
  es: { common: es, 'infinite-tic-tac-toe': infiniteTicTacToe.es },
  en: { common: en, 'infinite-tic-tac-toe': infiniteTicTacToe.en },
  pt: { common: pt, 'infinite-tic-tac-toe': infiniteTicTacToe.pt },
} as const

export const defaultNS = 'common'
