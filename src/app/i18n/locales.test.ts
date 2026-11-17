import { describe, expect, it } from 'vitest'
import { resources } from './resources'

type Tree = Record<string, unknown>

/** Devuelve todas las rutas de claves de un objeto: "home.title", "meta.tags"… */
function keys(obj: Tree, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    return v && typeof v === 'object' && !Array.isArray(v) ? keys(v as Tree, path) : [path]
  })
}

describe('traducciones', () => {
  const all = resources as unknown as Record<string, Record<string, Tree>>
  const reference = all.es!

  for (const [lng, namespaces] of Object.entries(all)) {
    if (lng === 'es') continue
    for (const ns of Object.keys(reference)) {
      it(`${lng}/${ns} tiene las mismas claves que es/${ns}`, () => {
        expect(namespaces[ns], `falta el namespace ${ns}`).toBeDefined()
        expect(keys(namespaces[ns]!).sort()).toEqual(keys(reference[ns]!).sort())
      })
    }
  }
})
