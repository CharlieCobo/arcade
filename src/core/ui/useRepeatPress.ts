import { useEffect, useRef } from 'react'

export interface RepeatConfig {
  /** ms antes de empezar a repetir (DAS) */
  delay: number
  /** ms entre repeticiones (ARR) */
  interval: number
}

/**
 * Pulsación que responde al instante (pointerdown) y, si se mantiene,
 * se repite como un mando: primero tras `delay` y luego cada `interval`.
 */
export function useRepeatPress() {
  const timers = useRef<{ timeout?: number; interval?: number }>({})

  const stop = () => {
    window.clearTimeout(timers.current.timeout)
    window.clearInterval(timers.current.interval)
    timers.current = {}
  }

  useEffect(() => stop, [])

  const start = (action: () => void, repeat?: RepeatConfig) => {
    stop()
    action()
    if (!repeat) return
    timers.current.timeout = window.setTimeout(() => {
      timers.current.interval = window.setInterval(action, repeat.interval)
    }, repeat.delay)
  }

  return { start, stop }
}
