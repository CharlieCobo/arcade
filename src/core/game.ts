import type { ComponentType, LazyExoticComponent } from 'react'
import type { Language } from './i18n/languages'

/** Textos mínimos que todo juego debe traducir para aparecer en el baúl. */
export interface GameMetaMessages {
  meta: { title: string; description: string; tags: string[] }
}

/**
 * Contrato de un juego. Cada módulo de `src/games/<id>/` exporta uno desde su `index.ts`.
 * El `id` es a la vez el slug de la URL, el namespace de i18n y la clave en el store de puntos.
 */
export interface GameManifest<Id extends string = string, Messages extends GameMetaMessages = GameMetaMessages> {
  id: Id
  /** Color principal de la tarjeta en el baúl */
  accent: string
  Icon: ComponentType<{ size?: number }>
  /** Pantalla del juego, cargada bajo demanda */
  Component: LazyExoticComponent<ComponentType>
  locales: Record<Language, Messages>
}

/** Helper para declarar un juego conservando los tipos literales de id y textos. */
export function defineGame<const Id extends string, Messages extends GameMetaMessages>(
  manifest: GameManifest<Id, Messages>,
): GameManifest<Id, Messages> {
  return manifest
}
