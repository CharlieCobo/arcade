import type { StateStorage } from 'zustand/middleware'

/**
 * Adaptador de almacenamiento del store de puntos.
 *
 * Hoy: localStorage (síncrono → los récords están disponibles desde el primer render).
 * Si en el futuro hace falta IndexedDB, basta con cambiar `scoresStorage` por:
 *
 *   import { get, set, del } from 'idb-keyval'
 *   export const scoresStorage: StateStorage = {
 *     getItem: async (k) => (await get(k)) ?? null,
 *     setItem: (k, v) => set(k, v),
 *     removeItem: (k) => del(k),
 *   }
 *
 * (y esperar a la hidratación con `useScoresStore.persist.hasHydrated()`).
 */
const memory = new Map<string, string>()

export const localStorageAdapter: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null // modo privado, tests o almacenamiento bloqueado
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      memory.delete(key)
    }
  },
}

export const scoresStorage: StateStorage = localStorageAdapter

/**
 * Pide al navegador que no borre nuestros datos cuando le falte espacio.
 * En una PWA instalada suele concederse sin preguntar. Si no, no pasa nada.
 */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => undefined)
  } catch {
    // API no disponible
  }
}
