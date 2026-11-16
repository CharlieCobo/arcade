import { useEffect, useState } from 'react'

/** Estado que se guarda en localStorage. Si no está disponible, funciona solo en memoria. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Modo privado o almacenamiento lleno: seguimos en memoria.
    }
  }, [key, value])

  return [value, setValue] as const
}
