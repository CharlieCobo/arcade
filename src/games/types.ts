import type { ComponentType, LazyExoticComponent } from 'react'
import type { resources } from '../i18n/resources'

/** Cada juego tiene un namespace de i18n con su mismo id. */
export type GameId = Exclude<keyof (typeof resources)['es'], 'common'>

export interface GameDefinition {
  /** Slug de la URL (#/juegos/<id>) y namespace de i18n (meta.title, meta.description, meta.tags) */
  id: GameId
  /** Color principal de la tarjeta en el baúl */
  accent: string
  Icon: ComponentType<{ size?: number }>
  Component: LazyExoticComponent<ComponentType>
}
