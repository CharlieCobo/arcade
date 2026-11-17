import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { Overlay } from './components/Overlay'
import { Table } from './components/Table'
import { FIELD_W, TARGETS, type CpuLevel, type GameEvent, type Mode, type Side } from './logic'
import { useTableTennisScores } from './scores'
import { useTableTennis } from './useTableTennis'
import styles from './TableTennis.module.css'

/** Sensibilidad del arrastre: >1 = la pala recorre más que el dedo */
const DRAG_GAIN = 1.3
const LEVELS: CpuLevel[] = ['easy', 'normal', 'hard']

export default function TableTennis() {
  const { t } = useTranslation('table-tennis')
  const [storedMode, setMode] = useLocalStorage<Mode>('table-tennis:mode', 'cpu')
  const [storedLevel, setLevel] = useLocalStorage<CpuLevel>('table-tennis:level', 'normal')
  const [storedTarget, setTarget] = useLocalStorage<number>('table-tennis:target', 7)
  const mode: Mode = storedMode === 'pvp' ? 'pvp' : 'cpu'
  const cpuLevel = LEVELS.includes(storedLevel) ? storedLevel : 'normal'
  const target = (TARGETS as readonly number[]).includes(storedTarget) ? storedTarget : 7

  const { bestRally: recordRally, submit } = useTableTennisScores()
  const [result, setResult] = useState<{ winner: Side; bestRally: number; isRecord: boolean } | null>(null)

  const onEvents = (events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'hit') vibrate(e.rally % 10 === 0 ? [15, 30, 15] : 8)
      else if (e.type === 'point') vibrate([40, 30, 40])
    }
  }

  const game = useTableTennis(
    { mode, cpuLevel, target },
    {
      onEvents,
      onEnd: (s) => {
        const winner = s.winner ?? 'bottom'
        const isRecord = submit({ mode, cpuLevel, winner, bestRally: s.bestRally })
        setResult({ winner, bestRally: s.bestRally, isRecord })
        vibrate(winner === 'bottom' || mode === 'pvp' ? [40, 60, 40, 60, 120] : [90, 50, 90])
      },
    },
  )
  const { phase, hud, start, pause, resume, toReady, endGame, moveBy, steer } = game

  const play = () => {
    setResult(null)
    start()
  }

  // Multitáctil: cada dedo controla la pala de la mitad donde empezó.
  // Contra la CPU, cualquier dedo mueve tu pala (la de abajo).
  const fingers = useRef(new Map<number, { side: Side; x: number }>())
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'playing') return
    const rect = e.currentTarget.getBoundingClientRect()
    const side: Side = mode === 'pvp' && e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom'
    fingers.current.set(e.pointerId, { side, x: e.clientX })
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // sin captura también funciona
    }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const f = fingers.current.get(e.pointerId)
    if (!f) return
    const width = e.currentTarget.clientWidth || 1
    moveBy(f.side, ((e.clientX - f.x) * FIELD_W * DRAG_GAIN) / width)
    f.x = e.clientX
  }
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    fingers.current.delete(e.pointerId)
  }

  // Teclado: tú con ←/→; en 2 jugadores, el de arriba con A/D
  const keys = useRef<Record<Side, { l: boolean; r: boolean }>>({ bottom: { l: false, r: false }, top: { l: false, r: false } })
  useEffect(() => {
    const map = (k: string): [Side, 'l' | 'r'] | null => {
      if (k === 'ArrowLeft') return ['bottom', 'l']
      if (k === 'ArrowRight') return ['bottom', 'r']
      if (k === 'a') return [mode === 'pvp' ? 'top' : 'bottom', 'l']
      if (k === 'd') return [mode === 'pvp' ? 'top' : 'bottom', 'r']
      return null
    }
    const sync = (side: Side) => {
      const k = keys.current[side]
      steer(side, k.l === k.r ? 0 : k.l ? -1 : 1)
    }
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (down && (k === 'Escape' || k === 'p')) {
        if (phase === 'playing') pause()
        else if (phase === 'paused') resume()
        return
      }
      const m = map(k)
      if (!m) return
      e.preventDefault()
      keys.current[m[0]][m[1]] = down
      sync(m[0])
    }
    const onDown = onKey(true)
    const onUp = onKey(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  })

  return (
    <div className={styles.game}>
      <div
        className={styles.tableWrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <Table stateRef={game.stateRef} fxQueue={game.fxQueue} phase={phase} flipTop={mode === 'pvp'}>
          {phase === 'playing' && (
            <>
              <button
                type="button"
                className={styles.pause}
                aria-label={t('hud.pause')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={pause}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
                </svg>
              </button>
              {hud.rally >= 2 && (
                <div key={hud.rally} className={`${styles.rally} ${hud.rally % 10 === 0 ? styles.rallyBig : ''}`}>
                  {t('hud.rally', { n: hud.rally })}
                </div>
              )}
            </>
          )}
          <Overlay
            phase={phase}
            mode={mode}
            cpuLevel={cpuLevel}
            target={target}
            score={hud.score}
            winner={result?.winner ?? null}
            bestRally={result?.bestRally ?? 0}
            recordRally={recordRally}
            isRecord={result?.isRecord ?? false}
            onModeChange={setMode}
            onLevelChange={setLevel}
            onTargetChange={setTarget}
            onStart={play}
            onResume={resume}
            onEndGame={endGame}
            onChangeMode={toReady}
          />
        </Table>
      </div>
    </div>
  )
}
