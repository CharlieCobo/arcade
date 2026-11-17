import { useCallback, useEffect, useRef, useState } from 'react'
import { createGame, update, type BlocksState, type PieceType } from './logic'

export type Phase = 'ready' | 'playing' | 'paused' | 'over'

export interface Hud {
  score: number
  lines: number
  level: number
  next: readonly PieceType[]
}

export interface GameEvents {
  /** Se fija una pieza (con las líneas que ha limpiado) */
  onLock?: (cleared: number) => void
  onLevelUp?: (level: number) => void
  /** Fin de partida (perder o terminarla desde la pausa) */
  onEnd: (state: BlocksState) => void
}

const hudOf = (s: BlocksState): Hud => ({ score: s.score, lines: s.lines, level: s.level, next: s.queue })

/**
 * Bucle del juego sobre requestAnimationFrame. El estado vive en un ref
 * (lo lee el canvas cada frame) y a React solo llega lo que cambia el HUD.
 *
 * El nivel inicial solo se aplica al empezar: durante la partida no se puede cambiar.
 */
export function useBlocksGame(startLevel: number, events: GameEvents) {
  const [initial] = useState(() => createGame(startLevel))
  const stateRef = useRef<BlocksState>(initial)
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState<Hud>(() => hudOf(initial))

  const eventsRef = useRef(events)
  useEffect(() => {
    eventsRef.current = events
  })

  /** Aplica un nuevo estado y avisa de lo que haya cambiado. */
  const commit = useCallback((next: BlocksState) => {
    const prev = stateRef.current
    if (next === prev) return
    stateRef.current = next
    if (next.pieces !== prev.pieces) eventsRef.current.onLock?.(next.lastClear)
    if (next.level > prev.level) eventsRef.current.onLevelUp?.(next.level)
    if (next.score !== prev.score || next.lines !== prev.lines || next.level !== prev.level || next.queue !== prev.queue) {
      setHud(hudOf(next))
    }
    if (next.status === 'over' && prev.status !== 'over') {
      setPhase('over')
      eventsRef.current.onEnd(next)
    }
  }, [])

  /** Acción del jugador (mover, girar, soltar...). Solo mientras se juega. */
  const act = useCallback(
    (fn: (s: BlocksState) => BlocksState) => {
      if (phase === 'playing') commit(fn(stateRef.current))
    },
    [phase, commit],
  )

  const start = useCallback(() => {
    stateRef.current = createGame(startLevel)
    setHud(hudOf(stateRef.current))
    setPhase('playing')
  }, [startLevel])

  const pause = useCallback(() => setPhase((p) => (p === 'playing' ? 'paused' : p)), [])
  const resume = useCallback(() => setPhase((p) => (p === 'paused' ? 'playing' : p)), [])
  const toReady = useCallback(() => setPhase('ready'), [])

  /** Terminar desde la pausa: cuenta como fin de partida (se guarda la puntuación). */
  const endGame = useCallback(() => {
    commit({ ...stateRef.current, status: 'over', active: null })
  }, [commit])

  // Vista previa vacía con el nivel elegido mientras no se juega
  useEffect(() => {
    if (phase === 'ready') {
      stateRef.current = createGame(startLevel)
      setHud(hudOf(stateRef.current))
    }
  }, [phase, startLevel])

  // Bucle de juego
  useEffect(() => {
    if (phase !== 'playing') return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(now - last, 100) // tras congelarse la pestaña, sin saltos enormes
      last = now
      commit(update(stateRef.current, dt))
      if (stateRef.current.status === 'playing') raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase, commit])

  // Pausa automática al cambiar de app o bloquear el móvil
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

  return { stateRef, phase, hud, act, start, pause, resume, toReady, endGame }
}
