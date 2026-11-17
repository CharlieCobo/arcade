import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FIELD_W,
  action,
  createGame,
  nextLevel,
  setDir,
  setTarget,
  update,
  type BrickBashState,
  type Difficulty,
  type GameEvent,
  type PaddleMode,
} from './logic'

export type Phase = 'ready' | 'playing' | 'paused' | 'cleared' | 'over'

export interface Hud {
  score: number
  level: number
  lives: number
  mode: PaddleMode
  slow: boolean
  stuck: boolean
}

interface Callbacks {
  onEvents?: (events: GameEvent[]) => void
  onEnd: (state: BrickBashState) => void
}

const hudOf = (s: BrickBashState): Hud => ({
  score: s.score,
  level: s.level,
  lives: s.lives,
  mode: s.mode,
  slow: s.slowMs > 0,
  stuck: s.balls.some((b) => b.stuck !== null),
})

const sameHud = (a: Hud, b: Hud) =>
  a.score === b.score && a.level === b.level && a.lives === b.lives && a.mode === b.mode && a.slow === b.slow && a.stuck === b.stuck

/**
 * Bucle de juego. El estado vive en un ref (lo lee el canvas cada frame);
 * a React solo llega el HUD y la fase. Los eventos se encolan en `fxQueue`
 * para que el tablero dibuje partículas y textos.
 */
export function useBrickBash(difficulty: Difficulty, callbacks: Callbacks) {
  const [initial] = useState(() => createGame(difficulty))
  const stateRef = useRef<BrickBashState>(initial)
  const fxQueue = useRef<GameEvent[]>([])
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState<Hud>(() => hudOf(initial))

  const cbRef = useRef(callbacks)
  useEffect(() => {
    cbRef.current = callbacks
  })

  const commit = useCallback((next: BrickBashState) => {
    const prev = stateRef.current
    if (next === prev) return
    stateRef.current = next
    if (next.events.length) {
      fxQueue.current.push(...next.events)
      cbRef.current.onEvents?.(next.events)
    }
    setHud((h) => {
      const n = hudOf(next)
      return sameHud(h, n) ? h : n
    })
    if (next.status !== prev.status) {
      if (next.status === 'cleared') setPhase('cleared')
      if (next.status === 'over') {
        setPhase('over')
        cbRef.current.onEnd(next)
      }
    }
  }, [])

  const playing = phase === 'playing'

  const start = useCallback(() => {
    stateRef.current = createGame(difficulty)
    fxQueue.current = []
    setHud(hudOf(stateRef.current))
    setPhase('playing')
  }, [difficulty])

  const pause = useCallback(() => setPhase((p) => (p === 'playing' ? 'paused' : p)), [])
  const resume = useCallback(() => setPhase((p) => (p === 'paused' ? 'playing' : p)), [])
  const toReady = useCallback(() => setPhase('ready'), [])
  const endGame = useCallback(() => commit({ ...stateRef.current, status: 'over', events: [] }), [commit])

  const continueNext = useCallback(() => {
    stateRef.current = nextLevel(stateRef.current)
    setHud(hudOf(stateRef.current))
    setPhase('playing')
  }, [])

  /** Mueve la pala una distancia relativa (en unidades del campo). */
  const moveBy = useCallback(
    (dx: number) => {
      if (!playing) return
      const s = stateRef.current
      const from = s.input.target ?? s.paddle.x
      stateRef.current = setTarget(s, Math.min(FIELD_W, Math.max(0, from + dx)))
    },
    [playing],
  )

  const steer = useCallback(
    (dir: -1 | 0 | 1) => {
      if (playing) stateRef.current = setDir(stateRef.current, dir)
    },
    [playing],
  )

  const fire = useCallback(() => {
    if (playing) commit(action(stateRef.current))
  }, [playing, commit])

  // Vista previa del primer nivel con la dificultad elegida
  useEffect(() => {
    if (phase === 'ready') {
      stateRef.current = createGame(difficulty)
      setHud(hudOf(stateRef.current))
    }
  }, [phase, difficulty])

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

  return { stateRef, fxQueue, phase, hud, start, pause, resume, toReady, endGame, continueNext, moveBy, steer, fire }
}
