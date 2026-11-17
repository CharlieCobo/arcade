import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playError, playPad, unlockAudio } from './audio'
import {
  createGame,
  finishShowing,
  press,
  stepDuration,
  stepGap,
  type Difficulty,
  type Mode,
  type Pad,
  type PressResult,
  type LightState,
} from './logic'

export type Phase = 'ready' | 'playing' | 'over'
export type Message = 'watch' | 'yourTurn' | 'wrong' | 'great' | 'milestone' | null

const FIRST_DELAY = 700
const AFTER_ROUND_DELAY = 750
const AFTER_WRONG_DELAY = 1100
const PRESS_LIGHT_MS = 230
export const MILESTONE_EVERY = 5

interface Options {
  mode: Mode
  difficulty: Difficulty
  sound: boolean
  onPress?: (result: PressResult) => void
  onEnd: (state: LightState) => void
}

/**
 * Turnos del juego: enseña la secuencia con luces y sonido (temporizadores)
 * y luego espera a que el jugador la repita.
 */
export function useFollowTheLight({ mode, difficulty, sound, onPress, onEnd }: Options) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [game, setGame] = useState<LightState>(() => createGame({ mode, difficulty }))
  const [lit, setLit] = useState<Pad | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const timers = useRef<number[]>([])
  const delayRef = useRef(FIRST_DELAY)

  const live = useRef({ sound, onPress, onEnd })
  useEffect(() => {
    live.current = { sound, onPress, onEnd }
  })

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  useEffect(() => clearTimers, [])

  const flash = (pad: Pad, ms: number) => {
    setLit(pad)
    if (live.current.sound) playPad(pad, ms)
    later(() => setLit((p) => (p === pad ? null : p)), ms)
  }

  // El juego enseña la secuencia
  useEffect(() => {
    if (phase !== 'playing' || game.status !== 'showing') return
    clearTimers()
    // Apaga la luz de la última pulsación del jugador antes de que el juego enseñe la
    // nueva secuencia (si no, un primer paso del mismo color no se distinguiría)
    later(() => setLit(null), PRESS_LIGHT_MS)
    const n = game.sequence.length
    const dur = stepDuration(n)
    const gap = stepGap(n)
    let t = delayRef.current
    later(() => setMessage('watch'), Math.max(0, t - 450))
    game.sequence.forEach((pad) => {
      later(() => flash(pad, dur), t)
      t += dur + gap
    })
    later(() => {
      setGame((g) => finishShowing(g))
      setMessage('yourTurn')
    }, t)
    return clearTimers
    // flash usa refs y setState estables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game.status, game.sequence])

  const start = useCallback(() => {
    unlockAudio()
    clearTimers()
    delayRef.current = FIRST_DELAY
    setLit(null)
    setMessage(null)
    setGame(createGame({ mode, difficulty }))
    setPhase('playing')
  }, [mode, difficulty])

  const toReady = useCallback(() => {
    clearTimers()
    setLit(null)
    setMessage(null)
    setPhase('ready')
  }, [])

  // Vista previa con el modo elegido (vidas correctas antes de empezar)
  const preview = useMemo(() => createGame({ mode, difficulty }), [mode, difficulty])

  const pressPad = (pad: Pad) => {
    if (phase !== 'playing' || game.status !== 'input') return
    const { state, result } = press(game, pad)
    live.current.onPress?.(result)

    if (result === 'wrong' || result === 'gameOver') {
      setLit(pad)
      later(() => setLit(null), 350)
      if (live.current.sound) playError()
      setMessage('wrong')
      delayRef.current = AFTER_WRONG_DELAY
    } else {
      flash(pad, PRESS_LIGHT_MS)
      if (result === 'roundComplete') {
        const rounds = state.sequence.length - 1
        setMessage(rounds % MILESTONE_EVERY === 0 ? 'milestone' : 'great')
        delayRef.current = AFTER_ROUND_DELAY
      }
    }

    setGame(state)
    if (result === 'gameOver') {
      later(() => {
        setPhase('over')
        live.current.onEnd(state)
      }, 700)
    }
  }

  return { phase, game: phase === 'ready' ? preview : game, lit, message, start, toReady, pressPad }
}
