import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FIELD_W,
  createGame,
  setDir,
  setTarget,
  update,
  type CpuLevel,
  type GameEvent,
  type Mode,
  type PongState,
  type Side,
} from './logic'

export type Phase = 'ready' | 'playing' | 'paused' | 'over'

export interface Options {
  mode: Mode
  cpuLevel: CpuLevel
  target: number
}

interface Callbacks {
  onEvents?: (events: GameEvent[]) => void
  onEnd: (state: PongState) => void
}

export interface Hud {
  score: Record<Side, number>
  rally: number
}

/**
 * Bucle de juego. El estado vive en un ref (lo lee el canvas cada frame);
 * a React solo llegan el marcador, el rally y la fase.
 */
export function useTableTennis(options: Options, callbacks: Callbacks) {
  const [initial] = useState(() => createGame(options))
  const stateRef = useRef<PongState>(initial)
  const fxQueue = useRef<GameEvent[]>([])
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState<Hud>({ score: initial.score, rally: 0 })

  const cbRef = useRef(callbacks)
  useEffect(() => {
    cbRef.current = callbacks
  })

  const commit = useCallback((next: PongState) => {
    const prev = stateRef.current
    if (next === prev) return
    stateRef.current = next
    if (next.events.length) {
      fxQueue.current.push(...next.events)
      cbRef.current.onEvents?.(next.events)
    }
    if (next.score !== prev.score || next.rally !== prev.rally) {
      setHud({ score: next.score, rally: next.rally })
    }
    if (next.status === 'over' && prev.status !== 'over') {
      setPhase('over')
      cbRef.current.onEnd(next)
    }
  }, [])

  const { mode, cpuLevel, target } = options
  const start = useCallback(() => {
    stateRef.current = createGame({ mode, cpuLevel, target })
    fxQueue.current = []
    setHud({ score: stateRef.current.score, rally: 0 })
    setPhase('playing')
  }, [mode, cpuLevel, target])

  const pause = useCallback(() => setPhase((p) => (p === 'playing' ? 'paused' : p)), [])
  const resume = useCallback(() => setPhase((p) => (p === 'paused' ? 'playing' : p)), [])
  const toReady = useCallback(() => setPhase('ready'), [])

  /** Terminar desde la pausa: vuelve al menú sin registrar el partido. */
  const endGame = useCallback(() => setPhase('ready'), [])

  const playing = phase === 'playing'

  /** Mueve una pala una distancia relativa (unidades de la mesa). */
  const moveBy = useCallback(
    (side: Side, dx: number) => {
      if (!playing) return
      const s = stateRef.current
      const from = s.paddles[side].target ?? s.paddles[side].x
      stateRef.current = setTarget(s, side, Math.min(FIELD_W, Math.max(0, from + dx)))
    },
    [playing],
  )

  const steer = useCallback(
    (side: Side, dir: -1 | 0 | 1) => {
      if (playing) stateRef.current = setDir(stateRef.current, side, dir)
    },
    [playing],
  )

  // Vista previa con el modo elegido
  useEffect(() => {
    if (phase === 'ready') {
      stateRef.current = createGame({ mode, cpuLevel, target })
      setHud({ score: stateRef.current.score, rally: 0 })
    }
  }, [phase, mode, cpuLevel, target])

  // Bucle de juego
  useEffect(() => {
    if (phase !== 'playing') return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(now - last, 60)
      last = now
      commit(update(stateRef.current, dt))
      if (stateRef.current.status === 'playing') raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase, commit])

  // Pausa automática al salir de la app
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

  return { stateRef, fxQueue, phase, hud, start, pause, resume, toReady, endGame, moveBy, steer }
}
