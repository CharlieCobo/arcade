import type { Language } from '@core/i18n/languages'
import { games, type Game } from '@games'
import es from './locales/es.json'
import en from './locales/en.json'
import pt from './locales/pt.json'

const common = { es, en, pt }

/** Un namespace por juego, con su mismo id. Se generan a partir del registro. */
type GameNamespaces = { [G in Game as G['id']]: G['locales']['es'] }
type Namespaces = { common: typeof es } & GameNamespaces

function buildLanguage(lng: Language): Namespaces {
  return {
    common: common[lng],
    ...Object.fromEntries(games.map((g) => [g.id, g.locales[lng]])),
  } as Namespaces
}

export const resources = {
  es: buildLanguage('es'),
  en: buildLanguage('en'),
  pt: buildLanguage('pt'),
}

export const defaultNS = 'common'
