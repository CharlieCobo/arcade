import type { ComponentType, LazyExoticComponent } from 'react'

export interface GameDefinition {
  /** Slug usado en la URL: #/juegos/<id> */
  id: string
  title: string
  description: string
  tags: string[]
  /** Color principal de la tarjeta en el baúl */
  accent: string
  Icon: ComponentType<{ size?: number }>
  Component: LazyExoticComponent<ComponentType>
}
