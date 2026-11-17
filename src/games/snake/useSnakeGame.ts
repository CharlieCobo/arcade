import { useCallback, useEffect, useRef, useState } from 'react'
import { createGame, step, tickMs, turn, type Direction, type Mode, type SnakeState } from './logic'

export type Phase = 'ready' | 'playing' | 'paused' | 'over' | 'won'

interface Options {
  mode: Mode
  level: number
  /** Se llama una vez al terminar la partida (perder o ganar). */
  onEnd: (score: number) => void
}

/**
 * Bucle del juego con paso fijo sobre requestAnimationFrame.
 * El estado vive en un ref (lo lee el canvas cada frame) y solo se
 * sincroniza con React lo que cambia la interfaz: fase y puntos.
 */
export function useSnakeGame({ mode, level, onEnd }: Options) {
  const stateRef = useRef<SnakeState>(createGame({ mode, level }))
  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)

  const onEndRef = useRef(onEnd)
  useEffect(() => {
    onEndRef.current = onEnd
  }, [onEnd])

  // Mientras no se juega, el tablero muestra una vista previa con el modo/nivel elegido.
  useEffect(() => {
    if (phase === 'ready') stateRef.current = createGame({ mode, level })
  }, [mode, level, phase])

  const start = useCallback(() => {
    stateRef.current = createGame({ mode, level })
    setScore(0)
    setPhase('playing')
  }, [mode, level])

  const pause = useCallback(() => setPhase((p) => (p === 'playing' ? 'paused' : p)), [])
  const resume = useCallback(() => setPhase((p) => (p === 'paused' ? 'playing' : p)), [])
  const toReady = useCallback(() => setPhase('ready'), [])

  const changeDirection = useCallback(
    (dir: Direction) => {
      if (phase !== 'playing') return false
      const next = turn(stateRef.current, dir)
      const accepted = next !== stateRef.current
      stateRef.current = next
      return accepted
    },
    [phase],
  )

  // Bucle de juego
  useEffect(() => {
    if (phase !== 'playing') return
    let raf = 0
    let last = performance.now()
    let acc = 0

    const frame = (now: number) => {
      // Si la pestaña estuvo congelada, no recuperamos todos los pasos de golpe.
      acc += Math.min(now - last, 250)
      last = now

      let state = stateRef.current
      let ms = tickMs(state)
      while (acc >= ms && state.status === 'playing') {
        acc -= ms
        state = step(state)
        ms = tickMs(state)
      }

      if (state !== stateRef.current) {
        stateRef.current = state
        setScore(state.score)
        if (state.status !== 'playing') {
          setPhase(state.status)
          onEndRef.current(state.score)
          return
        }
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // Pausa automática al cambiar de app o bloquear el móvil.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', pause)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('blur', pause)
    }
  }, [pause])

  return { stateRef, phase, score, start, pause, resume, toReady, changeDirection }
}
