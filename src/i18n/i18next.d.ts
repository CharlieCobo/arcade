import 'i18next'
import type { defaultNS, resources } from './resources'

// Claves de traducción tipadas: t('home.titel') da error de compilación.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: (typeof resources)['es']
  }
}
