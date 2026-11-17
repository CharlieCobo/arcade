import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { Board } from './components/Board'
import { Overlay } from './components/Overlay'
import { FIELD_W, POWER_COLORS, levelDef, type Difficulty, type GameEvent } from './logic'
import { useBrickBashScores } from './scores'
import { useBrickBash } from './useBrickBash'
import styles from './BrickBash.module.css'

const TAP_MS = 250
const TAP_PX = 8
/** Sensibilidad del arrastre: >1 = la pala recorre más que el dedo */
const DRAG_GAIN = 1.25

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

export default function BrickBash() {
  const { t } = useTranslation('brick-bash')
  const [stored, setDifficulty] = useLocalStorage<Difficulty>('brick-bash:difficulty', 'normal')
  const difficulty = DIFFICULTIES.includes(stored) ? stored : 'normal'
  const { best, submit } = useBrickBashScores(difficulty)
  const [isRecord, setIsRecord] = useState(false)
  const [bonus, setBonus] = useState(0)
  const boardRef = useRef<HTMLDivElement>(null)

  const onEvents = (events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'brick' && e.destroyed) vibrate(5)
      else if (e.type === 'power') vibrate([20, 30, 20])
      else if (e.type === 'lost') {
        vibrate([80, 40, 80])
        // Pequeño temblor del tablero al perder la bola (sin volver a montar el canvas)
        boardRef.current?.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
          { duration: 320, easing: 'ease-out' },
        )
      } else if (e.type === 'cleared') {
        setBonus(e.bonus)
        vibrate([30, 40, 30, 40, 80])
      }
    }
  }

  const game = useBrickBash(difficulty, {
    onEvents,
    onEnd: (state) => {
      const result = submit(state.score)
      setIsRecord(result.isRecord)
      vibrate(result.isRecord ? [40, 60, 40, 60, 120] : [90, 50, 90])
    },
  })
  const { phase, hud, start, pause, resume, toReady, endGame, continueNext, moveBy, steer, fire } = game

  const play = () => {
    setIsRecord(false)
    setBonus(0)
    start()
  }

  // Arrastre relativo (en el tablero o en la barra de control): el dedo no tapa la pala
  const drag = useRef<{ x: number; startX: number; startY: number; t: number; moved: boolean } | null>(null)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'playing') return
    drag.current = { x: e.clientX, startX: e.clientX, startY: e.clientY, t: performance.now(), moved: false }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // sin captura también funciona
    }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const width = e.currentTarget.clientWidth || 1
    const dx = ((e.clientX - d.x) * FIELD_W * DRAG_GAIN) / width
    d.x = e.clientX
    if (Math.abs(e.clientX - d.startX) > TAP_PX) d.moved = true
    moveBy(dx)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const still = !d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < TAP_PX
    if (still && performance.now() - d.t < TAP_MS) fire()
  }
  const controlHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => (drag.current = null),
  }

  // Teclado (ordenador)
  const keys = useRef({ left: false, right: false })
  useEffect(() => {
    const syncDir = () => steer(keys.current.left === keys.current.right ? 0 : keys.current.left ? -1 : 1)
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k === 'ArrowLeft' || k === 'a') keys.current.left = true
      else if (k === 'ArrowRight' || k === 'd') keys.current.right = true
      else if (k === ' ' || k === 'ArrowUp' || k === 'w') {
        if (phase !== 'playing') return
        e.preventDefault()
        fire()
        return
      } else if (k === 'Escape' || k === 'p') {
        if (phase === 'playing') pause()
        else if (phase === 'paused') resume()
        return
      } else return
      e.preventDefault()
      syncDir()
    }
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k === 'ArrowLeft' || k === 'a') keys.current.left = false
      else if (k === 'ArrowRight' || k === 'd') keys.current.right = false
      else return
      syncDir()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  })

  const hearts = Math.min(hud.lives, 5)
  const levelName = t(`levels.${levelDef(hud.level).key}` as 'levels.warmup')

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('hud.score')}</span>
          <span className={styles.statValue}>{hud.score}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel} title={levelName}>
            {t('hud.level')}
          </span>
          <span key={hud.level} className={`${styles.statValue} ${styles.pulse}`}>
            {hud.level}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('hud.lives')}</span>
          <span className={styles.hearts} aria-label={`${hud.lives}`}>
            {Array.from({ length: hearts }, (_, i) => (
              <span key={i} className={styles.heart} />
            ))}
            {hud.lives > 5 && <span className={styles.more}>+{hud.lives - 5}</span>}
          </span>
        </div>
      </div>

      <div ref={boardRef} className={styles.boardWrap} {...controlHandlers}>
        <Board stateRef={game.stateRef} fxQueue={game.fxQueue} phase={phase} comboLabel={(n) => t('combo', { n })}>
          {phase === 'playing' && (hud.mode !== 'none' || hud.slow) && (
            <div className={styles.badges}>
              {hud.mode !== 'none' && (
                <span className={styles.badge} style={{ background: POWER_COLORS[hud.mode] }}>
                  {t(`powers.${hud.mode}`)}
                </span>
              )}
              {hud.slow && (
                <span className={styles.badge} style={{ background: POWER_COLORS.slow }}>
                  {t('powers.slow')}
                </span>
              )}
            </div>
          )}
          {phase === 'playing' && hud.stuck && hud.mode !== 'catch' && (
            <div className={styles.launchHint}>{t('screens.launch')}</div>
          )}
          <Overlay
            phase={phase}
            difficulty={difficulty}
            score={hud.score}
            level={hud.level}
            best={best}
            isRecord={isRecord}
            bonus={bonus}
            onDifficultyChange={setDifficulty}
            onStart={play}
            onResume={resume}
            onEndGame={endGame}
            onContinue={continueNext}
            onChangeDifficulty={toReady}
          />
        </Board>
      </div>

      <div className={styles.strip} role="group" aria-label={t('control.label')}>
        <div className={styles.drag} {...controlHandlers}>
          <Chevrons dir="left" />
          <span className={styles.dragHint}>{t('control.hint')}</span>
          <Chevrons dir="right" />
        </div>
        <button
          type="button"
          className={styles.pause}
          aria-label={phase === 'playing' ? t('control.pause') : t('screens.resume')}
          onClick={() => (phase === 'playing' ? pause() : phase === 'paused' ? resume() : undefined)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            {phase === 'playing' ? (
              <>
                <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
              </>
            ) : (
              <path d="M8 5 L19 12 L8 19 Z" fill="currentColor" />
            )}
          </svg>
        </button>
      </div>
    </div>
  )
}

function Chevrons({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg className={styles.dragArrows} viewBox="0 0 28 16" width="28" height="16" aria-hidden="true" style={{ transform: dir === 'right' ? 'scaleX(-1)' : undefined }}>
      <path d="M10 2 L4 8 L10 14 M18 2 L12 8 L18 14 M26 2 L20 8 L26 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
